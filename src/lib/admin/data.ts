import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Settings } from "./types";

export async function getSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data } = await supabase
    .from("settings")
    .select("price_epal, price_collars, vat_rate, currency, discount_tiers, depots, transport_per_km")
    .eq("id", 1)
    .single();
  return {
    price_epal: Number(data?.price_epal ?? 0),
    price_collars: Number(data?.price_collars ?? 0),
    vat_rate: Number(data?.vat_rate ?? 0),
    currency: data?.currency ?? "EUR",
    discount_tiers: data?.discount_tiers ?? [],
    depots: data?.depots ?? [],
    transport_per_km: Number(data?.transport_per_km ?? 0),
  };
}
