# WorldScope static migration: architecture and roadmap

## Approach and scope

Eleventy generates ordinary HTML and CSS at build time. The existing dashboard remains the root document, with on-demand loading and sharing improvements, and keeps its client-side tools, localStorage keys and clock backup schema. The new `/time/`, `/country/`, `/guides/` and `/info/` routes are linked from the dashboard and work without JavaScript for their editorial content. City clocks and offset-change checks are small browser scripts using `Intl`; time-zone rules come from the runtime's IANA data, not a server. The map, atlas directory and sports data are loaded upon request. There are no accounts, server functions, databases, or paid backend services.

The initial checked-in catalog is a **29-city seed from the existing dashboard**, not a global city dataset. It generates 29 city and 24 country/territory pages, plus 12 hubs, guides, information pages and the root: **65 HTML URLs and 84 output files** in the tested build. Build output is generated, not committed: sample routes are `/time/johannesburg/`, `/country/south-africa/` and `/guides/time-zones-explained/`. `npm ci && npm run build` recreates them in `_site/`. The city pages are an initial template, not a claim that 5,000 pages are ready or sufficiently differentiated for indexing. The bundled country snapshot is derived from the ODbL-licensed mledoze/countries dataset. The optional `npm run refresh:data` refreshes it from GitHub and leaves existing data untouched on failure. No network is required for a normal build. No GeoNames or Nager.Date snapshot importer is implemented yet.

To reach 5,000+ useful pages, review a licensed, geocoded city dataset, establish stable collision-safe slugs, source attribution, editorial thresholds, country/continent hubs and internal links, and generate only locations with sufficient unique verified content. Budget one HTML file per route: 5,000 city + roughly 250 country + roughly 100 other pages/assets is about 5,350 files, below a 20,000-file example host limit, subject to actual host limits and asset counts. Split sitemaps once any type approaches 50,000 URLs; the present build validator rejects a type over that limit rather than automatically splitting it.

## Data and correctness

City zones and approximate coordinates are inherited from the existing manually curated dashboard; they are not independently verified. City pages compute the current UTC offset and search for an offset change in the next 550 days using browser `Intl` data. This is not a guarantee of future rules. The country page's seed currency is not a live exchange rate. The mledoze/countries snapshot records its source revision and retrieval time; the ingestion is deliberately manual and optional. External data, local clock accuracy, browser time-zone updates, provider coverage, and legal/financial/safety facts must be verified independently. No automated city sunrise/sunset, holiday snapshots, nearby cities, DST calendar, translation, or climate data is claimed in these new pages.

`.ics` files use a UTC instant and one-hour duration; copied invites include each city’s formatted local time. The share URL is a read-only snapshot containing labels, zones and the instant; it does not add saved clocks. Users should only share it with intended recipients. No voting, accounts or background reminders are provided. Existing meeting rankings still use 09:00–17:00 weekdays and do not check holidays or personal availability.

## Validation report (local build)

- `npm test`: planning, city/sports discovery, dashboard backup, atlas, IANA DST/offset transitions, meeting ranking, `.ics` escaping/line folding and share validation pass.
- `npm run build`: 29 city pages; sitemap targets exist, canonical origin is checked, and output is 83 files. The validation rejects duplicate city slugs and sitemaps over 50,000 entries.
- XML parser: sitemap index plus three type sitemaps parse successfully; counts 29 city, 24 country, 12 general URLs. Sitemap has no fabricated `lastmod`.
- JSON parser: 119 JSON-LD blocks parsed in generated HTML. This checks syntax, **not** Google Rich Results eligibility or schema correctness; Place, Country, BreadcrumbList, WebSite and WebApplication are provided. FAQPage and Event are not claimed without the corresponding reviewed pages.
- No browser automation, production crawl, Lighthouse/Core Web Vitals, schema.org/Rich Results external validation, accessibility audit or real-provider connectivity test was performed. The targets LCP <2.5s, CLS <0.1 and INP <200ms are goals, not measured results. `_headers` is supported only on compatible hosts; unversioned assets use a conservative one-hour cache, not `immutable`.
- `_site/` must be deployed. Verify DNS/TLS, redirects, response status codes, sitemap and Search Console after launch; search indexing and rankings are not guaranteed. Review the privacy and terms drafts with the owner and legal counsel before publishing. The contact page points to the existing public repository's issue tracker rather than inventing a contact email.

## 90-day roadmap (proposed, not completed)

### Days 1–30: migration and data foundations

Deploy the static build to a staging host; browser-test all existing features, links, accessibility and storage migration. Validate licensed GeoNames/country/IANA data, design a snapshot schema and collision-safe URLs, expand country and city pages only when meaningful unique facts are available, and add country/continent hubs. Add Nager.Date holiday snapshots with provenance, source dates and graceful fallbacks. Add sitemap partitioning and host-limit checks. Measure Web Vitals on real devices and validate structured data and crawlability with external tools before publishing.

### Days 31–60: guides and planning

Editorially review the existing guides and publish DST-by-country and multi-zone planning guides with cited, date-specific data. Add meeting pairs and multi-city pages from reviewed combinations, holiday-aware adjustable hours, Google/Outlook calendar links, a jet-lag planning aid and country DST `.ics` calendars. Extend URL sharing for full planner state while retaining explicit privacy notices and no voting or accounts. Test ambiguous and skipped DST times across hemispheres.

### Days 61–90: international rollout and offline

Pilot two human-reviewed language routes with locale-specific content, canonical/hreflang validation and RTL support where needed; then expand after quality review. Prototype static embeddable clock/converter widgets with attribution and accessibility review. Add an opt-in PWA/service worker with versioned caching and offline testing, and assess local reminders without promising background delivery. Before ads or affiliate links, obtain appropriate legal review and a compliant consent mechanism; reserve layout space and clearly label affiliate relationships. Add snapshot/TTL strategies, opt-in earthquake/weather overlays and source-backed sports pages only where data rights and CORS permit. Never promise live scores or exhaustive coverage.
