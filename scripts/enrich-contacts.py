"""Reads each prospect's own website for phone numbers, emails and signs that they ship on pallets.

Only public pages are read: the homepage plus up to four contact / about / imprint pages,
respecting robots.txt, a few seconds per site. Phones and emails already in the admin are
never overwritten; what the site lists is kept alongside (web_phones, web_emails).

Usage:
  ENRICH_TOKEN=... python3 scripts/enrich-contacts.py PL [--limit 50] [--dry]
Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and the temporary
enrich_list / enrich_save functions (see scripts/README-prospects.md).
"""
import html, json, os, re, socket, ssl, sys, time, urllib.parse, urllib.request, urllib.robotparser
import faulthandler, signal

faulthandler.register(signal.SIGUSR1)  # kill -USR1 <pid> prints where each worker is
from concurrent.futures import ThreadPoolExecutor, as_completed

UA = "Mozilla/5.0 (compatible; WAV-Invest-contact-finder/1.0)"
socket.setdefaulttimeout(15)
INSECURE = ssl._create_unverified_context()  # many small company sites have expired certificates


class Redirects(urllib.request.HTTPRedirectHandler):
    """Also follow 307/308, which older Python versions treat as errors."""

    def http_error_308(self, req, fp, code, msg, headers):
        return self.http_error_302(req, fp, code, msg, headers)

    http_error_307 = http_error_308


urllib.request.install_opener(urllib.request.build_opener(Redirects))

# Calling code and national number length per country
PHONE = {"PL": ("48", (9,)), "CZ": ("420", (9,)), "SK": ("421", (9,)), "HU": ("36", (8, 9)),
         "AT": ("43", tuple(range(7, 14))), "DE": ("49", tuple(range(7, 12))), "LT": ("370", (8,)), "LV": ("371", (8,))}

CONTACT_LINK = re.compile(
    r"kontakt|contact|impressum|imprint|o-nas|o_nas|onas|o-firmie|ofirmie|about|firma|zesp[oó]l|team|"
    r"dane-firmy|lokalizacj|o-spolecnosti|o-spolocnosti|rolunk|kapcsolat|apie-mus|par-mums|kontakti", re.I)
SKIP_LINK = re.compile(r"\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4)(\?|$)|facebook|instagram|linkedin|youtube|twitter|google|mailto:|tel:|javascript:", re.I)

EMAIL = re.compile(r"[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9.-]+\.[a-z]{2,12}", re.I)
FREE_MAIL = {"gmail.com", "wp.pl", "o2.pl", "onet.pl", "onet.eu", "interia.pl", "interia.eu", "op.pl", "poczta.fm",
             "tlen.pl", "gazeta.pl", "seznam.cz", "centrum.cz", "azet.sk", "zoznam.sk", "post.sk", "gmx.de", "gmx.at",
             "web.de", "t-online.de", "freemail.hu", "outlook.com", "hotmail.com", "yahoo.com", "inbox.lv", "one.lt"}
BAD_EMAIL = re.compile(r"\.(png|jpe?g|gif|webp|svg|css|js)$|example|sentry|wixpress|domain\.|yourdomain|email\.com|"
                       r"noreply|no-reply|donotreply|@2x|godaddy|@sentry", re.I)
# Who to email first about pallets: purchasing / logistics, then sales / office, then the rest; HR and privacy last
EMAIL_RANK = [
    (re.compile(r"zakup|zaopatrz|logist|magazyn|einkauf|purchas|procure|n[aá]kup|lager|beszerz|pirkim|iepirk"), 0),
    (re.compile(r"sprzeda|handel|sales|biuro|office|info|kontakt|contact|obchod|vertrieb|zamow|order"), 1),
    (re.compile(r"rodo|iod|gdpr|privacy|praca|rekrut|kariera|career|jobs|hr@|dpo|datenschutz|bewerbung"), 3),
]
PHONE_CONTEXT_SKIP = re.compile(r"nip|regon|krs|konto|rachunek|iban|bdo|kapita|fax|ičo|dič|ust-id|ust\.|hrb|hra|swift|bic|steuer|registernummer|cégjegyzék|adószám|fn ", re.I)

