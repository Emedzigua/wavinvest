"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { PRODUCT_EVENT } from "./ProductCta";
import { submitQuote } from "@/lib/quote-action";
import Turnstile from "./Turnstile";
import { localeTags } from "@/i18n/config";
import { company } from "@/lib/media";

type Status = "idle" | "sending" | "success" | "error" | "missing-config" | "captcha";

export default function QuoteForm({
  dict,
  lang,
  available,
}: {
  dict: Dictionary["quote"];
  lang: Locale;
  available: boolean;
}) {
  const [product, setProduct] = useState("epal");
  const [status, setStatus] = useState<Status>("idle");
  const [attempt, setAttempt] = useState(0);
  const f = dict.fields;

  useEffect(() => {
    const select = (e: Event) => setProduct((e as CustomEvent<string>).detail);
    window.addEventListener(PRODUCT_EVENT, select);
    return () => window.removeEventListener(PRODUCT_EVENT, select);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("language", lang);

    setStatus("sending");
    try {
      const result = await submitQuote(data);
      if (result === "success") form.reset();
      setStatus(result);
    } catch {
      setStatus("error");
    }
    // A captcha token works once; get a new one for the next try
    setAttempt((a) => a + 1);
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
    <form className="form" onSubmit={onSubmit}>
      {/* Say it before anyone spends time filling this in */}
      {!available && <p className="form__notice"><WithPhone text={dict.notConfigured} /></p>}
      <p className="form__hint">
        <span aria-hidden>* </span>
        {dict.required}
      </p>

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
          {/* The [marked] words link to the policy; a new tab keeps what was typed here */}
          {f.consent.split(/\[(.+?)\]/).map((part, i) =>
            i % 2 ? (
              <a key={i} href={`/${lang}/privacy`} target="_blank" rel="noopener">
                {part}
              </a>
            ) : (
              part
            ),
          )}
        </span>
      </label>

      {available && <Turnstile language={localeTags[lang]} theme="dark" resetKey={attempt} />}

      <button type="submit" className="btn btn--light btn--block" disabled={!available || status === "sending"}>
        {status === "sending" ? dict.sending : dict.submit}
      </button>

      {status === "error" && <p className="form__msg" role="alert"><WithPhone text={dict.error} /></p>}
      {status === "missing-config" && <p className="form__msg" role="alert"><WithPhone text={dict.notConfigured} /></p>}
      {status === "captcha" && <p className="form__msg" role="alert">{dict.captcha}</p>}
    </form>
  );
}

// Puts the callable phone number into a translated sentence
function WithPhone({ text }: { text: string }) {
  const [before, after] = text.split("{phone}");
  return (
    <>
      {before}
      <a href={`tel:${company.phone.replace(/\s/g, "")}`}>{company.phone}</a>
      {after}
    </>
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
