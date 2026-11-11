import type { Metadata } from "next";
import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { requireAdmin } from "@/lib/admin/auth";
import { PRODUCT_LANGS, type SiteProductRow } from "@/lib/site-products-shared";
import { moveSiteProduct, setSiteProductActive } from "../../actions";

export const metadata: Metadata = { title: "Produkty na webe" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function SiteProductsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("site_products").select("*").order("sort").order("created_at");
  const rows = (data ?? []) as SiteProductRow[];

  return (
    <>
      <header className="adm-head">
        <div>
          <h1 className="display">Produkty na webe</h1>
          <p className="muted">Čo web ukazuje v časti „Čo dodávame“ a vo formulári na dopyt. Zmeny sa na webe prejavia hneď.</p>
        </div>
        <Link href="/admin/products/new" className="btn btn--dark">
          + Nový produkt
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="card muted">Zatiaľ žiadne produkty. Pridajte prvý.</p>
      ) : (
        <ul className="site-products">
          {rows.map((p) => {
            const missing = PRODUCT_LANGS.filter((l) => !p.content?.[l]?.name);
            return (
              <li key={p.id} className={`site-product card${p.active ? "" : " is-hidden"}`}>
                <div className="site-product__img">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                    <img src={p.image} alt="" />
                  ) : (
                    <span className="muted small">Bez fotky</span>
                  )}
                </div>
                <div className="site-product__body">
                  <Link href={`/admin/products/${p.id}`} className="site-product__name">
                    {p.content?.sk?.name ?? p.slug}
                  </Link>
                  <span className="muted small">
                    {p.active ? "Zobrazený na webe" : "Skrytý"}
                    {missing.length > 0 && ` · bez prekladu: ${missing.map((l) => l.toUpperCase()).join(", ")}`}
                  </span>
                </div>
                <div className="btn-row">
                  <ConfirmButton action={moveSiteProduct.bind(null, p.id, -1)}>
                    <span aria-hidden>↑</span>
                    <span className="sr-only">Posunúť vyššie</span>
                  </ConfirmButton>
                  <ConfirmButton action={moveSiteProduct.bind(null, p.id, 1)}>
                    <span aria-hidden>↓</span>
                    <span className="sr-only">Posunúť nižšie</span>
                  </ConfirmButton>
                  <ConfirmButton action={setSiteProductActive.bind(null, p.id, !p.active)}>
                    {p.active ? "Skryť" : "Zobraziť"}
                  </ConfirmButton>
                  <Link href={`/admin/products/${p.id}`} className="btn btn--ghost btn--sm">
                    Upraviť
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
