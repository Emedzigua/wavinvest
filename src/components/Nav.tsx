"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import Logo from "./Logo";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Nav({
  dict,
  lang,
  path = "",
}: {
  dict: Dictionary["nav"];
  lang: Locale;
  path?: string;
}) {
  const [open, setOpen] = useState(false);
  // On sub-pages the section links point back to the homepage
  const home = path ? `/${lang}` : "";
  const links = [
    { href: `${home}#products`, label: dict.products },
    { href: `${home}#why`, label: dict.why },
    { href: `${home}#faq`, label: dict.faq },
    { href: `${home}#quote`, label: dict.contact },
  ];

  return (
    <header className={`nav${open ? " nav--open" : ""}`}>
      <div className="nav__bar">
        <a href={`/${lang}`} className="nav__logo">
          <Logo />
        </a>
        <nav className="nav__links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="nav__actions">
          <LanguageSwitcher lang={lang} label={dict.language} path={path} />
          <a href={`${home}#quote`} className="btn btn--light btn--sm nav__cta">
            {dict.cta}
          </a>
          <button
            type="button"
            className="nav__toggle"
            aria-expanded={open}
            aria-label={open ? dict.close : dict.menu}
            onClick={() => setOpen(!open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
