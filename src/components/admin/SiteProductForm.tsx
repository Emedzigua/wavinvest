"use client";

import { useActionState, useState } from "react";
import { saveSiteProduct } from "@/app/admin/actions";
import {
  PRODUCT_LANGS,
  productLangLabel,
  quoteKeyLabel,
  type ProductLang,
  type SiteProductRow,
} from "@/lib/site-products-shared";

// Shrinks a photo in the browser (longest side 1600px, WebP) so uploads stay small and the site loads fast
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}

export default function SiteProductForm({ product }: { product: SiteProductRow | null }) {
  const [lang, setLang] = useState<ProductLang>("sk");
  const [preview, setPreview] = useState<string | null>(product?.image ?? null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, action, pending] = useActionState(async (prev: string | null, form: FormData) => {
    if (photo) form.set("image_file", photo);
    return saveSiteProduct(prev, form);
  }, null);

  async function pick(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    try {
      const small = await shrink(file);
      setPhoto(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setPhotoError("Túto fotku sa nepodarilo načítať. Skúste JPG alebo PNG.");
    }
  }

  const text = (l: ProductLang) => product?.content?.[l];

  return (
    <form action={action} className="adm-form card">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input type="hidden" name="image" value={product?.image ?? ""} />

      <div className="product-edit__top">
        <div className="product-edit__photo">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen photo
            <img src={preview} alt="" />
          ) : (
            <span className="muted">Bez fotky</span>
          )}
          <label className="btn btn--ghost btn--sm">
            {preview ? "Zmeniť fotku" : "Pridať fotku"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {photoError && (
            <p className="adm-error" role="alert">
              {photoError}
            </p>
          )}
        </div>
        <div className="adm-form">
          <label className="field field--inline">
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} />
            <span>Zobraziť na webe</span>
          </label>
          <label className="field">
            <span>Cena v ponuke</span>
            <select name="quote_key" defaultValue={product?.quote_key ?? "mixed"}>
              {Object.entries(quoteKeyLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <p className="muted small">Určuje, z ktorej ceny sa počíta ponuka pri dopyte na tento produkt.</p>
        </div>
      </div>

      <div className="seg" role="group" aria-label="Jazyk textov">
        {PRODUCT_LANGS.map((l) => (
          <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
            {productLangLabel[l]}
            {l === "sk" ? " *" : ""}
          </button>
        ))}
      </div>
      <p className="muted small">
        Slovensky je povinné. Ak niektorý jazyk nevyplníte, web ukáže anglický text, a ak chýba aj ten, slovenský.
      </p>

      {/* Every language stays in the form, only the chosen one is shown */}
      {PRODUCT_LANGS.map((l) => (
        <fieldset key={l} className="adm-form product-edit__lang" hidden={lang !== l}>
          <legend className="sr-only">{productLangLabel[l]}</legend>
          <label className="field">
            <span>Názov{l === "sk" ? " *" : ""}</span>
            <input name={`${l}_name`} defaultValue={text(l)?.name ?? ""} maxLength={120} required={l === "sk"} />
          </label>
          <label className="field">
            <span>Krátky popis pod názvom</span>
            <input name={`${l}_tagline`} defaultValue={text(l)?.tagline ?? ""} maxLength={200} />
          </label>
          <label className="field">
            <span>Popis</span>
            <textarea name={`${l}_description`} rows={4} defaultValue={text(l)?.description ?? ""} maxLength={1500} />
          </label>
          <label className="field">
            <span>Parametre</span>
            <textarea
              name={`${l}_specs`}
              rows={5}
              defaultValue={(text(l)?.specs ?? []).map(([k, v]) => `${k}: ${v}`).join("\n")}
              placeholder={"Rozmery: 1200 × 800 × 144 mm\nNosnosť: 1 500 kg"}
            />
          </label>
          <p className="muted small">Jeden parameter na riadok v tvare „Názov: hodnota“.</p>
          <label className="field">
            <span>Popis fotky (pre nevidiacich a Google)</span>
            <input name={`${l}_image_alt`} defaultValue={text(l)?.image_alt ?? ""} maxLength={200} />
          </label>
        </fieldset>
      ))}

      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button className="btn btn--dark" disabled={pending}>
          {pending ? "Ukladám…" : product ? "Uložiť zmeny" : "Pridať produkt"}
        </button>
      </div>
    </form>
  );
}
