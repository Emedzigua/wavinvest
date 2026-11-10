# Prospect database

Companies that may buy pallets every month, in PL, SK, CZ, HU and AT. They show up in the admin under **Prospekty**.

**Source:** OpenStreetMap through the Overpass API. The data is © OpenStreetMap contributors under the ODbL licence, so it may be stored and reused with attribution. Don't scrape Google Maps: its terms forbid both scraping and storing the data.

## 1. Download (one file per country)

```bash
mkdir -p data/osm data/places
for c in PL SK CZ HU AT; do
  q="[out:json][timeout:600];area[\"ISO3166-1\"=\"$c\"][admin_level=2]->.a;(nwr[\"industrial\"][\"name\"](area.a);nwr[\"man_made\"=\"works\"][\"name\"](area.a);nwr[\"building\"~\"^(warehouse|industrial|factory)\$\"][\"name\"](area.a);nwr[\"shop\"=\"wholesale\"][\"name\"](area.a);nwr[\"office\"=\"logistics\"][\"name\"](area.a);nwr[\"landuse\"=\"industrial\"][\"name\"](area.a););out center tags;"
  curl -s -m 600 --data-urlencode "data=$q" https://overpass-api.de/api/interpreter -o "data/osm/$c.json"
  q="[out:json][timeout:300];area[\"ISO3166-1\"=\"$c\"][admin_level=2]->.a;node[\"place\"~\"^(city|town|village|suburb)\$\"][\"name\"](area.a);out qt;"
  curl -s -m 320 --data-urlencode "data=$q" https://overpass-api.de/api/interpreter -o "data/places/$c.json"
  sleep 5
done
```

Overpass sometimes answers 502 or 429 when it's busy. Wait a minute and run the failed country again. The place files are optional: they fill in the nearest town when a company has no address.

## 2. Clean and score

```bash
python3 scripts/build-prospects.py data/osm data/prospects.json data/places
```

The script:

- drops parks, utilities, services, schools, quarries and similar non-buyers;
- removes duplicates;
- sorts companies into sectors;
- gives each company a score: how likely its sector is to need pallets (up to 40), how close it is to the Rzeszów or Andrychów depot (up to 40), and whether it has a phone, website or email.

Keep `data/` out of git, because the output is large.

## 3. Import

The import is an upsert on `source_id`, so running it again updates the OSM fields without touching status, notes or call history. It goes through a temporary security-definer function `import_prospects(p_token, p_rows)`:

1. Create the function. It checks the token against a SHA-256 hash in `private.app_secrets`.
2. Run the import:

   ```bash
   IMPORT_TOKEN=... node --env-file=.env.local scripts/import-prospects.mjs data/prospects.json
   ```

3. Drop the function and delete the secret.

The tables are defined in `supabase/migrations/20261110_prospects.sql`.

## Contacting prospects

Phone calls and in-person visits to companies are fine. Marketing email in all five countries needs the recipient's prior consent, so don't send unsolicited bulk email from this list.
