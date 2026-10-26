import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Invoice } from "@/lib/admin/types";

// Inter, the site font. Two subsets: basic latin + Slovak/Czech/Polish/German letters.
const dir = path.join(process.cwd(), "assets/fonts");
for (const [family, subset] of [
  ["Inter", "latin"],
  ["InterExt", "latin-ext"],
] as const) {
  Font.register({
    family,
    fonts: [400, 500, 600].map((w) => ({ src: path.join(dir, `inter-${subset}-${w}-normal.woff`), fontWeight: w })),
  });
}
Font.registerHyphenationCallback((word) => [word]);

const C = { ink: "#322d2a", muted: "#8b8b8b", hair: "#e4e2da", soft: "#f0efe9", accent: "#d08a3c" };

const s = StyleSheet.create({
  page: { fontFamily: ["Inter", "InterExt"], fontSize: 9, color: C.ink, padding: 44, lineHeight: 1.45 },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  logo: { flexDirection: "row", alignItems: "center", gap: 5 },
  logoMark: { fontSize: 15, fontWeight: 600, letterSpacing: 0.5, lineHeight: 1 },
  logoSq: { width: 5, height: 5, backgroundColor: C.ink },
  logoSub: { fontSize: 7, letterSpacing: 2.5, lineHeight: 1 },
  title: { fontSize: 22, fontWeight: 400, textAlign: "right", lineHeight: 1.1 },
  number: { fontSize: 10, color: C.muted, textAlign: "right", marginTop: 6 },
  label: { fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  party: { flex: 1, paddingRight: 24 },
  strong: { fontWeight: 600 },
  facts: {
    flexDirection: "row",
    marginTop: 26,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.hair,
  },
  fact: { flex: 1 },
  factValue: { fontSize: 10, fontWeight: 500 },
  th: { fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 1, paddingBottom: 6 },
  tr: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderColor: C.hair },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 60, textAlign: "right" },
  cUnit: { width: 36, textAlign: "right" },
  cPrice: { width: 72, textAlign: "right" },
  cTotal: { width: 84, textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "auto", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    padding: 12,
    backgroundColor: C.ink,
    color: "#ffffff",
    borderRadius: 6,
  },
  grandValue: { fontSize: 15, fontWeight: 600 },
  pay: { marginTop: 26, padding: 14, backgroundColor: C.soft, borderRadius: 6, flexDirection: "row", gap: 20 },
  note: { marginTop: 16, fontSize: 8, color: C.muted },
  footer: {
    position: "absolute",
    left: 44,
    right: 44,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: C.muted,
    borderTopWidth: 1,
    borderColor: C.hair,
    paddingTop: 8,
  },
  stamp: { position: "absolute", top: 120, right: 44, fontSize: 10, color: C.accent, fontWeight: 600, letterSpacing: 2 },
});

const date = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
};

function Party({ label, p }: { label: string; p: Invoice["buyer"] }) {
  return (
    <View style={s.party}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.strong, { fontSize: 10 }]}>{p.name}</Text>
      {p.street ? <Text>{p.street}</Text> : null}
      <Text>{[p.postal_code, p.city].filter(Boolean).join(" ")}</Text>
      {p.country ? <Text>{p.country}</Text> : null}
      <View style={{ marginTop: 6 }}>
        {p.ico ? <Text>IČO: {p.ico}</Text> : null}
        {p.dic ? <Text>DIČ: {p.dic}</Text> : null}
        {p.ic_dph ? <Text>IČ DPH / VAT: {p.ic_dph}</Text> : null}
      </View>
    </View>
  );
}

