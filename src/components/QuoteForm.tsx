"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { PRODUCT_EVENT } from "./ProductCta";

// Free Web3Forms key (https://web3forms.com). It is meant to be public —
// it only lets visitors send forms to the inbox that created it.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

type Status = "idle" | "sending" | "success" | "error" | "missing-key";

export default function QuoteForm({ dict, lang }: { dict: Dictionary["quote"]; lang: Locale }) {
  const [product, setProduct] = useState("epal-new");
  const [status, setStatus] = useState<Status>("idle");
  const f = dict.fields;

  useEffect(() => {
    const select = (e: Event) => setProduct((e as CustomEvent<string>).detail);
    window.addEventListener(PRODUCT_EVENT, select);
    return () => window.removeEventListener(PRODUCT_EVENT, select);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ACCESS_KEY) return setStatus("missing-key");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const productLabel = dict.productOptions[product as keyof typeof dict.productOptions];

    setStatus("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...data,
          product: productLabel,
          language: lang.toUpperCase(),
          access_key: ACCESS_KEY,
          subject: `Quote request: ${productLabel} — ${data.company || data.name}`,
          from_name: "WAV Invest website",
          replyto: data.email,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="form form--done" role="status">
        <span className="form__check" aria-hidden />
        <p className="subheading">{dict.success}</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate={false}>
      {/* Spam trap: real people never see or fill this */}
      <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="form__row">
        <Field label={f.name} name="name" autoComplete="name" required />
        <Field label={f.company} name="company" autoComplete="organization" required />
      </div>
      <div className="form__row">
        <Field label={f.email} name="email" type="email" autoComplete="email" required />
        <Field label={f.phone} name="phone" type="tel" autoComplete="tel" />
      </div>

      <label className="field">
        <span>
          {f.product} <i aria-hidden>*</i>
        </span>
        <select name="product_key" value={product} onChange={(e) => setProduct(e.target.value)} required>
          {Object.entries(dict.productOptions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="form__row">
        <Field label={f.quantity} name="quantity" type="number" min={1} inputMode="numeric" required />
        <Field label={f.location} name="delivery_location" autoComplete="address-level2" required />
      </div>

      <label className="field">
        <span>{f.message}</span>
        <textarea name="message" rows={4} placeholder={f.messagePlaceholder} />
      </label>

      <label className="check">
        <input type="checkbox" name="consent" value="yes" required />
        <span>
          {f.consent} <a href={`/${lang}/privacy`}>↗</a>
        </span>
      </label>

      <button type="submit" className="btn btn--light btn--block" disabled={status === "sending"}>
        {status === "sending" ? dict.sending : dict.submit}
      </button>

      {status === "error" && <p className="form__msg" role="alert">{dict.error}</p>}
      {status === "missing-key" && <p className="form__msg" role="alert">{dict.notConfigured}</p>}
    </form>
  );
}

function Field({
  label,
  required,
  ...input
}: { label: string; name: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>
        {label} {required && <i aria-hidden>*</i>}
      </span>
      <input required={required} {...input} />
    </label>
  );
}
