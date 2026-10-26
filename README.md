# WAV Invest — website

B2B site for EPAL Euro pallets and pallet collars. Next.js 16, 5 languages (EN, DE, PL, CS, SK).

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

## Where things live

| What | File |
|------|------|
| All texts (one file per language) | `src/i18n/dictionaries/*.json` |
| Video, photos, company contact details | `src/lib/media.ts` |
| Colours, fonts, spacing | `src/app/globals.css` (tokens at the top) |
| Homepage sections | `src/app/[lang]/page.tsx` |
| Language auto-detection | `src/proxy.ts` |

## Replacing placeholder media

Put your files in `public/media/` (e.g. `hero.mp4`, `hero.jpg`, `epal.jpg`) and update the paths in
`src/lib/media.ts`. Keep the hero video short (10–20 s), silent, 1920×1080, ideally under 5 MB.

## Quote form

Requests are saved in Supabase (EU, Frankfurt) and appear in the admin under **Dopyty**. Each request
links to an existing customer (same email or company name) or creates a new one tagged *Neaktívny*.

Email notification to `info@wavinvest.eu` is optional: create a free [Resend](https://resend.com)
account, verify the domain (a few DNS records), then set `RESEND_API_KEY` (and optionally
`RESEND_FROM`, `QUOTE_NOTIFY_EMAIL`). Without it, requests are still stored in the admin.

## Admin (`/admin`)

Slovak-language back office, login only (no sign-up). See `supabase/README.md` for adding the second
account.

- **Prehľad** – monthly / yearly revenue from running contracts of active customers (excl. VAT and
  transport), volumes, this week's deliveries, latest requests.
- **Zákazníci** – map of all customers, expandable list, detail with address + map, several contact
  persons and contracts (monthly quantity, agreed price, delivery days).
- **Dopyty** – requests from the website with a price calculator (price list + volume discounts) and
  a ready reply email in the customer's language, opened in your own mail app.
- **Nastavenia** – price list, VAT, volume discounts, password change.

Maps use OpenStreetMap (free, no key); addresses are geocoded when a customer is saved, and road
distances from the warehouses (Rzeszów, Andrychów — editable in settings) come from the free OSRM
service. Edit forms are locked until you click **Upraviť**.

## Spam protection

The quote form and the admin login use [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
(free). Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. On top of that the form has a
hidden honeypot field, requests need `QUOTE_FORM_SECRET`, and the database accepts at most 5 requests
per email and 60 in total per hour.

## Language detection

A visitor's language is chosen in this order: their earlier choice in the language switcher → their
country (needs a host that sends a country header — Vercel and Cloudflare do) → browser language →
English. AT/CH/DE → German, PL → Polish, CZ → Czech, SK → Slovak.

## Cookies

The banner stores the visitor's choice in `wav_consent`. Analytics only loads after consent — set
`NEXT_PUBLIC_GA_ID` to enable Google Analytics 4.

## SEO

Per-language titles/descriptions, canonical + hreflang links, `sitemap.xml`, `robots.txt`, Open Graph
and JSON-LD (Organization, Product, FAQ). Set `NEXT_PUBLIC_SITE_URL` to your real domain.

## Deploy

Easiest: push to GitHub and import the repo on [Vercel](https://vercel.com) (free tier). Add the env
variables from `.env.example` in the project settings.