export default function InvoicePdf({ invoice: inv }: { invoice: Invoice }) {
  const money = (v: number) =>
    new Intl.NumberFormat("sk-SK", { style: "currency", currency: inv.currency }).format(Number(v));
  const qty = (v: number) => new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 2 }).format(v);
  const seller = inv.seller;
  const vs = inv.number.replace(/\D/g, "");

  return (
    <Document title={`Faktúra ${inv.number}`} author={seller.name} language="sk">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.between}>
          <View style={s.logo}>
            <Text style={s.logoMark}>WAV</Text>
            <View style={s.logoSq} />
            <Text style={s.logoSub}>INVEST</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.title}>Faktúra</Text>
            <Text style={s.number}>Invoice č. {inv.number}</Text>
          </View>
        </View>
        {inv.status === "paid" && <Text style={s.stamp}>UHRADENÉ</Text>}
        {inv.status === "cancelled" && <Text style={[s.stamp, { color: "#a3342a" }]}>STORNO</Text>}

        {/* Parties */}
        <View style={[s.row, { marginTop: 34 }]}>
          <Party label="Dodávateľ / Supplier" p={seller} />
          <Party label="Odberateľ / Customer" p={inv.buyer} />
        </View>

        {/* Dates */}
        <View style={s.facts}>
          {[
            ["Dátum vystavenia", date(inv.issue_date)],
            ["Dátum dodania", date(inv.delivery_date)],
            ["Splatnosť", date(inv.due_date)],
            ["Variabilný symbol", vs],
          ].map(([l, v]) => (
            <View key={l} style={s.fact}>
              <Text style={s.label}>{l}</Text>
              <Text style={s.factValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Items */}
        <View style={{ marginTop: 26 }}>
          <View style={[s.row, { borderBottomWidth: 1, borderColor: C.ink }]}>
            <Text style={[s.th, s.cDesc]}>Popis / Description</Text>
            <Text style={[s.th, s.cQty]}>Množstvo</Text>
            <Text style={[s.th, s.cUnit]}>MJ</Text>
            <Text style={[s.th, s.cPrice]}>Cena / MJ</Text>
            <Text style={[s.th, s.cTotal]}>Spolu</Text>
          </View>
          {inv.items.map((it, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cDesc}>{it.description}</Text>
              <Text style={s.cQty}>{qty(it.qty)}</Text>
              <Text style={s.cUnit}>{it.unit}</Text>
              <Text style={s.cPrice}>{money(it.unit_price)}</Text>
              <Text style={s.cTotal}>{money(it.qty * it.unit_price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={{ color: C.muted }}>Základ dane</Text>
            <Text>{money(inv.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={{ color: C.muted }}>DPH {inv.eu_supply ? "0" : qty(inv.vat_rate)} %</Text>
            <Text>{money(inv.vat)}</Text>
          </View>
          <View style={s.grand}>
            <Text>Na úhradu / Total</Text>
            <Text style={s.grandValue}>{money(inv.total)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={s.pay} wrap={false}>
          {[
            ["IBAN", seller.iban || "—"],
            ["SWIFT / BIC", seller.swift || "—"],
            ["Banka", seller.bank || "—"],
            ["VS", vs],
          ].map(([l, v]) => (
            <View key={l} style={{ flex: l === "IBAN" ? 2.2 : 1 }}>
              <Text style={s.label}>{l}</Text>
              <Text style={s.factValue}>{v}</Text>
            </View>
          ))}
        </View>

        {inv.eu_supply && (
          <Text style={s.note}>
            Dodanie tovaru do iného členského štátu oslobodené od dane podľa § 43 zákona o DPH. / Intra-Community
            supply of goods exempt from VAT (Art. 138 Directive 2006/112/EC).
          </Text>
        )}
        {inv.note ? <Text style={s.note}>{inv.note}</Text> : null}
        {seller.note ? <Text style={s.note}>{seller.note}</Text> : null}

        <View style={s.footer} fixed>
          <Text>
            {seller.name}
            {seller.register ? ` · ${seller.register}` : ""}
          </Text>
          <Text>{[seller.email, seller.phone].filter(Boolean).join(" · ")}</Text>
        </View>
      </Page>
    </Document>
  );
}
