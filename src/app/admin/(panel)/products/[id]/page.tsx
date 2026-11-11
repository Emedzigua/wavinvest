import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackButton from "@/components/admin/BackButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SiteProductForm from "@/components/admin/SiteProductForm";
import { requireAdmin } from "@/lib/admin/auth";
import type { SiteProductRow } from "@/lib/site-products-shared";
import { deleteSiteProduct } from "../../../actions";

export const metadata: Metadata = { title: "Produkt" };
// Admin pages are personal and always rendered per request
export const instant = false;

export default async function SiteProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  let product: SiteProductRow | null = null;
  if (id !== "new") {
    const { data } = await supabase.from("site_products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data as SiteProductRow;
  }
  const name = product?.content?.sk?.name;

  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin/products" label="Produkty na webe" />
          <h1 className="display">{name ?? "Nový produkt"}</h1>
        </div>
        {product && (
          <ConfirmButton
            action={deleteSiteProduct.bind(null, product.id)}
            message={`Natrvalo odstrániť „${name}“ z webu? Ak ho chcete len dočasne schovať, použite „Skryť“.`}
            className="btn btn--ghost"
          >
            Odstrániť
          </ConfirmButton>
        )}
      </header>
      <SiteProductForm product={product} />
    </>
  );
}
