// Everything a caller reads: the screen in their own language, and the call script in the
// language of the country they are calling. Hungarian, Lithuanian and Latvian should get a
// native speaker's check before real calls.

export type UiLang = "sk" | "cs" | "pl" | "de" | "hu" | "en";
export type CallLang = "sk" | "cs" | "pl" | "de" | "hu" | "lt" | "lv" | "en";
export type Outcome = "no_answer" | "call_back" | "interested" | "meeting" | "not_interested" | "wrong_number";

export const uiLangLabel: Record<UiLang, string> = {
  sk: "Slovenčina",
  cs: "Čeština",
  pl: "Polski",
  de: "Deutsch",
  hu: "Magyar",
  en: "English",
};

export const callLangOf: Record<string, CallLang> = {
  PL: "pl", SK: "sk", CZ: "cs", HU: "hu", DE: "de", AT: "de", LT: "lt", LV: "lv",
};

type Ui = {
  today: (n: number) => string;
  logout: string;
  call: string;
  otherNumbers: string;
  website: string;
  about: string;
  contact: string;
  history: string;
  attempts: (n: number) => string;
  script: string;
  result: string;
  outcomes: Record<Outcome, string>;
  outcomeHints: Record<Outcome, string>;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
  pallets: string;
  supplier: string;
  consent: string;
  callBackDate: string;
  meetingDate: string;
  meetingTime: string;
  note: string;
  notePlaceholder: string;
  save: string;
  saving: string;
  skip: string;
  pickOutcome: string;
  needDate: string;
  failed: string;
  empty: string;
  emptyHint: string;
  refresh: string;
  countries: Record<string, string>;
  sectors: Record<string, string>;
  signals: Record<string, string>;
  depotKm: (km: number, depot: string) => string;
  mentions: (list: string) => string;
  noInfo: string;
};

const SECTOR_KEYS = ["food", "logistics", "wholesale", "building", "wood", "paper", "chemical", "metal", "automotive", "agri", "electronics", "textile", "pharma", "manufacturing", "other"];

