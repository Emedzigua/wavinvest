"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Prehľad" },
  { href: "/admin/customers", label: "Zákazníci" },
  { href: "/admin/quotes", label: "Dopyty" },
  { href: "/admin/invoices", label: "Faktúry" },
  { href: "/admin/mail", label: "Pošta" },
  { href: "/admin/settings", label: "Nastavenia" },
];

export default function AdminNav({ newQuotes }: { newQuotes: number }) {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Administrácia">
      {links.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
            {l.href === "/admin/quotes" && newQuotes > 0 && (
              <span className="adm-badge" aria-label={`${newQuotes} nových`}>{newQuotes}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
