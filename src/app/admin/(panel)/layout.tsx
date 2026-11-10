import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import AdminNav from "@/components/admin/AdminNav";
import PathTracker from "@/components/admin/PathTracker";
import Loading from "./loading";
import { requireAdmin } from "@/lib/admin/auth";
import { homeHref, visibleMenu } from "@/lib/admin/menu";
import { signOut } from "../actions";

export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <Suspense fallback={<HomeLink href="/admin" />}>
          <UserHomeLink />
        </Suspense>
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
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
    </div>
  );
}

async function NavWithCount() {
  const { supabase, user } = await requireAdmin();
  const visible = visibleMenu(user.menu);
  const { count } = visible.includes("quotes")
    ? await supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "new")
    : { count: 0 };
  return <AdminNav newQuotes={count ?? 0} visible={visible} />;
}

function HomeLink({ href }: { href: string }) {
  return (
    <Link href={href} className="adm-side__logo">
      <Logo />
    </Link>
  );
}

async function UserHomeLink() {
  const { user } = await requireAdmin();
  return <HomeLink href={homeHref(user.menu)} />;
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