export const ui: Record<UiLang, Ui> = {
  sk: {
    today: (n) => `Dnes ${n} ${n === 1 ? "hovor" : n >= 2 && n <= 4 ? "hovory" : "hovorov"}`,
    logout: "Odhlásiť",
    call: "Zavolať",
    otherNumbers: "Ďalšie čísla",
    website: "Web",
    about: "O firme",
    contact: "Kontaktná osoba",
    history: "Predchádzajúce hovory",
    attempts: (n) => `Volané už ${n}×`,
    script: "Čo povedať",
    result: "Ako hovor dopadol?",
    outcomes: {
      no_answer: "Nedvíha",
      call_back: "Zavolať neskôr",
      interested: "Má záujem",
      meeting: "Chce stretnutie",
      not_interested: "Nemá záujem",
      wrong_number: "Zlé číslo",
    },
    outcomeHints: {
      no_answer: "Firma sa vráti o 2 dni.",
      call_back: "Vyberte deň, kedy zavolať znova.",
      interested: "Zapíšte kontakt a koľko paliet berú.",
      meeting: "Zapíšte kontakt a kedy by sa chceli stretnúť.",
      not_interested: "Firma sa už nebude volať.",
      wrong_number: "Číslo nefunguje alebo patrí inej firme.",
    },
    contactName: "Meno kontaktnej osoby",
    contactRole: "Funkcia (napr. vedúci skladu)",
    contactPhone: "Priamy telefón",
    contactEmail: "E-mail",
    pallets: "Koľko paliet mesačne?",
    supplier: "Od koho ich teraz berú?",
    consent: "Súhlasia, aby sme im poslali ponuku e-mailom",
    callBackDate: "Kedy zavolať znova",
    meetingDate: "Kedy by sa chceli stretnúť",
    meetingTime: "Čas stretnutia",
    note: "Poznámka",
    notePlaceholder: "Čo povedali, čo potrebujú…",
    save: "Uložiť a ďalšia firma",
    saving: "Ukladám…",
    skip: "Preskočiť túto firmu",
    pickOutcome: "Vyberte, ako hovor dopadol.",
    needDate: "Vyberte dátum.",
    failed: "Uloženie sa nepodarilo. Skúste to znova.",
    empty: "Na dnes nie sú žiadne firmy na volanie.",
    emptyHint: "Ďalšie pribudnú, keď príde čas spätných hovorov. Skúste to neskôr.",
    refresh: "Skúsiť znova",
    countries: { PL: "Poľsko", SK: "Slovensko", CZ: "Česko", HU: "Maďarsko", AT: "Rakúsko", DE: "Nemecko", LT: "Litva", LV: "Lotyšsko" },
    sectors: { food: "Potraviny a nápoje", logistics: "Logistika a sklady", wholesale: "Veľkoobchod", building: "Stavebné materiály", wood: "Drevo a nábytok", paper: "Papier a obaly", chemical: "Chémia a plasty", metal: "Kovy a strojárstvo", automotive: "Automobilový priemysel", agri: "Poľnohospodárstvo", electronics: "Elektronika", textile: "Textil", pharma: "Farmácia a zdravotníctvo", manufacturing: "Výroba", other: "Firma" },
    signals: { palety: "palety", magazyn: "sklad", logistyka: "logistiku", produkcja: "výrobu", "wysyłka": "expedíciu", hurt: "veľkoobchod" },
    depotKm: (km, depot) => `${km} km od nášho skladu ${depot}.`,
    mentions: (list) => `Na svojom webe spomína ${list}.`,
    noInfo: "O firme nemáme ďalšie údaje. Opýtajte sa, čo vyrábajú alebo skladujú.",
  },
  cs: {
    today: (n) => `Dnes ${n} ${n === 1 ? "hovor" : n >= 2 && n <= 4 ? "hovory" : "hovorů"}`,
    logout: "Odhlásit",
    call: "Zavolat",
    otherNumbers: "Další čísla",
    website: "Web",
    about: "O firmě",
    contact: "Kontaktní osoba",
    history: "Předchozí hovory",
    attempts: (n) => `Voláno už ${n}×`,
    script: "Co říct",
    result: "Jak hovor dopadl?",
    outcomes: {
      no_answer: "Nebere to",
      call_back: "Zavolat později",
      interested: "Má zájem",
      meeting: "Chce schůzku",
      not_interested: "Nemá zájem",
      wrong_number: "Špatné číslo",
    },
    outcomeHints: {
      no_answer: "Firma se vrátí za 2 dny.",
      call_back: "Vyberte den, kdy zavolat znovu.",
      interested: "Zapište kontakt a kolik palet odebírají.",
      meeting: "Zapište kontakt a kdy by se chtěli sejít.",
      not_interested: "Firma se už nebude volat.",
      wrong_number: "Číslo nefunguje nebo patří jiné firmě.",
    },
    contactName: "Jméno kontaktní osoby",
    contactRole: "Funkce (např. vedoucí skladu)",
    contactPhone: "Přímý telefon",
    contactEmail: "E-mail",
    pallets: "Kolik palet měsíčně?",
    supplier: "Od koho je teď berou?",
    consent: "Souhlasí, abychom jim poslali nabídku e-mailem",
    callBackDate: "Kdy zavolat znovu",
    meetingDate: "Kdy by se chtěli sejít",
    meetingTime: "Čas schůzky",
    note: "Poznámka",
    notePlaceholder: "Co řekli, co potřebují…",
    save: "Uložit a další firma",
    saving: "Ukládám…",
    skip: "Přeskočit tuto firmu",
    pickOutcome: "Vyberte, jak hovor dopadl.",
    needDate: "Vyberte datum.",
    failed: "Uložení se nepodařilo. Zkuste to znovu.",
    empty: "Na dnes nejsou žádné firmy k volání.",
    emptyHint: "Další přibudou, až přijde čas zpětných hovorů. Zkuste to později.",
    refresh: "Zkusit znovu",
    countries: { PL: "Polsko", SK: "Slovensko", CZ: "Česko", HU: "Maďarsko", AT: "Rakousko", DE: "Německo", LT: "Litva", LV: "Lotyšsko" },
    sectors: { food: "Potraviny a nápoje", logistics: "Logistika a sklady", wholesale: "Velkoobchod", building: "Stavební materiály", wood: "Dřevo a nábytek", paper: "Papír a obaly", chemical: "Chemie a plasty", metal: "Kovy a strojírenství", automotive: "Automobilový průmysl", agri: "Zemědělství", electronics: "Elektronika", textile: "Textil", pharma: "Farmacie a zdravotnictví", manufacturing: "Výroba", other: "Firma" },
    signals: { palety: "palety", magazyn: "sklad", logistyka: "logistiku", produkcja: "výrobu", "wysyłka": "expedici", hurt: "velkoobchod" },
    depotKm: (km, depot) => `${km} km od našeho skladu ${depot}.`,
    mentions: (list) => `Na svém webu zmiňuje ${list}.`,
    noInfo: "O firmě nemáme další údaje. Zeptejte se, co vyrábějí nebo skladují.",
  },
  pl: {
    today: (n) => `Dziś ${n} ${n === 1 ? "rozmowa" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "rozmowy" : "rozmów"}`,
    logout: "Wyloguj",
    call: "Zadzwoń",
    otherNumbers: "Inne numery",
    website: "Strona",
    about: "O firmie",
    contact: "Osoba kontaktowa",
    history: "Poprzednie rozmowy",
    attempts: (n) => `Dzwoniono już ${n}×`,
    script: "Co powiedzieć",
    result: "Jak poszła rozmowa?",
    outcomes: {
      no_answer: "Nie odbiera",
      call_back: "Zadzwonić później",
      interested: "Jest zainteresowany",
      meeting: "Chce spotkania",
      not_interested: "Nie jest zainteresowany",
      wrong_number: "Zły numer",
    },
    outcomeHints: {
      no_answer: "Firma wróci za 2 dni.",
      call_back: "Wybierz dzień ponownego telefonu.",
      interested: "Zapisz kontakt i ile palet kupują.",
      meeting: "Zapisz kontakt i kiedy chcą się spotkać.",
      not_interested: "Do firmy nie będziemy już dzwonić.",
      wrong_number: "Numer nie działa lub należy do innej firmy.",
    },
    contactName: "Imię i nazwisko osoby kontaktowej",
    contactRole: "Stanowisko (np. kierownik magazynu)",
    contactPhone: "Telefon bezpośredni",
    contactEmail: "E-mail",
    pallets: "Ile palet miesięcznie?",
    supplier: "Od kogo kupują teraz?",
    consent: "Zgadzają się na ofertę e-mailem",
    callBackDate: "Kiedy zadzwonić ponownie",
    meetingDate: "Kiedy chcą się spotkać",
    meetingTime: "Godzina spotkania",
    note: "Notatka",
    notePlaceholder: "Co powiedzieli, czego potrzebują…",
    save: "Zapisz i następna firma",
    saving: "Zapisuję…",
    skip: "Pomiń tę firmę",
    pickOutcome: "Wybierz, jak poszła rozmowa.",
    needDate: "Wybierz datę.",
    failed: "Nie udało się zapisać. Spróbuj ponownie.",
    empty: "Na dziś nie ma firm do dzwonienia.",
    emptyHint: "Kolejne pojawią się, gdy przyjdzie czas oddzwonienia. Spróbuj później.",
    refresh: "Spróbuj ponownie",
    countries: { PL: "Polska", SK: "Słowacja", CZ: "Czechy", HU: "Węgry", AT: "Austria", DE: "Niemcy", LT: "Litwa", LV: "Łotwa" },
    sectors: { food: "Żywność i napoje", logistics: "Logistyka i magazyny", wholesale: "Hurtownia", building: "Materiały budowlane", wood: "Drewno i meble", paper: "Papier i opakowania", chemical: "Chemia i tworzywa", metal: "Metal i maszyny", automotive: "Motoryzacja", agri: "Rolnictwo", electronics: "Elektronika", textile: "Tekstylia", pharma: "Farmacja i medycyna", manufacturing: "Produkcja", other: "Firma" },
    signals: { palety: "palety", magazyn: "magazyn", logistyka: "logistykę", produkcja: "produkcję", "wysyłka": "wysyłkę", hurt: "sprzedaż hurtową" },
    depotKm: (km, depot) => `${km} km od naszego magazynu w ${depot === "Rzeszów" ? "Rzeszowie" : "Andrychowie"}.`,
    mentions: (list) => `Na swojej stronie wspomina ${list}.`,
    noInfo: "Nie mamy więcej informacji o firmie. Zapytaj, co produkują lub magazynują.",
  },
  de: {
    today: (n) => `Heute ${n} ${n === 1 ? "Anruf" : "Anrufe"}`,
    logout: "Abmelden",
    call: "Anrufen",
    otherNumbers: "Weitere Nummern",
    website: "Website",
    about: "Über die Firma",
    contact: "Ansprechpartner",
    history: "Frühere Anrufe",
    attempts: (n) => `Schon ${n}× angerufen`,
    script: "Was sagen",
    result: "Wie lief der Anruf?",
    outcomes: {
      no_answer: "Nicht erreicht",
      call_back: "Später anrufen",
      interested: "Hat Interesse",
      meeting: "Will einen Termin",
      not_interested: "Kein Interesse",
      wrong_number: "Falsche Nummer",
    },
    outcomeHints: {
      no_answer: "Die Firma kommt in 2 Tagen wieder.",
      call_back: "Wählen Sie den Tag für den nächsten Anruf.",
      interested: "Ansprechpartner und Paletten pro Monat eintragen.",
      meeting: "Ansprechpartner und Wunschtermin eintragen.",
      not_interested: "Die Firma wird nicht mehr angerufen.",
      wrong_number: "Nummer funktioniert nicht oder gehört einer anderen Firma.",
    },
    contactName: "Name des Ansprechpartners",
    contactRole: "Funktion (z. B. Lagerleiter)",
    contactPhone: "Durchwahl",
    contactEmail: "E-Mail",
    pallets: "Wie viele Paletten pro Monat?",
    supplier: "Von wem kaufen sie jetzt?",
    consent: "Einverstanden, dass wir ein Angebot per E-Mail schicken",
    callBackDate: "Wann erneut anrufen",
    meetingDate: "Wunschtermin",
    meetingTime: "Uhrzeit",
    note: "Notiz",
    notePlaceholder: "Was gesagt wurde, was gebraucht wird…",
    save: "Speichern und nächste Firma",
    saving: "Speichere…",
    skip: "Diese Firma überspringen",
    pickOutcome: "Wählen Sie, wie der Anruf lief.",
    needDate: "Bitte ein Datum wählen.",
    failed: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
    empty: "Für heute gibt es keine Firmen zum Anrufen.",
    emptyHint: "Neue kommen dazu, wenn Rückrufe fällig werden. Versuchen Sie es später.",
    refresh: "Erneut versuchen",
    countries: { PL: "Polen", SK: "Slowakei", CZ: "Tschechien", HU: "Ungarn", AT: "Österreich", DE: "Deutschland", LT: "Litauen", LV: "Lettland" },
    sectors: { food: "Lebensmittel und Getränke", logistics: "Logistik und Lager", wholesale: "Großhandel", building: "Baustoffe", wood: "Holz und Möbel", paper: "Papier und Verpackung", chemical: "Chemie und Kunststoff", metal: "Metall und Maschinenbau", automotive: "Automobil", agri: "Landwirtschaft", electronics: "Elektronik", textile: "Textil", pharma: "Pharma und Medizin", manufacturing: "Produktion", other: "Firma" },
    signals: { palety: "Paletten", magazyn: "Lager", logistyka: "Logistik", produkcja: "Produktion", "wysyłka": "Versand", hurt: "Großhandel" },
    depotKm: (km, depot) => `${km} km von unserem Lager in ${depot}.`,
    mentions: (list) => `Erwähnt auf der Website: ${list}.`,
    noInfo: "Keine weiteren Angaben. Fragen Sie, was die Firma herstellt oder lagert.",
  },
  hu: {
    today: (n) => `Ma ${n} hívás`,
    logout: "Kijelentkezés",
    call: "Hívás",
    otherNumbers: "További számok",
    website: "Weboldal",
    about: "A cégről",
    contact: "Kapcsolattartó",
    history: "Korábbi hívások",
    attempts: (n) => `Már ${n}× hívva`,
    script: "Mit mondjon",
    result: "Hogyan sikerült a hívás?",
    outcomes: {
      no_answer: "Nem veszi fel",
      call_back: "Később hívni",
      interested: "Érdeklődik",
      meeting: "Találkozót kér",
      not_interested: "Nem érdekli",
      wrong_number: "Rossz szám",
    },
    outcomeHints: {
      no_answer: "A cég 2 nap múlva visszajön.",
      call_back: "Válassza ki, mikor hívjuk újra.",
      interested: "Írja be a kapcsolattartót és a havi raklapszámot.",
      meeting: "Írja be a kapcsolattartót és az időpontot.",
      not_interested: "A céget többé nem hívjuk.",
      wrong_number: "A szám nem működik vagy más cégé.",
    },
    contactName: "Kapcsolattartó neve",
    contactRole: "Beosztás (pl. raktárvezető)",
    contactPhone: "Közvetlen telefon",
    contactEmail: "E-mail",
    pallets: "Havonta hány raklap?",
    supplier: "Kitől veszik most?",
    consent: "Hozzájárul, hogy e-mailben ajánlatot küldjünk",
    callBackDate: "Mikor hívjuk újra",
    meetingDate: "Mikor szeretnének találkozni",
    meetingTime: "Időpont (óra)",
    note: "Megjegyzés",
    notePlaceholder: "Mit mondtak, mire van szükségük…",
    save: "Mentés és következő cég",
    saving: "Mentés…",
    skip: "Cég kihagyása",
    pickOutcome: "Válassza ki, hogyan sikerült a hívás.",
    needDate: "Válasszon dátumot.",
    failed: "A mentés nem sikerült. Próbálja újra.",
    empty: "Mára nincs több hívandó cég.",
    emptyHint: "Újak jönnek, amikor esedékesek a visszahívások. Próbálja később.",
    refresh: "Újra",
    countries: { PL: "Lengyelország", SK: "Szlovákia", CZ: "Csehország", HU: "Magyarország", AT: "Ausztria", DE: "Németország", LT: "Litvánia", LV: "Lettország" },
    sectors: { food: "Élelmiszer és ital", logistics: "Logisztika és raktár", wholesale: "Nagykereskedelem", building: "Építőanyag", wood: "Fa és bútor", paper: "Papír és csomagolás", chemical: "Vegyipar és műanyag", metal: "Fém és gépipar", automotive: "Autóipar", agri: "Mezőgazdaság", electronics: "Elektronika", textile: "Textil", pharma: "Gyógyszer és egészségügy", manufacturing: "Gyártás", other: "Cég" },
    signals: { palety: "raklapok", magazyn: "raktár", logistyka: "logisztika", produkcja: "gyártás", "wysyłka": "szállítás", hurt: "nagykereskedelem" },
    depotKm: (km, depot) => `${km} km a ${depot}-i raktárunktól.`,
    mentions: (list) => `A weboldalán említi: ${list}.`,
    noInfo: "Nincs több adatunk a cégről. Kérdezze meg, mit gyártanak vagy tárolnak.",
  },
  en: {
    today: (n) => `Today ${n} ${n === 1 ? "call" : "calls"}`,
    logout: "Sign out",
    call: "Call",
    otherNumbers: "Other numbers",
    website: "Website",
    about: "About the company",
    contact: "Contact person",
    history: "Earlier calls",
    attempts: (n) => `Called ${n}× already`,
    script: "What to say",
    result: "How did the call go?",
    outcomes: {
      no_answer: "No answer",
      call_back: "Call back later",
      interested: "Interested",
      meeting: "Wants a meeting",
      not_interested: "Not interested",
      wrong_number: "Wrong number",
    },
    outcomeHints: {
      no_answer: "The company comes back in 2 days.",
      call_back: "Pick the day to call again.",
      interested: "Note the contact and pallets per month.",
      meeting: "Note the contact and when they would like to meet.",
      not_interested: "The company will not be called again.",
      wrong_number: "The number does not work or belongs to another company.",
    },
    contactName: "Contact person's name",
    contactRole: "Role (e.g. warehouse manager)",
    contactPhone: "Direct phone",
    contactEmail: "Email",
    pallets: "How many pallets per month?",
    supplier: "Who do they buy from now?",
    consent: "They agree to receive an offer by email",
    callBackDate: "When to call again",
    meetingDate: "When they would like to meet",
    meetingTime: "Meeting time",
    note: "Note",
    notePlaceholder: "What they said, what they need…",
    save: "Save and next company",
    saving: "Saving…",
    skip: "Skip this company",
    pickOutcome: "Choose how the call went.",
    needDate: "Pick a date.",
    failed: "Saving failed. Please try again.",
    empty: "No companies to call today.",
    emptyHint: "More appear when callbacks are due. Try again later.",
    refresh: "Try again",
    countries: { PL: "Poland", SK: "Slovakia", CZ: "Czechia", HU: "Hungary", AT: "Austria", DE: "Germany", LT: "Lithuania", LV: "Latvia" },
    sectors: { food: "Food and drink", logistics: "Logistics and warehousing", wholesale: "Wholesale", building: "Building materials", wood: "Wood and furniture", paper: "Paper and packaging", chemical: "Chemicals and plastics", metal: "Metal and machinery", automotive: "Automotive", agri: "Agriculture", electronics: "Electronics", textile: "Textiles", pharma: "Pharma and medical", manufacturing: "Manufacturing", other: "Company" },
    signals: { palety: "pallets", magazyn: "a warehouse", logistyka: "logistics", produkcja: "production", "wysyłka": "shipping", hurt: "wholesale" },
    depotKm: (km, depot) => `${km} km from our depot in ${depot}.`,
    mentions: (list) => `Its website mentions ${list}.`,
    noInfo: "No more details on file. Ask what they make or store.",
  },
};

