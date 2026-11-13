// Sidebar tabs. Each admin picks which ones they see (Settings is always there).
export const MENU = [
  { key: "overview", href: "/admin", label: "Prehľad" },
  { key: "meetings", href: "/admin/meetings", label: "Stretnutia" },
  { key: "customers", href: "/admin/customers", label: "Zákazníci" },
  { key: "prospects", href: "/admin/prospects", label: "Prospekty" },
  { key: "quotes", href: "/admin/quotes", label: "Dopyty" },
  { key: "invoices", href: "/admin/invoices", label: "Faktúry" },
  { key: "mail", href: "/admin/mail", label: "Pošta" },
  { key: "products", href: "/admin/products", label: "Produkty na webe" },
  { key: "callers", href: "/admin/callers", label: "Volajúci" },
] as const;

export type MenuKey = (typeof MENU)[number]["key"];
export type AdminRole = "developer" | "owner";
export const MENU_KEYS = MENU.map((m) => m.key) as MenuKey[];

// The owner runs his business here; the prospecting system is the developer's
export const ROLE_KEYS: Record<AdminRole, MenuKey[]> = {
  developer: MENU_KEYS,
  owner: ["overview", "meetings", "customers", "quotes", "invoices", "mail", "products"],
};

// Quick switches between the ways the admin is used (only those that fit the role are offered)
export const MENU_PRESETS: { label: string; keys: MenuKey[] }[] = [
  { label: "Všetko", keys: MENU_KEYS },
  { label: "Obchod", keys: ["overview", "meetings", "customers", "quotes", "invoices", "mail", "products"] },
  { label: "Prospekty", keys: ["prospects", "callers", "meetings"] },
];

// "Všetko" means everything the role allows; other presets only when all their tabs are allowed
export const presetsFor = (role: AdminRole) =>
  MENU_PRESETS.map((p) => (p.label === "Všetko" ? { ...p, keys: ROLE_KEYS[role] } : p)).filter(
    (p, i, all) =>
      p.keys.every((k) => ROLE_KEYS[role].includes(k)) && all.findIndex((q) => q.keys.join() === p.keys.join()) === i,
  );

// null (never saved) means every tab the role allows
export const visibleMenu = (menu: string[] | null | undefined, role: AdminRole): MenuKey[] => {
  const allowed = ROLE_KEYS[role];
  return menu ? allowed.filter((k) => menu.includes(k)) : allowed;
};

export const homeHref = (menu: string[] | null | undefined, role: AdminRole) => {
  const first = visibleMenu(menu, role)[0];
  return MENU.find((m) => m.key === first)?.href ?? "/admin/settings";
};
