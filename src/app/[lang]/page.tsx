import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale, localeTags, siteUrl } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { company, media } from "@/lib/media";
import Nav from "@/components/Nav";
import HeroVideo from "@/components/HeroVideo";
import SectionLabel from "@/components/SectionLabel";
import ProductCta from "@/components/ProductCta";
import QuoteForm from "@/components/QuoteForm";
import Footer from "@/components/Footer";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = await getDictionary(lang);
  const products = [
    { id: "epal", product: "epal", image: media.products.epal, ...t.products.items.epal },
    { id: "collars", product: "collars", image: media.products.collars, ...t.products.items.collars },
  ] as const;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#org`,
        name: company.name,
        url: siteUrl,
        email: company.email,
        telephone: company.phone,
        areaServed: ["DE", "AT", "PL", "CZ", "SK"],
      },
      ...products.map((p) => ({
        "@type": "Product",
        name: p.name,
        description: p.description,
        image: p.image,
        brand: { "@type": "Brand", name: "EPAL" },
        seller: { "@id": `${siteUrl}/#org` },
      })),
      {
        "@type": "FAQPage",
        inLanguage: localeTags[lang],
        mainEntity: t.faq.items.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Nav dict={t.nav} lang={lang} />

      <main>
        {/* Hero */}
        <section className="hero" aria-label={t.hero.title}>
          <HeroVideo src={media.hero.video} poster={media.hero.poster} />
          <div className="hero__shade" aria-hidden />
          <div className="hero__inner">
            <div className="hero__copy">
              <h1 className="display hero__title">{t.hero.title}</h1>
              <p className="hero__sub">{t.hero.subtitle}</p>
              <div className="btn-row">
                <a href="#quote" className="btn btn--light">{t.hero.cta}</a>
                <a href="#products" className="btn btn--ghost-light">{t.hero.secondary}</a>
              </div>
            </div>
          </div>
        </section>

        {/* Intro + stats */}
        <section className="section container intro">
          <SectionLabel>{t.intro.label}</SectionLabel>
          <div className="split">
            <h2 className="display">{t.intro.title}</h2>
            <p className="lead">{t.intro.body}</p>
          </div>
          <dl className="stats">
            {t.intro.stats.map((s) => (
              <div key={s.label} className="stat">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Products */}
        <section id="products" className="section container">
          <SectionLabel>{t.products.label}</SectionLabel>
          <div className="split">
            <h2 className="display">{t.products.title}</h2>
            <p className="lead">{t.products.intro}</p>
          </div>
          <div className="products">
            {products.map((p) => (
              <article key={p.id} className="product" id={`product-${p.id}`}>
                <div className="product__media">
                  <Image
                    src={p.image}
                    alt={p.imageAlt}
                    fill
                    sizes="(max-width: 900px) 100vw, 50vw"
                  />
                </div>
                <div className="product__body">
                  <h3 className="heading">{p.name}</h3>
                  <p className="product__tagline">{p.tagline}</p>
                  <p>{p.description}</p>
                  <SectionLabel as="h4">{t.products.specsLabel}</SectionLabel>
                  <dl className="specs">
                    {p.specs.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <ProductCta product={p.product}>{t.products.cta}</ProductCta>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Why us */}
        <section id="why" className="section container">
          <div className="why">
            <div className="why__media">
              <Image src={media.why} alt={t.why.imageAlt} fill sizes="(max-width: 900px) 100vw, 50vw" />
            </div>
            <div>
              <SectionLabel>{t.why.label}</SectionLabel>
              <h2 className="display">{t.why.title}</h2>
              <ol className="why__list">
                {t.why.items.map((item, i) => (
                  <li key={item.title}>
                    <span className="why__num">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="subheading">{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="section container">
          <div className="faq">
            <div>
              <SectionLabel>{t.faq.label}</SectionLabel>
              <h2 className="display">{t.faq.title}</h2>
            </div>
            <div className="accordion">
              {t.faq.items.map((f, i) => (
                <details key={f.q} name="faq" open={i === 0}>
                  <summary>
                    <span>{f.q}</span>
                    <span className="accordion__icon" aria-hidden />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Quote */}
        <section id="quote" className="section quote">
          <div className="container quote__grid">
            <div className="quote__intro">
              <SectionLabel light>{t.quote.label}</SectionLabel>
              <h2 className="display">{t.quote.title}</h2>
              <p className="lead">{t.quote.intro}</p>
              <ul className="trust">
                {t.quote.trust.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              <p className="quote__direct">
                <a href={`mailto:${company.email}`}>{company.email}</a>
                <br />
                <a href={`tel:${company.phone.replace(/\s/g, "")}`}>{company.phone}</a>
              </p>
            </div>
            <QuoteForm dict={t.quote} lang={lang} />
          </div>
        </section>
      </main>

      <Footer dict={t.footer} nav={t.nav} lang={lang} />
    </>
  );
}
