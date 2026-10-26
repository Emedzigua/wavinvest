import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every admin page and action calls this: a valid session alone is not
// enough, the user must also be listed in the admins table.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("name").eq("user_id", userId).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin/login?e=forbidden");
  }
  return { supabase, user: { id: userId, name: admin.name as string, email: data.claims.email as string } };
}
