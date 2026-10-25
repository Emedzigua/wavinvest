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

## Quote form (free)

The form sends emails through [Web3Forms](https://web3forms.com) — free up to 250 submissions/month,
no server or database needed. Enter the email that should receive requests on their site, copy the
access key into `NEXT_PUBLIC_WEB3FORMS_KEY` in `.env.local` (and in your hosting settings).

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
