import { customerStatusLabel, quoteStatusLabel } from "@/lib/admin/labels";
import type { CustomerStatus, QuoteStatus } from "@/lib/admin/types";

export function CustomerPill({ status }: { status: CustomerStatus }) {
  return <span className={`pill pill--${status}`}>{customerStatusLabel[status]}</span>;
}

export function QuotePill({ status }: { status: QuoteStatus }) {
  return <span className={`pill pill--q-${status}`}>{quoteStatusLabel[status]}</span>;
}
