import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/admin/menu";

// Every admin page and action calls this: a valid session alone is not
// enough, the user must also be listed in the admins table.
// Cached per request, so layout + page share one check instead of three.
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("name, menu, role").eq("user_id", userId).maybeSingle();
  if (!admin) {
    // Callers have their own simple screen and never see the admin
    const { data: caller } = await supabase.from("callers").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle();
    if (caller) redirect("/admin/call");
    await supabase.auth.signOut();
    redirect("/admin/login?e=forbidden");
  }
  return { supabase, user: {
      id: userId,
      name: admin.name as string,
      email: data.claims.email as string,
      menu: (admin.menu as string[] | null) ?? null,
      role: (admin.role as AdminRole) ?? "owner",
    },
  };
});

// The prospecting system (companies, callers, call history) is the developer's only;
// the database enforces this too, the redirect just keeps the owner on his own pages
export const requireDeveloper = cache(async () => {
  const session = await requireAdmin();
  if (session.user.role !== "developer") redirect("/admin");
  return session;
});

export type CallerLanguage = "sk" | "cs" | "pl" | "de" | "hu" | "en";

// Every caller page and action calls this: only active callers get through
export const requireCaller = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/admin/login");
  const { data: caller } = await supabase
    .from("callers")
    .select("name, countries, language")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (!caller) {
    await supabase.auth.signOut();
    redirect("/admin/login?e=forbidden");
  }
  return {
    supabase,
    caller: {
      id: userId,
      name: caller.name as string,
      countries: caller.countries as string[],
      language: caller.language as CallerLanguage,
    },
  };
});
