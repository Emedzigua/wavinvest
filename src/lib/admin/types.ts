export type Product = "epal" | "collars";
export type CustomerStatus = "active" | "inactive" | "lost";
export type QuoteStatus = "new" | "replied" | "won" | "lost";
export type Schedule = "weekly" | "biweekly" | "monthly";

export type DiscountTier = { min_qty: number; percent: number };

export type Depot = { id: string; name: string; address: string; lat: number; lng: number };

// Distance from each warehouse, keyed by depot id. road = false means straight line.
export type Distances = Record<string, { km: number; min: number | null; road: boolean }>;

export type Settings = {
  price_epal: number;
  price_collars: number;
  vat_rate: number;
  currency: string;
  discount_tiers: DiscountTier[];
  depots: Depot[];
  transport_per_km: number;
};

export type Contact = {
  id: string;
  customer_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
};

export type Contract = {
  id: string;
  customer_id: string;
  product: Product;
  monthly_qty: number;
  unit_price: number;
  start_date: string;
  end_date: string | null;
  schedule: Schedule;
  weekdays: number[];
  month_day: number | null;
  notes: string | null;
};

export type Customer = {
  id: string;
  company_name: string;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  status: CustomerStatus;
  source: "manual" | "quote";
  language: string | null;
  notes: string | null;
  depot: string;
  distances: Distances | null;
  geo_query: string | null;
  created_at: string;
};

export type Quote = {
  id: string;
  customer_id: string | null;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  product: Product | "mixed";
  quantity: number;
  delivery_location: string;
  message: string | null;
  language: string;
  status: QuoteStatus;
  created_at: string;
  replied_at: string | null;
  lat: number | null;
  lng: number | null;
  distances: Distances | null;
  geo_query: string | null;
};
