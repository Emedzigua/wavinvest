import type { Metadata } from "next";
import { randomInt } from "node:crypto";
import BackButton from "@/components/admin/BackButton";
import NewCallerForm from "@/components/admin/NewCallerForm";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Nový volajúci" };
// Admin pages are personal and always rendered per request
export const instant = false;

// Easy to read out over the phone, hard to guess: "paleta-4821-sklad"
const WORDS = ["paleta", "sklad", "drevo", "kamion", "nadstavec", "regal", "vozik", "rampa"];
const suggestPassword = () => `${WORDS[randomInt(WORDS.length)]}-${randomInt(1000, 9999)}-${WORDS[randomInt(WORDS.length)]}`;

export default async function NewCallerPage() {
  await requireAdmin();
  return (
    <>
      <header className="adm-head">
        <div>
          <BackButton href="/admin/callers" label="Volajúci" />
          <h1 className="display">Nový volajúci</h1>
        </div>
      </header>
      <NewCallerForm suggestedPassword={suggestPassword()} />
    </>
  );
}