# Imprint pages name who runs the company (German law requires it); used only when no contact is set
PERSON = re.compile(
    r"(Geschäftsführer(?:in)?|Geschäftsführung|Inhaber(?:in)?|Vertreten durch|Vertretungsberechtigt(?:er)?|"
    r"konateľ(?:ka)?|jednatel(?:ka)?|ügyvezető|direktorius|valdes loceklis)\s*[:\-–]?\s*"
    r"((?:(?:Herr|Frau|Dr\.|Prof\.|Dipl\.-[A-Za-zä]+\.?|Ing\.|Mag\.|Mgr\.|Bc\.)\s+)*)"
    r"([A-ZÄÖÜÁČĎÉÍĽŇÓŠŤÚÝŽŁŚŻ][a-zäöüßáčďéíľňóšťúýžłśżąęőű]+(?:-[A-ZÄÖÜÁČĎÉÍĽŇÓŠŤÚÝŽŁŚŻ][a-zäöüßáčďéíľňóšťúýžłśżąęőű]+)?(?:\s+[A-ZÄÖÜÁČĎÉÍĽŇÓŠŤÚÝŽŁŚŻ][a-zäöüßáčďéíľňóšťúýžłśżąęőű]+(?:-[A-ZÄÖÜÁČĎÉÍĽŇÓŠŤÚÝŽŁŚŻ][a-zäöüßáčďéíľňóšťúýžłśżąęőű]+)?){1,2})"
)
ROLE = {"geschäftsführ": "Geschäftsführer", "inhaber": "Inhaber", "vertret": "Geschäftsführer", "konate": "konateľ",
        "jednatel": "jednatel", "ügyvezető": "ügyvezető", "direktor": "direktorius", "valdes": "valdes loceklis"}
NOT_A_NAME = re.compile(r"GmbH|Gesellschaft|Straße|Strasse|Telefon|Amtsgericht|Handelsregister|Sitz|Firma|Der|Die|Und|Kontakt|Impressum|Email|Mail")


def find_person(text):
    for m in PERSON.finditer(text):
        words = []
        for w in m.group(3).split():
            if NOT_A_NAME.fullmatch(w) or w in ("Amtsgericht", "Registergericht", "Telefon", "Tel", "Sitz", "Handelsregister"):
                break  # the name ends where the imprint's next field starts
            words.append(w)
        if len(words) < 2 or words[0] in ("Ihre", "Ihr", "Unsere", "Unser", "Wir", "Sie", "Herr", "Frau"):
            continue
        name = " ".join(words[:2])  # first and last name; a third word is usually the next field
        role = next((v for k, v in ROLE.items() if k in m.group(1).lower()), m.group(1))
        return name[:80], role
    return None, None

# Words that show the company makes, stores or ships goods
SIGNALS = [
    ("palety", re.compile(r"palet|pallet|epal|europalet", re.I), 10),
    ("magazyn", re.compile(r"magazyn|lager|sklad|warehouse|raktár|sandėl|noliktav", re.I), 4),
    ("logistyka", re.compile(r"logisty|logistik|spedycj|spedic|distribu|dystrybuc", re.I), 4),
    ("produkcja", re.compile(r"produkcj|zakład produkcyjny|fabryk|výrob|produktion|fertigung|gyárt|gamyb|ražo", re.I), 3),
    ("wysyłka", re.compile(r"wysyłk|wysylk|dostaw|versand|expedic|szállít|export|eksport", re.I), 3),
    ("hurt", re.compile(r"hurtow|wholesale|großhandel|veľkoobchod|velkoobchod|nagyker|didmen|vairum", re.I), 3),
]


def fetch(url, limit=700_000):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*;q=0.5", "Accept-Language": "pl,en;q=0.7"})
    try:
        res = urllib.request.urlopen(req, timeout=12)
    except (ssl.SSLError, urllib.error.URLError) as e:
        if "CERTIFICATE" not in str(e).upper():
            raise
        res = urllib.request.urlopen(req, timeout=12, context=INSECURE)
    ctype = res.headers.get("Content-Type", "")
    if "html" not in ctype and "text" not in ctype and ctype:
        return res.geturl(), ""
    # Read in chunks with a deadline, so a server that trickles bytes can't hold a worker forever
    raw, started = b"", time.time()
    while len(raw) < limit and time.time() - started < 20:
        chunk = res.read(65536)
        if not chunk:
            break
        raw += chunk
    m = re.search(r"charset=([\w-]+)", ctype) or re.search(rb'charset=["\']?([\w-]+)', raw[:3000])
    enc = (m.group(1).decode() if isinstance(m.group(1), bytes) else m.group(1)) if m else "utf-8"
    try:
        return res.geturl(), raw.decode(enc, "replace")
    except LookupError:
        return res.geturl(), raw.decode("utf-8", "replace")


def visible_text(page):
    page = re.sub(r"(?is)<(script|style|noscript|svg)\b[^>]{0,2000}>.*?</\1\s*>", " ", page)
    page = re.sub(r"(?s)<[^>]{0,4000}>", " ", page)
    return re.sub(r"\s+", " ", html.unescape(page))


