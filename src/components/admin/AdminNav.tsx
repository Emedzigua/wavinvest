"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU, MENU_KEYS, type MenuKey } from "@/lib/admin/menu";

export default function AdminNav({ newQuotes, visible = MENU_KEYS }: { newQuotes: number; visible?: MenuKey[] }) {
  const path = usePathname();
  const links = [...MENU.filter((m) => visible.includes(m.key)), { key: "settings", href: "/admin/settings", label: "Nastavenia" }];
  return (
    <nav className="adm-nav" aria-label="Administrácia">
      {links.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
            {l.key === "quotes" && newQuotes > 0 && (
              <span className="adm-badge" aria-label={`${newQuotes} nových`}>{newQuotes}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
