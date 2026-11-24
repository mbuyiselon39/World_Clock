# World Clock

A responsive world-clock dashboard for comparing local times across cities. The site is intended to be hosted at **https://worldclock.calculatorflash.com/**.

## Features

- Live digital and analog clocks, local dates, and differences from your device's time zone. Time zone and daylight-saving calculations use the browser's `Intl` API.
- Add or remove locations, give them custom labels, and mark favorites. Clocks, favorites, and the theme are saved in browser storage when available.
- Interactive Leaflet map with markers for the locations in the selector. Clocks remain usable if the map library cannot load.
- Light and dark themes, responsive layouts, and keyboard-accessible controls.

## Run locally

This is a static site; no build step is required. Serve the repository root with any static web server, for example:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000/`. The map, map tiles, fonts, and icons require internet access. The clock calculations use your device's system time and its time-zone database.

## Deployment and SEO

Publish the repository root to the subdomain over HTTPS, ensuring `index.html`, `style.css`, `script.js`, `favicon.svg`, `robots.txt`, and `sitemap.xml` are served at the domain root. The canonical URL, Open Graph URL, and sitemap are configured for `https://worldclock.calculatorflash.com/`; update them if the deployment address changes. Submit the sitemap to search engines after deployment. Search indexing and ranking are not guaranteed.

The interactive map uses Leaflet and OpenStreetMap tiles, with attribution shown on the map. Respect the OpenStreetMap tile usage policy when deploying at scale.

## Planning and location intelligence

The meeting finder ranks one-hour slots on the chosen reference-city date by how many saved locations are within weekday 09:00–17:00 hours. It does not check individual availability or holidays. The converter accepts a departure local date/time and elapsed flight duration, handles time-zone changes along the way, and rejects nonexistent or ambiguous DST wall times rather than guessing. Clock day/night labels and the optional map overlay are approximate solar-position estimates, not navigation tools.

City insights are loaded on demand directly from third-party services: [Open-Meteo](https://open-meteo.com/) for forecasts, sunrise/sunset and air quality; [Nager.Date](https://date.nager.at/) for national public holidays; [Frankfurter](https://www.frankfurter.app/) for exchange rates; [GDELT](https://www.gdeltproject.org/) for regional news search results; and [The Space Devs](https://thespacedevs.com/) for upcoming launches. Browser access, coverage, freshness, rate limits and CORS depend on each provider; unavailable data is reported in the interface. These requests disclose the chosen city's coordinates or country to the relevant provider. The news and event feeds are not curated or exhaustive.

Market indicators represent regular weekday hours only, not holidays, early closures or live exchange status. Potential long weekends assume a Saturday/Sunday weekend and do not account for local work patterns. School terms, golden hours, seasonal daylight comparisons, sports fixtures, election events, severe-weather alerts, country-specific emergency numbers and visa rules are not currently integrated; official resource links are provided where appropriate. Always verify critical travel, weather, safety and financial information with the relevant authorities. No account or server-side storage is used.

Run the calculation tests with `node tests/planning.test.js`.
