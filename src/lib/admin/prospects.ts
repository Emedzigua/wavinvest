export type ProspectStatus =
  | "new"
  | "to_call"
  | "called"
  | "interested"
  | "meeting"
  | "customer"
  | "not_interested"
  | "unreachable";

export type Prospect = {
  id: string;
  source_id: string;
  country: "PL" | "SK" | "CZ" | "HU" | "AT";
  name: string;
  sector: string;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  lat: number;
  lng: number;
  nearest_depot: string | null;
  distance_km: number | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  score: number;
  status: ProspectStatus;
  next_action: string | null;
  contact_name: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  customer_id: string | null;
};

export type Activity = {
  id: string;
  kind: "call" | "visit" | "email" | "note";
  outcome: string | null;
  note: string | null;
  created_at: string;
};

export const COUNTRIES = ["PL", "SK", "CZ", "HU", "AT", "DE", "LT", "LV"] as const;

export const countryLabel: Record<string, string> = {
  PL: "Poľsko",
  SK: "Slovensko",
  CZ: "Česko",
  HU: "Maďarsko",
  AT: "Rakúsko",
  DE: "Nemecko",
  LT: "Litva",
  LV: "Lotyšsko",
};

export const sectorLabel: Record<string, string> = {
  food: "Potraviny a nápoje",
  logistics: "Logistika a sklady",
  wholesale: "Veľkoobchod",
  building: "Stavebné materiály",
  wood: "Drevo a nábytok",
  paper: "Papier a obaly",
  chemical: "Chémia a plasty",
  metal: "Strojárstvo a kov",
  automotive: "Automotive",
  agri: "Poľnohospodárstvo",
  electronics: "Elektro",
  textile: "Textil",
  pharma: "Farmácia a zdravotníctvo",
  manufacturing: "Výroba",
  other: "Iné",
};

export const prospectStatusLabel: Record<ProspectStatus, string> = {
  new: "Nový",
  to_call: "Zavolať",
  called: "Kontaktovaný",
  interested: "Záujem",
  meeting: "Stretnutie",
  customer: "Zákazník",
  not_interested: "Bez záujmu",
  unreachable: "Nedostupný",
};

// What happened on a call, and where that leaves the prospect
export const OUTCOMES = {
  no_answer: { label: "Nedvíha", status: "to_call", days: 2 },
  call_back: { label: "Zavolať neskôr", status: "to_call", days: null },
  interested: { label: "Má záujem", status: "interested", days: 3 },
  meeting: { label: "Stretnutie dohodnuté", status: "meeting", days: null },
  not_interested: { label: "Nemá záujem", status: "not_interested", days: null },
  wrong_number: { label: "Zlé číslo", status: "unreachable", days: null },
} as const satisfies Record<string, { label: string; status: ProspectStatus; days: number | null }>;
export type Outcome = keyof typeof OUTCOMES;

export const depotName: Record<string, string> = { rzeszow: "Rzeszów", andrychow: "Andrychów" };

export const statusColor: Record<ProspectStatus, string> = {
  new: "#8b8b8b",
  to_call: "#d08a3c",
  called: "#3b6cb0",
  interested: "#2f8f6b",
  meeting: "#7a5bb0",
  customer: "#2f6b3c",
  not_interested: "#c9c4bc",
  unreachable: "#c9c4bc",
};
