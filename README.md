# WorldScope

WorldScope combines world clocks, travel and meeting planning, and location insights in a responsive dashboard. The site is intended to be hosted at **https://worldscope.calculatorflash.com/**.

## Features

- Live digital and analog clocks, local dates, and differences from your device's time zone. Time zone and daylight-saving calculations use the browser's `Intl` API.
- Add or remove locations, give them custom labels, and mark favorites. Clocks, favorites, and the theme are saved in browser storage when available.
- Interactive Leaflet map with markers for the locations in the selector. Clocks remain usable if the map library cannot load.
- Light and dark themes, responsive layouts, and keyboard-accessible controls.

## Run locally

This is a static site generated with Eleventy. Install dependencies and build, then serve the generated directory:

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory _site
```

Visit `http://localhost:8000/`. The map, map tiles, fonts, and icons require internet access. The clock calculations use your device's system time and its time-zone database.

## Deployment and SEO

Publish the generated `_site/` directory to the subdomain over HTTPS; configure your host to run `npm ci && npm run build` and publish `_site`. The canonical URL, Open Graph URL, and sitemap are configured for `https://worldscope.calculatorflash.com/`; update them if the deployment address changes. Submit the sitemap to search engines after deployment. Search indexing and ranking are not guaranteed.

The interactive map uses Leaflet and OpenStreetMap tiles, with attribution shown on the map. Respect the OpenStreetMap tile usage policy when deploying at scale.

## Planning and location intelligence

The meeting finder ranks one-hour slots on the chosen reference-city date by how many saved locations are within weekday 09:00–17:00 hours. It does not check individual availability or holidays. The converter accepts a departure local date/time and elapsed flight duration, handles time-zone changes along the way, and rejects nonexistent or ambiguous DST wall times rather than guessing. Clock day/night labels and the optional map overlay are approximate solar-position estimates, not navigation tools.

