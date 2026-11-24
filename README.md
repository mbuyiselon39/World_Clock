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
