import { company } from "@/lib/media";
import type { Calculation } from "./pricing";
import type { Product } from "./types";

type Copy = {
  locale: string;
  subject: string;
  greeting: (name: string) => string;
  intro: (location: string) => string;
  products: Record<Product, string>;
  pcs: string;
  subtotal: string;
  discount: (pct: number) => string;
  net: string;
  vat: (rate: number) => string;
  gross: string;
  transport: (place: string) => string;
  missing: string;
  outro: string;
  regards: string;
};

const copy: Record<string, Copy> = {
  sk: {
    locale: "sk-SK",
    subject: "Cenová ponuka – WAV Invest",
    greeting: (n) => `Dobrý deň ${n},`,
    intro: (l) => `ďakujeme za Váš dopyt. Na základe Vašej požiadavky (dodanie: ${l}) Vám posielame cenovú ponuku:`,
    products: { epal: "Nové EPAL palety 1200 × 800", collars: "Nové paletové nadstavce" },
    pcs: "ks",
    subtotal: "Tovar spolu",
    discount: (p) => `Množstevná zľava ${p} %`,
    net: "Cena bez DPH",
    vat: (r) => `DPH ${r} %`,
    gross: "Cena s DPH",
    transport: (p) => `Doprava (${p})`,
    missing: "[DOPLNIŤ CENU DOPRAVY]",
    outro: "V prípade otázok nás neváhajte kontaktovať.",
    regards: "S pozdravom",
  },
  cz: {
    locale: "cs-CZ",
    subject: "Cenová nabídka – WAV Invest",
    greeting: (n) => `Dobrý den ${n},`,
    intro: (l) => `děkujeme za Vaši poptávku. Na základě Vašeho požadavku (dodání: ${l}) Vám zasíláme cenovou nabídku:`,
    products: { epal: "Nové EPAL palety 1200 × 800", collars: "Nové paletové nástavce" },
    pcs: "ks",
    subtotal: "Zboží celkem",
    discount: (p) => `Množstevní sleva ${p} %`,
    net: "Cena bez DPH",
    vat: (r) => `DPH ${r} %`,
    gross: "Cena s DPH",
    transport: (p) => `Doprava (${p})`,
    missing: "[DOPLNIT CENU DOPRAVY]",
    outro: "V případě dotazů nás neváhejte kontaktovat.",
    regards: "S pozdravem",
  },
  en: {
    locale: "en-GB",
    subject: "Your quote – WAV Invest",
    greeting: (n) => `Dear ${n},`,
    intro: (l) => `thank you for your enquiry. Based on your request (delivery to: ${l}), please find our quote below:`,
    products: { epal: "New EPAL pallets 1200 × 800", collars: "New pallet collars" },
    pcs: "pcs",
    subtotal: "Goods total",
    discount: (p) => `Volume discount ${p} %`,
    net: "Total excl. VAT",
    vat: (r) => `VAT ${r} %`,
    gross: "Total incl. VAT",
    transport: (p) => `Transport (${p})`,
    missing: "[ADD TRANSPORT PRICE]",
    outro: "If you have any questions, please do not hesitate to contact us.",
    regards: "Kind regards",
  },
  de: {
    locale: "de-DE",
    subject: "Ihr Angebot – WAV Invest",
    greeting: (n) => `Guten Tag ${n},`,
    intro: (l) => `vielen Dank für Ihre Anfrage. Gemäß Ihrer Anfrage (Lieferung nach: ${l}) erhalten Sie unser Angebot:`,
    products: { epal: "Neue EPAL-Paletten 1200 × 800", collars: "Neue Palettenaufsatzrahmen" },
    pcs: "Stk.",
    subtotal: "Ware gesamt",
    discount: (p) => `Mengenrabatt ${p} %`,
    net: "Summe netto",
    vat: (r) => `MwSt. ${r} %`,
    gross: "Summe brutto",
    transport: (p) => `Transport (${p})`,
    missing: "[TRANSPORTPREIS ERGÄNZEN]",
    outro: "Bei Fragen stehen wir Ihnen gerne zur Verfügung.",
    regards: "Mit freundlichen Grüßen",
  },
  pl: {
    locale: "pl-PL",
    subject: "Oferta cenowa – WAV Invest",
    greeting: (n) => `Dzień dobry ${n},`,
    intro: (l) => `dziękujemy za zapytanie. Na podstawie Państwa zapytania (dostawa: ${l}) przesyłamy ofertę:`,
    products: { epal: "Nowe palety EPAL 1200 × 800", collars: "Nowe nadstawki paletowe" },
    pcs: "szt.",
    subtotal: "Towar razem",
    discount: (p) => `Rabat ilościowy ${p} %`,
    net: "Cena netto",
    vat: (r) => `VAT ${r} %`,
    gross: "Cena brutto",
    transport: (p) => `Transport (${p})`,
    missing: "[UZUPEŁNIĆ CENĘ TRANSPORTU]",
    outro: "W razie pytań prosimy o kontakt.",
    regards: "Z poważaniem",
  },
};

export function quoteEmail({
  language,
  name,
  location,
  calc,
  currency,
  vatRate,
  transportMissing,
}: {
  language: string;
  name: string;
  location: string;
  calc: Calculation;
  currency: string;
  vatRate: number;
  transportMissing: boolean;
}) {
  const t = copy[language] ?? copy.en;
  const m = (v: number) => new Intl.NumberFormat(t.locale, { style: "currency", currency }).format(v);
  const n = (v: number) => new Intl.NumberFormat(t.locale).format(v);

  const rows = calc.lines.map(
    (l) => `• ${t.products[l.product]}: ${n(l.qty)} ${t.pcs} × ${m(l.unitPrice)} = ${m(l.total)}`,
  );
  const totals = [
    `${t.subtotal}: ${m(calc.subtotal)}`,
    calc.discountPercent > 0 && `${t.discount(calc.discountPercent)}: −${m(calc.discount)}`,
    `${t.transport(location)}: ${transportMissing ? t.missing : m(calc.transport)}`,
    `${t.net}: ${m(calc.net)}`,
    `${t.vat(vatRate)}: ${m(calc.vat)}`,
    `${t.gross}: ${m(calc.gross)}`,
  ].filter(Boolean);

  const body = [
    t.greeting(name),
    "",
    t.intro(location),
    "",
    ...rows,
    "",
    ...totals,
    "",
    t.outro,
    "",
    t.regards,
    company.name,
    company.phone,
    company.email,
  ].join("\n");

  return { subject: t.subject, body };
}
