export function money(value: number, currency = "EUR") {
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency }).format(value);
}

export function num(value: number) {
  return new Intl.NumberFormat("sk-SK").format(value);
}

export function date(value: string | Date) {
  return new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

export function dateTime(value: string | Date) {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bratislava",
  }).format(new Date(value));
}

export function address(c: { street: string | null; postal_code: string | null; city: string | null; country: string | null }) {
  return [c.street, [c.postal_code, c.city].filter(Boolean).join(" "), c.country].filter(Boolean).join(", ");
}
