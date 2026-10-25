"use client";

import type { ReactNode } from "react";

export const PRODUCT_EVENT = "wav:select-product";

// Jumps to the quote form with this product already selected
export default function ProductCta({ product, children }: { product: string; children: ReactNode }) {
  return (
    <a
      href="#quote"
      className="btn btn--dark"
      onClick={() => window.dispatchEvent(new CustomEvent(PRODUCT_EVENT, { detail: product }))}
    >
      {children}
    </a>
  );
}