export const DEPOT_NAME: Record<string, string> = { rzeszow: "Rzeszów", andrychow: "Andrychów" };

export type CallCompany = {
  id: string;
  name: string;
  country: string;
  sector: string;
  street: string | null;
  city: string | null;
  distance_km: number | null;
  nearest_depot: string | null;
  phone: string | null;
  web_phones: string[] | null;
  website: string | null;
  email: string | null;
  web_emails: string[] | null;
  web_signals: string[] | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  pallets_per_month: number | null;
  current_supplier: string | null;
  status: string;
  call_attempts: number;
  history: { at: string; outcome: string | null; note: string | null }[];
};

// The short "about the company" text, written from what we know, in the caller's language
export function describe(c: CallCompany, lang: UiLang): string[] {
  const t = ui[lang];
  const lines: string[] = [];
  const place = [c.city, t.countries[c.country]].filter(Boolean).join(", ");
  lines.push(`${t.sectors[SECTOR_KEYS.includes(c.sector) ? c.sector : "other"]}${place ? ` · ${place}` : ""}.`);
  if (c.distance_km != null && c.nearest_depot) lines.push(t.depotKm(c.distance_km, DEPOT_NAME[c.nearest_depot] ?? c.nearest_depot));
  const signals = (c.web_signals ?? []).map((s) => t.signals[s]).filter(Boolean);
  if (signals.length) lines.push(t.mentions(signals.join(", ")));
  else if (lines.length < 3) lines.push(t.noInfo);
  return lines;
}

