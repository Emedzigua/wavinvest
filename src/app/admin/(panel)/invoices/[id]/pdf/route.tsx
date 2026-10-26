import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/admin/auth";
import InvoicePdf from "@/lib/invoice/InvoicePdf";
import type { Invoice } from "@/lib/admin/types";

// The PDF is built from the stored invoice each time, so it always matches
export async function GET(request: Request, { params }: RouteContext<"/admin/invoices/[id]/pdf">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Faktúra neexistuje", { status: 404 });

  const invoice = data as Invoice;
  const pdf = await renderToBuffer(<InvoicePdf invoice={invoice} />);
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Faktura-${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
