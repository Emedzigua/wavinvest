import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { company } from "@/lib/media";
import Logo from "./Logo";
import CookieSettingsButton from "./CookieSettingsButton";

// Cached at build time, refreshed whenever the site is rebuilt
async function currentYear() {
  "use cache";
  return new Date().getFullYear();
}

export default async function Footer({
  dict,
  nav,
  lang,
}: {
  dict: Dictionary["footer"];
  nav: Dictionary["nav"];
  lang: Locale;
}) {
  const home = `/${lang}`;
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Logo className="logo--lg" />
          <p className="footer__tagline">{dict.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <a href={`${home}#products`}>{nav.products}</a>
          <a href={`${home}#why`}>{nav.why}</a>
          <a href={`${home}#faq`}>{nav.faq}</a>
          <a href={`${home}#quote`}>{nav.cta}</a>
        </nav>
        <div>
          <p className="footer__head">{dict.contact}</p>
          <a href={`mailto:${company.email}`}>{company.email}</a>
          <a href={`tel:${company.phone.replace(/\s/g, "")}`}>{company.phone}</a>
          <span>{company.address}</span>
        </div>
        <div>
          <p className="footer__head">{dict.legal}</p>
          <a href={`${home}/privacy`}>{dict.privacy}</a>
          <CookieSettingsButton>{dict.cookies}</CookieSettingsButton>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>
          © {await currentYear()} {company.name}. {dict.rights}
        </span>
      </div>
    </footer>
  );
}