/* ───────────── Call scripts, in the language of the country being called ───────────── */

export type Script = {
  steps: { title: string; lines: string[] }[];
  facts: { title: string; lines: string[] };
};

export const scripts: Record<CallLang, Script> = {
  sk: {
    steps: [
      { title: "1. Pozdrav", lines: ["Dobrý deň, volám sa {caller}, volám z firmy WAV Invest. Dodávame nové europalety EPAL a paletové nadstavce.", "Kto u vás má na starosti nákup paliet alebo sklad? Mohli by ste ma s ním spojiť?"] },
      { title: "2. So správnou osobou", lines: ["Používate vo firme palety? Približne koľko mesačne?", "Od koho ich teraz beriete? Ste s nimi spokojní?"] },
      { title: "3. Ak majú záujem", lines: ["Môžem vám poslať cenovú ponuku e-mailom? Na akú adresu?", "Ďakujem, ponuku dostanete do 24 hodín. Ak chcete, príde sa k vám pozrieť aj náš kolega."] },
      { title: "4. Ak nemajú záujem", lines: ["Rozumiem, ďakujem za váš čas. Ak by ste niekedy palety potrebovali, radi pomôžeme. Pekný deň."] },
    ],
    facts: { title: "Ak sa pýtajú", lines: ["Nové palety EPAL 1200 × 800 mm a skladacie nadstavce, iba nový tovar.", "Sklady v Poľsku: Rzeszów a Andrychów. Dodávame do PL, SK, CZ, HU, AT a DE.", "Cenu pripravíme podľa množstva a miesta dodania, do 24 hodín.", "Web: wavinvest.vercel.app"] },
  },
  cs: {
    steps: [
      { title: "1. Pozdrav", lines: ["Dobrý den, jmenuji se {caller} a volám z firmy WAV Invest. Dodáváme nové europalety EPAL a paletové nástavce.", "Kdo u vás má na starosti nákup palet nebo sklad? Mohl(a) byste mě s ním spojit?"] },
      { title: "2. Se správnou osobou", lines: ["Používáte ve firmě palety? Přibližně kolik měsíčně?", "Od koho je teď berete? Jste s nimi spokojení?"] },
      { title: "3. Pokud mají zájem", lines: ["Mohu vám poslat cenovou nabídku e-mailem? Na jakou adresu?", "Děkuji, nabídku dostanete do 24 hodin. Pokud chcete, přijede se k vám podívat i náš kolega."] },
      { title: "4. Pokud nemají zájem", lines: ["Rozumím, děkuji za váš čas. Kdybyste někdy palety potřebovali, rádi pomůžeme. Hezký den."] },
    ],
    facts: { title: "Když se ptají", lines: ["Nové palety EPAL 1200 × 800 mm a skládací nástavce, pouze nové zboží.", "Sklady v Polsku: Rzeszów a Andrychów. Dodáváme do PL, SK, CZ, HU, AT a DE.", "Cenu připravíme podle množství a místa dodání, do 24 hodin.", "Web: wavinvest.vercel.app"] },
  },
  pl: {
    steps: [
      { title: "1. Powitanie", lines: ["Dzień dobry, nazywam się {caller}, dzwonię z firmy WAV Invest. Dostarczamy nowe europalety EPAL i nadstawki paletowe.", "Kto u Państwa zajmuje się zakupem palet albo magazynem? Czy mogę prosić o połączenie?"] },
      { title: "2. Z właściwą osobą", lines: ["Czy używają Państwo palet? Mniej więcej ile miesięcznie?", "Od kogo je Państwo teraz kupują? Czy są Państwo zadowoleni?"] },
      { title: "3. Jeśli są zainteresowani", lines: ["Czy mogę wysłać ofertę cenową e-mailem? Na jaki adres?", "Dziękuję, ofertę otrzymają Państwo w ciągu 24 godzin. Jeśli Państwo chcą, może też przyjechać nasz kolega."] },
      { title: "4. Jeśli nie są zainteresowani", lines: ["Rozumiem, dziękuję za poświęcony czas. Gdyby kiedyś potrzebowali Państwo palet, chętnie pomożemy. Miłego dnia."] },
    ],
    facts: { title: "Jeśli pytają", lines: ["Nowe palety EPAL 1200 × 800 mm i składane nadstawki, tylko nowy towar.", "Magazyny w Polsce: Rzeszów i Andrychów. Dostawy do PL, SK, CZ, HU, AT i DE.", "Cenę przygotujemy według ilości i miejsca dostawy, w ciągu 24 godzin.", "Strona: wavinvest.vercel.app"] },
  },
  de: {
    steps: [
      { title: "1. Begrüßung", lines: ["Guten Tag, mein Name ist {caller}, ich rufe von der Firma WAV Invest an. Wir liefern neue EPAL-Europaletten und Aufsetzrahmen.", "Wer ist bei Ihnen für den Einkauf von Paletten oder das Lager zuständig? Könnten Sie mich bitte verbinden?"] },
      { title: "2. Mit der richtigen Person", lines: ["Verwenden Sie Paletten? Ungefähr wie viele pro Monat?", "Von wem beziehen Sie sie derzeit? Sind Sie zufrieden?"] },
      { title: "3. Bei Interesse", lines: ["Darf ich Ihnen ein Angebot per E-Mail schicken? An welche Adresse?", "Vielen Dank, Sie erhalten das Angebot innerhalb von 24 Stunden. Gern kommt auch ein Kollege persönlich vorbei."] },
      { title: "4. Kein Interesse", lines: ["Verstehe, vielen Dank für Ihre Zeit. Falls Sie einmal Paletten brauchen, helfen wir gern. Einen schönen Tag noch."] },
    ],
    facts: { title: "Wenn gefragt wird", lines: ["Neue EPAL-Paletten 1200 × 800 mm und klappbare Aufsetzrahmen, nur Neuware.", "Lager in Polen: Rzeszów und Andrychów. Lieferung nach PL, SK, CZ, HU, AT und DE.", "Preis je nach Menge und Lieferort, innerhalb von 24 Stunden.", "Website: wavinvest.vercel.app"] },
  },
  hu: {
    steps: [
      { title: "1. Köszönés", lines: ["Jó napot kívánok, {caller} vagyok, a WAV Invest cégtől telefonálok. Új EPAL euroraklapokat és raklapmagasítókat szállítunk.", "Ki foglalkozik Önöknél a raklapok beszerzésével vagy a raktárral? Kapcsolná, kérem?"] },
      { title: "2. A megfelelő személlyel", lines: ["Használnak raklapokat? Nagyjából havonta mennyit?", "Kitől vásárolják most? Elégedettek velük?"] },
      { title: "3. Ha érdeklődnek", lines: ["Küldhetek árajánlatot e-mailben? Milyen címre?", "Köszönöm, az ajánlatot 24 órán belül megkapják. Ha szeretnék, kollégánk személyesen is meglátogatja Önöket."] },
      { title: "4. Ha nem érdekli őket", lines: ["Értem, köszönöm az idejét. Ha valaha raklapra lenne szükségük, szívesen segítünk. További szép napot."] },
    ],
    facts: { title: "Ha kérdeznek", lines: ["Új EPAL raklapok 1200 × 800 mm és összecsukható magasítók, csak új áru.", "Raktárak Lengyelországban: Rzeszów és Andrychów. Szállítás: PL, SK, CZ, HU, AT, DE.", "Az árat mennyiség és szállítási hely szerint adjuk meg, 24 órán belül.", "Weboldal: wavinvest.vercel.app"] },
  },
  lt: {
    steps: [
      { title: "1. Pasisveikinimas", lines: ["Laba diena, mano vardas {caller}, skambinu iš įmonės WAV Invest. Tiekiame naujus EPAL europadėklus ir padėklų antstatus.", "Kas jūsų įmonėje atsakingas už padėklų pirkimą arba sandėlį? Gal galėtumėte sujungti?"] },
      { title: "2. Su tinkamu asmeniu", lines: ["Ar naudojate padėklus? Maždaug kiek per mėnesį?", "Iš ko juos dabar perkate? Ar esate patenkinti?"] },
      { title: "3. Jei domisi", lines: ["Ar galiu atsiųsti kainų pasiūlymą el. paštu? Kokiu adresu?", "Ačiū, pasiūlymą gausite per 24 valandas."] },
      { title: "4. Jei nesidomi", lines: ["Suprantu, ačiū už jūsų laiką. Jei kada nors prireiktų padėklų, mielai padėsime. Geros dienos."] },
    ],
    facts: { title: "Jei klausia", lines: ["Nauji EPAL padėklai 1200 × 800 mm ir sulankstomi antstatai, tik nauja prekė.", "Sandėliai Lenkijoje: Žešuvas (Rzeszów) ir Andrychovas.", "Kainą pateiksime pagal kiekį ir pristatymo vietą per 24 valandas."] },
  },
  lv: {
    steps: [
      { title: "1. Sveiciens", lines: ["Labdien, mani sauc {caller}, zvanu no uzņēmuma WAV Invest. Piegādājam jaunas EPAL europaletes un palešu apmales.", "Kurš jūsu uzņēmumā atbild par palešu iepirkumu vai noliktavu? Vai varētu mani savienot?"] },
      { title: "2. Ar īsto cilvēku", lines: ["Vai izmantojat paletes? Aptuveni cik mēnesī?", "No kā tās pašlaik pērkat? Vai esat apmierināti?"] },
      { title: "3. Ja ir interese", lines: ["Vai varu nosūtīt cenu piedāvājumu e-pastā? Uz kādu adresi?", "Paldies, piedāvājumu saņemsiet 24 stundu laikā."] },
      { title: "4. Ja nav intereses", lines: ["Saprotu, paldies par jūsu laiku. Ja kādreiz vajadzēs paletes, labprāt palīdzēsim. Jauku dienu."] },
    ],
    facts: { title: "Ja jautā", lines: ["Jaunas EPAL paletes 1200 × 800 mm un saliekamas apmales, tikai jauna prece.", "Noliktavas Polijā: Žešova (Rzeszów) un Andrihova.", "Cenu sagatavosim pēc daudzuma un piegādes vietas 24 stundu laikā."] },
  },
  en: {
    steps: [
      { title: "1. Greeting", lines: ["Good day, my name is {caller}, I am calling from WAV Invest. We supply new EPAL Euro pallets and pallet collars.", "Who looks after buying pallets or the warehouse at your company? Could you put me through?"] },
      { title: "2. With the right person", lines: ["Do you use pallets? Roughly how many a month?", "Who do you buy them from at the moment? Are you happy with them?"] },
      { title: "3. If interested", lines: ["May I send you a price offer by email? To which address?", "Thank you, you will have the offer within 24 hours."] },
      { title: "4. If not interested", lines: ["I understand, thank you for your time. If you ever need pallets, we are happy to help. Have a nice day."] },
    ],
    facts: { title: "If they ask", lines: ["New EPAL pallets 1200 × 800 mm and foldable collars, new goods only.", "Depots in Poland: Rzeszów and Andrychów. Delivery to PL, SK, CZ, HU, AT and DE.", "Price depends on quantity and delivery place, within 24 hours."] },
  },
};
