// Sidebar tabs. Each admin picks which ones they see (Settings is always there).
export const MENU = [
  { key: "overview", href: "/admin", label: "Prehľad" },
  { key: "customers", href: "/admin/customers", label: "Zákazníci" },
  { key: "prospects", href: "/admin/prospects", label: "Prospekty" },
  { key: "quotes", href: "/admin/quotes", label: "Dopyty" },
  { key: "invoices", href: "/admin/invoices", label: "Faktúry" },
  { key: "mail", href: "/admin/mail", label: "Pošta" },
] as const;

export type MenuKey = (typeof MENU)[number]["key"];
export const MENU_KEYS = MENU.map((m) => m.key) as MenuKey[];

// Quick switches between the two ways the admin is used
export const MENU_PRESETS: { label: string; keys: MenuKey[] }[] = [
  { label: "Všetko", keys: MENU_KEYS },
  { label: "Obchod", keys: ["overview", "customers", "quotes", "invoices", "mail"] },
  { label: "Prospekty", keys: ["prospects"] },
];

// null (never saved) means everything
export const visibleMenu = (menu: string[] | null | undefined): MenuKey[] =>
  menu ? MENU_KEYS.filter((k) => menu.includes(k)) : MENU_KEYS;

export const homeHref = (menu: string[] | null | undefined) => {
  const first = visibleMenu(menu)[0];
  return MENU.find((m) => m.key === first)?.href ?? "/admin/settings";
};