City insights are loaded on demand directly from third-party services: [Open-Meteo](https://open-meteo.com/) for forecasts, sunrise/sunset and air quality; [Nager.Date](https://date.nager.at/) for national public holidays; [Frankfurter](https://www.frankfurter.app/) for exchange rates; [GDELT](https://www.gdeltproject.org/) for regional news search results; and [The Space Devs](https://thespacedevs.com/) for upcoming launches. Browser access, coverage, freshness, rate limits and CORS depend on each provider; unavailable data is reported in the interface. These requests disclose the chosen city's coordinates or country to the relevant provider. The news and event feeds are not curated or exhaustive.

Market indicators represent regular weekday hours only, not holidays, early closures or live exchange status. Potential long weekends assume a Saturday/Sunday weekend and do not account for local work patterns. School terms, golden hours, seasonal daylight comparisons, sports fixtures, election events, severe-weather alerts, country-specific emergency numbers and visa rules are not currently integrated; official resource links are provided where appropriate. Always verify critical travel, weather, safety and financial information with the relevant authorities. No account or server-side storage is used.

Run the calculation tests with `node tests/planning.test.js`.

## Worldwide city search and sports calendar

Use **Search cities worldwide** to look up cities and towns in Open-Meteo's GeoNames-based geocoding service. Search results include region, country and time zone for disambiguation. Coverage is determined by that provider, so this is not a guarantee that every settlement is available. Search terms are sent to Open-Meteo; saved selections, including coordinates and country, remain in browser storage. Multiple cities in the same time zone can be saved independently; existing saved clocks retain their old time-zone identities. The original offline city list remains available. Weather and map coordinates for a searched location come from its search result. For searched cities, country currency information is requested from REST Countries when insights are loaded; exchange-rate and holiday coverage still depends on each provider.

The sports calendar tracks the named 2027–2028 editions, including AFCON and the Rugby World Cup. It resolves their English Wikipedia pages to Wikidata entities and retrieves structured start/end/point-in-time and host location claims in the browser. It loads when requested, can be refreshed manually, and refreshes every six hours while the page is visible after the initial request. Results include retrieval time, source and organiser links; unavailable fields are shown explicitly. Wikidata is community-maintained and may be incomplete or stale, and dates are calendar dates, not confirmed kickoff times. Always check the organisers for authoritative changes. The tracked list is fixed to these editions, not a comprehensive or automatically advancing list of all future events. In particular, previously circulated tournament dates can change and are not hard-coded as fact.

Tests: `node tests/planning.test.js` and `node tests/discovery.test.js`. City search and sports adapters require browser network access to Open-Meteo, Wikipedia and Wikidata; country currency lookup uses REST Countries. Requests are made directly from the visitor's browser and are subject to provider availability, CORS, and rate limits.

### Domain migration

This repository is a static site: there is no application backend or server-side domain configuration to update. To complete the move, configure DNS and HTTPS for `worldscope.calculatorflash.com` in your hosting provider, publish the site there, and configure a permanent redirect from `worldclock.calculatorflash.com` to the corresponding URL on the new host. Verify the new origin before enabling redirects and submit its sitemap to search engines. These hosting and DNS changes are not performed by the repository.

Browser storage is scoped to an origin. Existing clocks and theme preferences on `worldclock.calculatorflash.com` will not automatically transfer to `worldscope.calculatorflash.com`; users will need to recreate them unless a separate, consent-based migration mechanism is deployed. No storage keys or third-party API endpoints were changed by the rebrand.

## Dashboard preferences and backups

Use the dashboard's 12/24-hour selector to change the digital clock format. This preference is stored on the current origin when browser storage is available. Export creates a local JSON backup of saved clocks, labels, favorites and searched-city metadata. Import validates the file and asks for confirmation before replacing the current clock list; it does not change the theme or time format. Backups can contain personal labels and locations, so share them carefully. No backup data is sent to WorldScope or any server. A backup can also be exported on the old origin and imported on the new one if both deployments include this feature.

The fixed navigation adapts its offset to the actual header height. The static, visible time-zone guide and WebSite/WebApplication metadata help crawlers understand the page; `social-card.png` is used for social previews. Publish the complete generated `_site/` directory including `dashboard.js` and `social-card.png`. Confirm DNS and redirects, test production pages and robots rules with search-engine tools, and submit the sitemap after deployment. Search indexing, social previews, and AI citations depend on third-party systems and cannot be guaranteed by markup alone.

Run `node tests/dashboard.test.js` to check backup validation, in addition to the planning and discovery tests.

## World atlas and learning resources

The World Atlas retrieves countries and territories from REST Countries in the browser when requested, with region filters, country and capital search, pagination, flags and coats of arms when supplied, and a link to search for cities in that country. Regions and symbols are provider classifications, not a statement about sovereignty; population is a provider estimate whose reference year may vary. A refresh retrieves new provider data and the page reports the retrieval time. If the service is unavailable, the directory reports this and existing clock functions still work. The browser sends the request to REST Countries; country symbols may be fetched from image hosts supplied by that service.

City search queries Open-Meteo's GeoNames-based index by name and filters the first 100 results by country when selected. This does not constitute a complete inventory of every city or settlement; coverage, time-zone availability and results are provider-dependent. The geography panel provides an introductory continent guide, while the learning panel links to public resources in education, science, technology, physics and nature. Forbes is linked as an external source for billionaire rankings: WorldScope does not reproduce an automatically updated top-100 list or infer a person's nationality or coat of arms. Rankings and wealth estimates change and require a reliable, licensed data source for direct integration.

The navigation stays fixed while scrolling, and can be horizontally scrolled at narrower widths. SEO metadata retains the `https://worldscope.calculatorflash.com/` canonical origin; indexing and worldwide visibility cannot be guaranteed. Publish the complete generated `_site/` directory. Run `node tests/atlas.test.js` along with the existing test suites to check the country adapter. Live REST Countries and Open-Meteo access requires a browser connection and depends on provider CORS, availability, coverage and terms.

## Static migration and meeting sharing

Eleventy builds the existing dashboard unchanged in `_site/index.html` alongside prerendered city, country, guide and information routes. The seed catalog in `data/cities.json` is derived from the existing dashboard city list, not an exhaustive GeoNames import. The build is deterministic and does not require network access. `npm run refresh:data` optionally retrieves a REST Countries snapshot to `data/country-snapshot.json`; it validates the response and leaves the old snapshot untouched on failure. Review and commit the snapshot before deployment. The initial snapshot is empty; country facts beyond the existing seed remain unavailable until refreshed. No GeoNames or holiday build-time importer is included yet.

The existing meeting finder now provides per-slot `.ics` export, invite text and a shareable URL. A shared link contains city labels, zones and the exact instant; anyone with the link can read them. Opening it displays a read-only snapshot and does not modify saved clocks. The calendar event is one hour in UTC and does not check availability or holidays. The existing clock backup format is unchanged. The map, country directory and sports feed are now loaded on user request.

See `docs/architecture-and-roadmap.md` for the migration plan, limitations, deployment counts, validation report and 90-day roadmap. The generated static routes require publishing `_site`, not just the repository root.
