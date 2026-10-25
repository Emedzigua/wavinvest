import type { ReactNode } from "react";

// Tiny uppercase label with the signature 4px square
export default function SectionLabel({
  children,
  light,
  as: Tag = "p",
}: {
  children: ReactNode;
  light?: boolean;
  as?: "p" | "h4" | "span";
}) {
  return <Tag className={`label${light ? " label--light" : ""}`}>{children}</Tag>;
}