def host(url):
    return urllib.parse.urlsplit(url).hostname.removeprefix("www.") if urllib.parse.urlsplit(url).hostname else ""


def find_emails(page, text, site_host):
    page = page.replace("&#64;", "@").replace("%40", "@")
    text = re.sub(r"\s*[\[(]\s*(at|małpa|zavináč)\s*[\])]\s*", "@", text, flags=re.I)
    text = re.sub(r"\s*[\[(]\s*(dot|kropka|bodka|tečka)\s*[\])]\s*", ".", text, flags=re.I)
    found = []
    for e in re.findall(r'mailto:([^"\'?>\s]+)', page, re.I) + EMAIL.findall(text) + EMAIL.findall(page):
        e = urllib.parse.unquote(e).strip(".").lower()
        if not EMAIL.fullmatch(e) or BAD_EMAIL.search(e):
            continue
        domain = e.split("@")[1]
        # Keep the company's own addresses and free-mail ones small firms use; drop the web agency's
        if not (domain == site_host or domain.endswith("." + site_host) or site_host.endswith("." + domain) or domain in FREE_MAIL):
            continue
        if e not in found:
            found.append(e)

    def rank(e):
        local = e.split("@")[0]
        return next((r for rx, r in EMAIL_RANK if rx.search(local)), 2)

    return sorted(found, key=rank)


PL_MOBILE = ("45", "50", "51", "53", "57", "60", "66", "69", "72", "73", "78", "79", "88")


def group(digits, country):
    """How people write numbers there: PL mobile 600 123 456, PL landline 32 751 00 10."""
    if country == "PL" and not digits.startswith(PL_MOBILE):
        return f"{digits[:2]} {digits[2:5]} {digits[5:7]} {digits[7:]}"
    if country in ("PL", "CZ", "SK"):
        return " ".join(re.findall(r"\d{1,3}", digits))
    return digits


def find_phones(page, text, country):
    code, lengths = PHONE.get(country, PHONE["PL"])
    candidates = [(m, True) for m in re.findall(r'tel:([+\d\s().\-/]{6,25})', page, re.I)]
    for m in re.finditer(r"(?:\+|00)?[\d][\d\s().\-/]{6,20}\d", text):
        before = text[max(0, m.start() - 18):m.start()]
        if PHONE_CONTEXT_SKIP.search(before):
            continue
        candidates.append((m.group(0), False))
    counts, first = {}, {}
    for raw, is_link in candidates:
        intl = raw.strip().startswith(("+", "00"))
        digits = re.sub(r"\D", "", raw)
        if digits.startswith("00"):
            digits = digits[2:]
        if digits.startswith(code) and (intl or len(digits) - len(code) in lengths):
            digits = digits[len(code):]
        elif intl:
            continue  # another country's number
        if country == "HU":
            if not intl and not digits.startswith("06"):
                continue  # Hungarian numbers are written 06 … or +36 …
            digits = digits[2:] if not intl else digits
        elif country in ("DE", "AT"):
            if not intl and not digits.startswith("0"):
                continue  # without the area code (0351 …) it's a year, a local number or an ID
            digits = digits.lstrip("0")
        if digits in "12345678901234567890":
            continue  # placeholder 123456789
        if len(digits) not in lengths or digits[0] == "0" or len(set(digits)) < 3:
            continue
        n = f"+{code} {group(digits, country)}"
        counts[n] = counts.get(n, 0) + (3 if is_link else 1)
        first.setdefault(n, len(first))
    return sorted(counts, key=lambda n: (-counts[n], first[n]))[:5]


def robots_for(base):
    rp = urllib.robotparser.RobotFileParser()
    try:
        _, txt = fetch(urllib.parse.urljoin(base, "/robots.txt"), 200_000)
        rp.parse(txt.splitlines())
    except Exception:
        rp.parse([])
    return rp


