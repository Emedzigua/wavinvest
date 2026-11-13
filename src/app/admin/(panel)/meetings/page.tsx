import type { Metadata } from "next";
import Link from "next/link";
import AutoSubmitForm from "@/components/admin/AutoSubmitForm";
import MapView from "@/components/admin/MapView";
import MeetingForm from "@/components/admin/MeetingForm";
import MeetingResult from "@/components/admin/MeetingResult";
import { requireAdmin } from "@/lib/admin/auth";
import { num } from "@/lib/admin/format";
import {
  START_POINTS,
  calendarLink,
  dayKey,
  longDay,
  meetingStatusLabel,
  navigateLink,
  routeLink,
  timeOf,
  type Meeting,
  type StartPoint,
} from "@/lib/admin/meetings";

export const metadata: Metadata = { title: "Stretnutia" };
// Admin pages are personal and always rendered per request
export const instant = false;

const WEEKDAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const pad = (n: number) => String(n).padStart(2, "0");
const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

export default async function MeetingsPage({ searchParams }: PageProps<"/admin/meetings">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const { supabase, user } = await requireAdmin();
  const today = dayKey(new Date());
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(str("d")) ? str("d") : today;
  const month = /^\d{4}-\d{2}$/.test(str("m")) ? str("m") : selected.slice(0, 7);
  const start: StartPoint = str("start") in START_POINTS ? (str("start") as StartPoint) : "office";
  const editing = str("edit");
  const adding = str("new") === "1";

  // The whole visible month (with a day of margin for time zones)
  const [y, mo] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, mo - 1, 0)).toISOString();
  const to = new Date(Date.UTC(y, mo, 2)).toISOString();
  const [{ data }, { data: upcomingData }] = await Promise.all([
    supabase.from("meetings").select("*").gte("starts_at", from).lt("starts_at", to).order("starts_at"),
    supabase.from("meetings").select("*").eq("status", "planned").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1),
  ]);
  const all = (data ?? []) as Meeting[];
  const byDay = new Map<string, Meeting[]>();
  for (const m of all) byDay.set(dayKey(m.starts_at), [...(byDay.get(dayKey(m.starts_at)) ?? []), m]);
  const dayMeetings = byDay.get(selected) ?? [];
  const planned = dayMeetings.filter((m) => m.status !== "cancelled");
  const next = (upcomingData ?? [])[0] as Meeting | undefined;
  const edit = editing ? all.find((m) => m.id === editing) : undefined;

  // Month grid starting on Monday
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  };
  const monthName = new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ d: selected, m: month, ...(start !== "office" && { start }), ...patch });
    return `/admin/meetings?${p}`;
  };

  const pins = planned
    .filter((m) => m.lat != null && m.lng != null)
    .map((m, i) => ({
      id: m.id,
      lat: m.lat!,
      lng: m.lng!,
      label: `${i + 1}. ${m.title}`,
      sub: `${timeOf(m.starts_at)}${m.address ? ` · ${m.address}` : ""}`,
      color: m.status === "done" ? "#2f6b3c" : "#322d2a",
    }));
  const startPoint = START_POINTS[start];
  const routeDepots = [{ id: "start", name: startPoint.label, address: startPoint.query, lat: startPoint.lat, lng: startPoint.lng }];

  return (
    <>
      <header className="adm-head">
        <div>
          <h1 className="display">Stretnutia</h1>
          <p className="muted">
            {next
              ? `Najbližšie: ${longDay(dayKey(next.starts_at))} o ${timeOf(next.starts_at)} · ${next.title}`
              : "Žiadne naplánované stretnutie."}
          </p>
        </div>
        <Link href={link({ new: "1" })} className="btn btn--dark">
          + Nové stretnutie
        </Link>
      </header>

      {(adding || edit) && (
        <section className="card">
          <h2 className="card__title">{edit ? "Upraviť stretnutie" : "Nové stretnutie"}</h2>
          <MeetingForm meeting={edit} day={selected} cancelHref={link({})} />
        </section>
      )}

      <div className="meet">
        <section className="card meet__cal" aria-label="Kalendár">
          <div className="meet__month">
            <Link href={link({ m: shift(-1) })} className="btn btn--ghost btn--sm" aria-label="Predchádzajúci mesiac">
              ←
            </Link>
            <strong>{monthName}</strong>
            <Link href={link({ m: shift(1) })} className="btn btn--ghost btn--sm" aria-label="Ďalší mesiac">
              →
            </Link>
          </div>
          <div className="meet__grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="meet__wd">
                {w}
              </span>
            ))}
            {cells.map((key, i) =>
              key ? (
                <Link
                  key={key}
                  href={link({ d: key, m: month })}
                  className={`meet__day${key === selected ? " is-selected" : ""}${key === today ? " is-today" : ""}`}
                  aria-current={key === selected ? "date" : undefined}
                >
                  <span>{Number(key.slice(8))}</span>
                  {(byDay.get(key) ?? []).filter((m) => m.status !== "cancelled").length > 0 && (
                    <em aria-label="stretnutia">{(byDay.get(key) ?? []).filter((m) => m.status !== "cancelled").length}</em>
                  )}
                </Link>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
          {selected !== today && (
            <Link href={link({ d: today, m: today.slice(0, 7) })} className="meet__today">
              Dnes
            </Link>
          )}
        </section>

        <section className="card meet__daycard">
          <h2 className="card__title">{longDay(selected)}</h2>
          {dayMeetings.length === 0 ? (
            <p className="muted">V tento deň nie je žiadne stretnutie.</p>
          ) : (
            <ol className="meet__list">
              {dayMeetings.map((m) => (
                <li key={m.id} className={`meet__item is-${m.status}`}>
                  <div className="meet__time">
                    <strong>{timeOf(m.starts_at)}</strong>
                    <span>{m.duration_min} min</span>
                  </div>
                  <div className="meet__body">
                    <h3>{m.title}</h3>
                    {m.address && <p>{m.address}</p>}
                    {(m.contact_name || m.contact_phone) && (
                      <p>
                        {m.contact_name}
                        {m.contact_name && m.contact_phone && " · "}
                        {m.contact_phone && <a href={tel(m.contact_phone)}>{m.contact_phone}</a>}
                      </p>
                    )}
                    {m.pallets_per_month && <p className="muted">{num(m.pallets_per_month)} paliet mesačne</p>}
                    {m.notes && <p className="muted">{m.notes}</p>}
                    {m.status !== "planned" && (
                      <p>
                        <span className="pill">{meetingStatusLabel[m.status]}</span>
                        {m.result && <span className="muted"> {m.result}</span>}
                      </p>
                    )}
                    <div className="btn-row meet__actions">
                      <a href={navigateLink(m)} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                        Navigovať ↗
                      </a>
                      <a href={calendarLink(m)} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                        Do Google kalendára ↗
                      </a>
                      <Link href={link({ edit: m.id })} className="btn btn--ghost btn--sm">
                        Upraviť
                      </Link>
                    </div>
                    <MeetingResult meeting={m} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {planned.length > 0 && (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">Trasa na tento deň</h2>
            <a href={routeLink(planned, start)} target="_blank" rel="noreferrer" className="btn btn--dark btn--sm">
              Navigovať celý deň ↗
            </a>
          </div>
          <AutoSubmitForm className="filters">
            <input type="hidden" name="d" value={selected} />
            <input type="hidden" name="m" value={month} />
            <label className="field field--inline">
              <span>Začiatok a koniec:</span>
              <select name="start" defaultValue={start} className="pill-select">
                {Object.entries(START_POINTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </AutoSubmitForm>
          <p className="muted small">
            Poradie podľa času stretnutí: {startPoint.label} → {planned.map((m) => m.title).join(" → ")} → {startPoint.label}.
          </p>
          {pins.length > 0 ? (
            <MapView pins={pins} depots={routeDepots} height={380} zoom={10} />
          ) : (
            <p className="muted">Stretnutia nemajú presnú polohu, trasa sa otvorí podľa adries v Google Maps.</p>
          )}
        </section>
      )}
      {user.role === "developer" && (
        <p className="muted small">
          Stretnutie pre majiteľa naplánujete aj priamo z firmy v Prospektoch alebo ho dohodne volajúci. Do kalendára sa dostane samo.
        </p>
      )}
    </>
  );
}
