import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import AdminNav from "@/components/admin/AdminNav";
import PathTracker from "@/components/admin/PathTracker";
import { requireAdmin } from "@/lib/admin/auth";
import { signOut } from "../actions";

export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <Link href="/admin" className="adm-side__logo">
          <Logo />
        </Link>
        <Suspense fallback={<AdminNav newQuotes={0} />}>
          <NavWithCount />
        </Suspense>
        <Suspense>
          <UserBox />
        </Suspense>
      </aside>
      <Suspense>
        <PathTracker />
      </Suspense>
      <main className="adm-main">
        <Suspense fallback={<p className="muted">Načítavam…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}

async function NavWithCount() {
  const { supabase } = await requireAdmin();
  const { count } = await supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "new");
  return <AdminNav newQuotes={count ?? 0} />;
}

async function UserBox() {
  const { user } = await requireAdmin();
  return (
    <div className="adm-user">
      <div>
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>
      <form action={signOut}>
        <button className="btn btn--ghost btn--sm">Odhlásiť</button>
      </form>
    </div>
  );
}
