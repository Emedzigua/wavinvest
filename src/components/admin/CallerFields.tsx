import { countryLabel } from "@/lib/admin/prospects";
import { uiLangLabel, type UiLang } from "@/lib/caller/texts";

const COUNTRIES = ["PL", "SK", "CZ", "HU", "AT", "DE", "LT", "LV"];

// Name, countries and screen language, shared by the new and edit forms
export default function CallerFields({
  name = "",
  countries = [],
  language = "sk",
}: {
  name?: string;
  countries?: string[];
  language?: UiLang;
}) {
  return (
    <>
      <label className="field">
        <span>Meno a priezvisko</span>
        <input name="name" defaultValue={name} maxLength={80} required />
      </label>
      <fieldset className="field caller-countries">
        <legend>Krajiny, ktorým volá</legend>
        <div className="outcomes">
          {COUNTRIES.map((c) => (
            <label key={c} className="outcome">
              <input type="checkbox" name="countries" value={c} defaultChecked={countries.includes(c)} />
              {countryLabel[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field field--narrow">
        <span>Jazyk obrazovky</span>
        <select name="language" defaultValue={language}>
          {Object.entries(uiLangLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small">Text, čo povedať do telefónu, sa ukáže vždy v jazyku krajiny, ktorej firme práve volá.</p>
    </>
  );
}
