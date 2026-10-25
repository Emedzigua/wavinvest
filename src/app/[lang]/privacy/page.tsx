import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { pageMetadata } from "@/lib/seo";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SectionLabel from "@/components/SectionLabel";

const UPDATED = "2026-10-25";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = await getDictionary(lang);
  return pageMetadata(lang, `${t.privacy.title} — WAV Invest`, t.meta.description, "/privacy");
}

export default async function Privacy({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    <>
      <Nav dict={t.nav} lang={lang} path="/privacy" />
      <main className="container legal">
        <SectionLabel>WAV Invest</SectionLabel>
        <h1 className="display">{t.privacy.title}</h1>
        <p className="muted">
          {t.privacy.updated}: <time dateTime={UPDATED}>{UPDATED}</time>
        </p>
        {t.privacy.sections.map((s) => (
          <section key={s.h}>
            <h2 className="subheading">{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}
        <a href={`/${lang}`} className="btn btn--ghost">
          ← {t.privacy.back}
        </a>
      </main>
      <Footer dict={t.footer} nav={t.nav} lang={lang} />
    </>
  );
}