def enrich(row, country):
    site = re.split(r"[;,\s]+", row["website"].strip())[0]  # some list two sites
    if not re.match(r"https?://", site, re.I):
        site = "https://" + site.lstrip("/")
    out = {"id": row["id"], "emails": [], "phones": [], "signals": [], "contact_url": None, "status": "ok",
           "phone": None, "email": None, "score": row["score"], "contact_name": None, "contact_role": None}
    try:
        try:
            url, page = fetch(site)
        except Exception:
            url, page = fetch(re.sub(r"^https://", "http://", site))
    except urllib.error.HTTPError as e:
        out["status"] = "blocked" if e.code in (401, 403, 429) else "unreachable"  # bot protection: leave it
        return out
    except Exception:
        out["status"] = "unreachable"
        return out
    site_host = host(url)
    rp = robots_for(url)
    if not rp.can_fetch(UA, url):
        out["status"] = "blocked"
        return out

    pages = [(url, page)]
    links = []
    # Bounded patterns: a page with thousands of unclosed tags must not stall every worker
    for href, label in re.findall(r'<a\s[^>]{0,400}?href=["\']([^"\'#<>]{1,400})["\'][^>]{0,400}>(.{0,300}?)</a>', page, re.I | re.S):
        full = urllib.parse.urljoin(url, html.unescape(href))
        if host(full) != site_host or SKIP_LINK.search(full) or full in links:
            continue
        if CONTACT_LINK.search(full) or CONTACT_LINK.search(visible_text(label)):
            links.append(full)
    links.sort(key=lambda u: 0 if re.search(r"kontakt|contact|impressum|kapcsolat", u, re.I) else 1)
    for link in links[:4]:
        if not rp.can_fetch(UA, link):
            continue
        try:
            u, p = fetch(link)
            pages.append((u, p))
            if out["contact_url"] is None and re.search(r"kontakt|contact|impressum|kapcsolat|kontakti", u, re.I):
                out["contact_url"] = u
        except Exception:
            pass
        time.sleep(0.5)

    all_text = ""
    for _, p in pages:
        t = visible_text(p)
        all_text += " " + t
        for e in find_emails(p, t, site_host):
            if e not in out["emails"]:
                out["emails"].append(e)
        for n in find_phones(p, t, country):
            if n not in out["phones"]:
                out["phones"].append(n)
    out["emails"] = find_emails(" ".join(f"mailto:{e}" for e in out["emails"]), "", site_host)[:6] if out["emails"] else []
    out["phones"] = out["phones"][:5]

    out["contact_name"], out["contact_role"] = find_person(all_text)
    bonus = 0
    for label, rx, points in SIGNALS:
        if rx.search(all_text):
            out["signals"].append(label)
            bonus += points
    bonus = min(bonus, 15)
    if not out["emails"] and not out["phones"]:
        out["status"] = "no_contacts"
    # Fill the main phone / email only where the admin has none; score gains for new ways to reach them
    out["phone"] = out["phones"][0] if out["phones"] else None
    out["email"] = out["emails"][0] if out["emails"] else None
    gain = (8 if out["phone"] and not row.get("phone") else 0) + (4 if out["email"] and not row.get("email") else 0)
    out["score"] = row["score"] + bonus + gain
    return out


def rpc(name, payload):
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/rpc/" + name
    key = os.environ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"apikey": key, "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120))


def save(token, batch):
    """Saves a batch; on failure retries in halves so one odd row can't lose the rest."""
    try:
        rpc("enrich_save", {"p_token": token, "p_rows": batch})
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        if len(batch) == 1:
            print("could not save", batch[0]["id"], e.code, detail, flush=True)
            return
        save(token, batch[: len(batch) // 2])
        save(token, batch[len(batch) // 2 :])
    except Exception as e:
        print("save failed, retrying:", e, flush=True)
        time.sleep(5)
        rpc("enrich_save", {"p_token": token, "p_rows": batch})


def main():
    args = sys.argv[1:]
    country = args[0]
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else None
    dry = "--dry" in args
    token = os.environ["ENRICH_TOKEN"]
    rows = rpc("enrich_list", {"p_token": token, "p_country": country})
    rows.sort(key=lambda r: -r["score"])  # best prospects first
    if limit:
        rows = rows[:limit]
    print(f"{len(rows)} {country} websites to read", flush=True)

    results, batch, started = [], [], time.time()
    with ThreadPoolExecutor(24) as pool:
        futures = {pool.submit(enrich, r, country): r for r in rows}
        for i, f in enumerate(as_completed(futures), 1):
            try:
                res = f.result()
            except Exception:
                res = {"id": futures[f]["id"], "emails": [], "phones": [], "signals": [], "contact_url": None,
                       "status": "error", "phone": None, "email": None, "score": futures[f]["score"]}
            results.append(res)
            batch.append(res)
            if not dry and len(batch) >= 200:
                save(token, batch)
                batch = []
            if i % 50 == 0 or i == len(rows):
                print(f"{i}/{len(rows)} in {int(time.time() - started)}s", flush=True)
    if not dry and batch:
        save(token, batch)

    from collections import Counter
    print(Counter(r["status"] for r in results))
    print("with phone", sum(1 for r in results if r["phones"]), "with email", sum(1 for r in results if r["emails"]),
          "pallet signal", sum(1 for r in results if "palety" in r["signals"]))
    if dry:
        json.dump(results, open(f"enrich-{country}-sample.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
