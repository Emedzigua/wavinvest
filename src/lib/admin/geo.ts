import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Depot, Distances } from "./types";

type Point = { lat: number; lng: number };
const UA = { "User-Agent": "WAV Invest admin (info@wavinvest.eu)" };

export function addressQuery(c: { street?: string | null; postal_code?: string | null; city?: string | null; country?: string | null }) {
  return [c.street, c.postal_code, c.city, c.country].map((s) => s?.trim()).filter(Boolean).join(", ");
}

// Customers are in Europe; limiting the search stops a bare town name
// from landing on the other side of the world
const COUNTRIES = "sk,cz,pl,de,at,hu,ch,li,lu,nl,be,fr,it,si,hr,ro,ua,lt,lv,ee,dk,se,no,fi,gb,ie,es,pt,bg,rs,ba,me,mk,al,gr,md";

// Free geocoding from OpenStreetMap (Nominatim)
export async function geocode(query: string): Promise<Point | null> {
  if (!query) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=${COUNTRIES}&q=${encodeURIComponent(query)}`, {
      headers: { ...UA, "Accept-Language": "sk,pl,cs,de,en" },
    });
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

// Tries the full address, then without the street, then the town only,
// so a typo in the street still puts the customer in the right place
async function geocodeLoose(query: string) {
  const parts = query.split(", ");
  for (let i = 0; i < parts.length - 1 || i === 0; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000)); // Nominatim: max 1 request per second
    const point = await geocode(parts.slice(i).join(", "));
    if (point) return point;
  }
  return null;
}

function straightKm(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Driving distance from every warehouse in one request (free OSRM service).
// Falls back to the straight line when routing is unavailable.
export async function distancesFrom(depots: Depot[], to: Point): Promise<Distances> {
  const result: Distances = {};
  if (depots.length === 0) return result;
  try {
    const coords = [...depots, to].map((p) => `${p.lng},${p.lat}`).join(";");
    const sources = depots.map((_, i) => i).join(";");
    const res = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${sources}&destinations=${depots.length}&annotations=distance,duration`,
      { headers: UA, signal: AbortSignal.timeout(8000) },
    );
    const json = (await res.json()) as { code: string; distances: (number | null)[][]; durations: (number | null)[][] };
    if (json.code !== "Ok") throw new Error(json.code);
    depots.forEach((d, i) => {
      const m = json.distances[i]?.[0];
      const s = json.durations[i]?.[0];
      result[d.id] =
        m != null
          ? { km: Math.round(m / 1000), min: s != null ? Math.round(s / 60) : null, road: true }
          : { km: Math.round(straightKm(d, to)), min: null, road: false };
    });
  } catch {
    for (const d of depots) result[d.id] = { km: Math.round(straightKm(d, to)), min: null, road: false };
  }
  return result;
}

const hasAll = (d: Distances | null, depots: Depot[]) => !!d && depots.every((x) => d[x.id]);

type Located = { id: string; lat: number | null; lng: number | null; distances: Distances | null; geo_query: string | null };

// Looks up the position and warehouse distances when the address changed
// (or the warehouses did). Each address is only tried once, so a failed
// lookup is not repeated on every page load.
export async function refreshGeo<T extends Located>(
  supabase: SupabaseClient,
  table: "customers" | "quotes",
  row: T,
  query: string,
  depots: Depot[],
): Promise<T> {
  let { lat, lng, distances } = row;
  const changed = query !== (row.geo_query ?? "");
  if (!changed && (lat == null || hasAll(distances, depots))) return row;

  if (changed) {
    const point = await geocodeLoose(query);
    lat = point?.lat ?? null;
    lng = point?.lng ?? null;
  }
  distances = lat != null && lng != null ? await distancesFrom(depots, { lat, lng }) : null;

  const patch = { lat, lng, distances, geo_query: query };
  await supabase.from(table).update(patch).eq("id", row.id);
  return { ...row, ...patch };
}
