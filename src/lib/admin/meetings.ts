// Meetings the owner goes to, shown in Slovak time

export type Meeting = {
  id: string;
  prospect_id: string | null;
  customer_id: string | null;
  title: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  pallets_per_month: number | null;
  starts_at: string;
  duration_min: number;
  notes: string | null;
  status: "planned" | "done" | "cancelled";
  result: string | null;
};

export const TZ = "Europe/Bratislava";

export const meetingStatusLabel: Record<Meeting["status"], string> = {
  planned: "Naplánované",
  done: "Hotové",
  cancelled: "Zrušené",
};

// "2026-11-13" for a moment, in Slovak time
export const dayKey = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

export const timeOf = (value: string | Date) =>
  new Intl.DateTimeFormat("sk-SK", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export const longDay = (key: string) =>
  new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));

// Slovak wall-clock date + time → the exact moment (handles summer and winter time)
export function slovakMoment(day: string, time: string): Date {
  const guess = new Date(`${day}T${time}:00Z`);
  const shown = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (shown.getTime() - utc.getTime()));
}

// Where a meeting day starts and ends
export const START_POINTS = {
  office: { label: "Kancelária Michalovce", query: "Štefana Moyzesa 30, 071 01 Michalovce", lat: 48.7563, lng: 21.917 },
  rzeszow: { label: "Sklad Rzeszów", query: "50.0412,21.9991", lat: 50.0412, lng: 21.9991 },
  andrychow: { label: "Sklad Andrychów", query: "49.8549,19.3384", lat: 49.8549, lng: 19.3384 },
} as const;
export type StartPoint = keyof typeof START_POINTS;

const where = (m: Meeting) => (m.lat != null && m.lng != null ? `${m.lat},${m.lng}` : (m.address ?? m.title));

// Opens Google Maps with the whole day: start → meetings in time order → back to start
export function routeLink(meetings: Meeting[], start: StartPoint) {
  const s = START_POINTS[start].query;
  const p = new URLSearchParams({ api: "1", origin: s, destination: s, travelmode: "driving" });
  if (meetings.length) p.set("waypoints", meetings.map(where).join("|"));
  return `https://www.google.com/maps/dir/?${p}`;
}

export const navigateLink = (m: Meeting) =>
  `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: where(m), travelmode: "driving" })}`;

// Adds the meeting to the owner's Google Calendar (works with the WAV Invest Gmail)
export function calendarLink(m: Meeting) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(m.starts_at);
  const end = new Date(start.getTime() + m.duration_min * 60_000);
  const details = [m.contact_name, m.contact_phone, m.pallets_per_month ? `${m.pallets_per_month} paliet mesačne` : null, m.notes]
    .filter(Boolean)
    .join("\n");
  const p = new URLSearchParams({ action: "TEMPLATE", text: `Stretnutie: ${m.title}`, dates: `${fmt(start)}/${fmt(end)}`, details });
  if (m.address) p.set("location", m.address);
  return `https://calendar.google.com/calendar/render?${p}`;
}
