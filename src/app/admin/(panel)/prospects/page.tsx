import Link from "next/link";
import type { Metadata } from "next";
import BackButton from "@/components/admin/BackButton";
import AutoSubmitForm from "@/components/admin/AutoSubmitForm";
import RowLink from "@/components/admin/RowLink";
import MapView from "@/components/admin/MapView";
import { requireAdmin } from "@/lib/admin/auth";
import { visibleMenu } from "@/lib/admin/menu";
import { getSettings } from "@/lib/admin/data";
import { num } from "@/lib/admin/format";
import {
  COUNTRIES,
  countryLabel,
  depotName,
  prospectStatusLabel,
  sectorLabel,
  statusColor,
  type Prospect,
} from "@/lib/admin/prospects";

export const metadata: Metadata = { title: "Prospekty" };
// Admin pages are personal and always rendered per request
export const instant = false;

const PAGE = 50;
const TABS = ["today", "new", "interested", "meeting", "all"] as const;
type Tab = (typeof TABS)[number];
const tabLabel: Record<Tab, string> = { today: "Na dnes", new: "Nové", interested: "Záujem", meeting: "Stretnutia", all: "Všetky" };

export default async function ProspectsPage({ searchParams }: PageProps<"/admin/prospects">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const tab: Tab = TABS.includes(str("tab") as Tab) ? (str("tab") as Tab) : "new";
  const country = COUNTRIES.includes(str("country") as (typeof COUNTRIES)[number]) ? str("country") : "";
  const sector = sectorLabel[str("sector")] ? str("sector") : "";
  const dist = Number(str("dist")) || 0;
  const phoneOnly = str("phone") === "1";
  const q = str("q").trim();
  const sort = ["score", "distance", "name"].includes(str("sort")) ? str("sort") : "score";
  const page = Math.max(1, Number(str("page")) || 1);
  const { supabase, user } = await requireAdmin();
  const showOverview = visibleMenu(user.menu).includes("overview");
  const today = new Date().toISOString().slice(0, 10);
  const filter = <T,>(query: T) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the same filters go on two query shapes
    let qq = query as any;
    if (tab === "today") qq = qq.lte("next_action", today).not("status", "in", "(customer,not_interested,unreachable)");
    if (tab === "new") qq = qq.eq("status", "new");
    if (tab === "interested") qq = qq.eq("status", "interested");
    if (tab === "meeting") qq = qq.eq("status", "meeting");
    if (country) qq = qq.eq("country", country);
    if (sector) qq = qq.eq("sector", sector);
    if (dist) qq = qq.lte("distance_km", dist);
    if (phoneOnly) qq = qq.not("phone", "is", null);
    if (q) qq = qq.ilike("name", `%${q.replace(/[%_,()]/g, "")}%`);
    return qq as T;
  };
  const order = sort === "distance" ? "distance_km" : sort === "name" ? "name" : "score";
  const [{ data, count }, { data: pinsData }, { data: summary }, settings] = await Promise.all([
    filter(
      supabase
        .from("prospects")
        .select("id, country, name, sector, city, distance_km, nearest_depot, phone, website, status, next_action, score", {
          count: "exact",
        }),
    )
      .order(order, { ascending: sort !== "score" })
      .order("name")
      .range((page - 1) * PAGE, page * PAGE - 1),
    filter(supabase.from("prospects").select("id, name, city, lat, lng, status")).order("score", { ascending: false }).limit(3000),
    supabase.rpc("prospect_summary"),
    getSettings(supabase),
  ]);
  const rows = (data ?? []) as Prospect[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const byCountry = Object.fromEntries(
    COUNTRIES.map((c) => [c, ((summary ?? []) as { country: string; n: number }[]).filter((s) => s.country === c).reduce((t, s) => t + Number(s.n), 0)]),
  );

  const link = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ tab, ...(country && { country }), ...(sector && { sector }), ...(dist && { dist: String(dist) }), ...(phoneOnly && { phone: "1" }), ...(q && { q }), ...(sort !== "score" && { sort }) });
    for (const [k, v] of Object.entries(patch)) p.set(k, String(v));
    for (const [k, v] of [...p]) if (!v || v === "0") p.delete(k);
    return `/admin/prospects?${p}`;
  };
  const pins = ((pinsData ?? []) as Pick<Prospect, "id" | "name" | "city" | "lat" | "lng" | "status">[]).map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: p.name,
    sub: p.city ?? undefined,
    href: `/admin/prospects/${p.id}`,
    color: statusColor[p.status],
  }));

  return (
    <>
      <header className="adm-head">
        <div>
          {showOverview && <BackButton href="/admin" label="Prehľad" />}
          <h1 className="display">Prospekty</h1>
        </div>
        <dl className="prospect-counts">
          {COUNTRIES.map((c) => (
            <div key={c}>
              <dt>{c}</dt>
              <dd>{num(byCountry[c])}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Stav">
          {TABS.map((t) => (
            <Link key={t} href={link({ tab: t, page: 1 })} aria-current={tab === t ? "page" : undefined}>
              {tabLabel[t]}
            </Link>
          ))}
        </nav>
        <AutoSubmitForm className="filters">
          <input type="hidden" name="tab" value={tab} />
          <select name="country" defaultValue={country} aria-label="Krajina" className="pill-select">
            <option value="">Všetky krajiny</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {countryLabel[c]}
              </option>
            ))}
          </select>
          <select name="sector" defaultValue={sector} aria-label="Odvetvie" className="pill-select">
            <option value="">Všetky odvetvia</option>
            {Object.entries(sectorLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="dist" defaultValue={String(dist)} aria-label="Vzdialenosť" className="pill-select">
            <option value="0">Akákoľvek vzdialenosť</option>
            {[100, 200, 300, 500].map((d) => (
              <option key={d} value={d}>
                do {d} km
              </option>
            ))}
          </select>
          <select name="phone" defaultValue={phoneOnly ? "1" : ""} aria-label="Telefón" className="pill-select">
            <option value="">S aj bez telefónu</option>
            <option value="1">Len s telefónom</option>
          </select>
          <select name="sort" defaultValue={sort} aria-label="Zoradiť" className="pill-select">
            <option value="score">Najlepšie skóre</option>
            <option value="distance">Najbližšie</option>
            <option value="name">Podľa názvu</option>
          </select>
          <input name="q" defaultValue={q} placeholder="Hľadať…" aria-label="Hľadať firmu" className="search__input" />
        </AutoSubmitForm>
      </div>

      {pins.length > 0 && (
        <section className="card card--flush">
          <MapView pins={pins} depots={settings.depots} height={380} zoom={9} />
        </section>
      )}

      {rows.length === 0 ? (
        <p className="card muted">Žiadne firmy pre tento filter.</p>
      ) : (
        <div className="card card--flush scroll-x">
          <table className="tbl tbl--rows">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Odvetvie</th>
                <th className="num">Vzdialenosť</th>
                <th>Telefón</th>
                <th>Stav</th>
                <th className="num">Skóre</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <RowLink key={p.id} href={`/admin/prospects/${p.id}`}>
                  <td>
                    <Link href={`/admin/prospects/${p.id}`}>
                      <strong>{p.name}</strong>
                    </Link>
                    <small className="muted">
                      {" "}
                      · {p.country}
                      {p.city ? ` · ${p.city}` : ""}
                    </small>
                  </td>
                  <td className="muted">{sectorLabel[p.sector] ?? p.sector}</td>
                  <td className="num nowrap">
                    {p.distance_km != null ? `${num(p.distance_km)} km` : "—"}
                    <small className="muted"> {depotName[p.nearest_depot ?? ""] ?? ""}</small>
                  </td>
                  <td className="nowrap">{p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a> : <span className="muted">—</span>}</td>
                  <td>
                    <span className="pill" style={{ color: statusColor[p.status] }}>
                      {prospectStatusLabel[p.status]}
                    </span>
                  </td>
                  <td className="num">{p.score}</td>
                </RowLink>
              ))}
            </tbody>
          </table>
          <footer className="pager">
            <span className="muted">
              {num((page - 1) * PAGE + 1)}–{num(Math.min(page * PAGE, total))} z {num(total)}
            </span>
            <span className="btn-row">
              {page > 1 && (
                <Link className="btn btn--ghost btn--sm" href={link({ page: page - 1 })}>
                  ← Späť
                </Link>
              )}
              {page < pages && (
                <Link className="btn btn--ghost btn--sm" href={link({ page: page + 1 })}>
                  Ďalej →
                </Link>
              )}
            </span>
          </footer>
        </div>
      )}
    </>
  );
}
