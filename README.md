# MRD Group — corporate website

Static marketing site for MRD Group, a Gaziantep-based group operating in three
sectors: wholesale/market, construction, and energy.

**Status:** demo build. Company details, photography and logo are placeholders
pending client input — see [Placeholder content](#placeholder-content).

## Stack

Plain HTML, CSS and JavaScript. **No build step, no package manager, no
backend.** Open `index.html` through any static file server and the site runs.

Third-party libraries are vendored under `js/vendor/` rather than loaded from a
CDN, so the site renders identically offline and on restricted networks:

| Library | Version | Purpose |
| --- | --- | --- |
| GSAP + ScrollTrigger | 3.12.5 | Scroll-driven chapter progression |
| Lenis | 1.1.14 | Smooth scrolling |

There is no 3D library. The background is a single full-screen fragment shader
written against raw WebGL in `js/scene.js` — one draw call per frame, no
geometry, no per-frame JavaScript work.

Fonts (Newsreader for display, Inter for UI) are self-hosted in `fonts/`,
subset to Latin and Latin Extended so Turkish glyphs render correctly.

## Design direction

Paper, not screen: a warm light ground, near-black ink, a serif display face
and restrained type sizes. The premium impression is carried by whitespace,
typography and material rather than by effects.

The background is a plaster bas-relief drawn by `js/scene.js` — a procedural
height field lit by a lamp that follows the pointer. Moving the mouse sweeps
light across the surface. The relief is masked away from the lower left, so
headlines and body copy always sit on calm paper.

Three rules keep frames cheap and the scroll smooth. They are not stylistic
preferences — breaking any of them reintroduces stutter:

- no `backdrop-filter` (repaints on every scroll frame)
- no `mix-blend-mode` (forces an extra compositing pass)
- animate only `transform`, `opacity` and `clip-path`
- `overflow-x: clip` on `html`/`body`, never `hidden` — `hidden` makes the
  element a scroll container and fights the smooth-scroll library

All frame work runs in a single GSAP ticker, in a fixed order: Lenis integrates
the scroll, ScrollTrigger reads it, the cursor follows, the canvas draws.
Adding a second `requestAnimationFrame` loop anywhere will make them compete.

## Structure

```
index.html          Home — the full three-sector story
market.html         Wholesale / market
insaat.html         Construction
enerji.html         Energy
iletisim.html       Contact
404.html            Self-contained error page
robots.txt          Crawl rules
sitemap.xml         URL list

css/tokens.css      Colour, type, spacing, motion tokens — edit here first
css/base.css        Font faces, reset, typography, layout primitives
css/site.css        Components

js/config.js        Contact details and base URL (single source)
js/main.js          Loader, cursor, header, menu, reveals, the shared ticker
js/scene.js         Raw-WebGL background shader and its chapter moods
js/vendor/          Vendored third-party libraries

img/                Logo mark, social preview image, sector artwork
fonts/              Self-hosted woff2 files
```

## Admin panel (demo)

`panel/index.html` is a standalone tool reachable at `…/mrd-group/panel/`. It
lets an editor add gallery images per sector (market / inşaat / enerji). In this
demo the images are downscaled and stored in the browser's `localStorage`
(`mrd.gallery.<sector>`); the sector pages read that key on load and inject the
images at the front of their gallery (`initGalleryCustom` in `js/main.js`).

Because it is one directory below the site root, `panel/index.html` uses
repo-root asset paths and inlines its own styles — the only file besides
`404.html` allowed to do so.

Demo storage is per-browser. To make uploads persist for every visitor, the
same UI connects to a Git-based CMS once a custom domain and authentication are
in place; only the storage read/write layer changes.

## Path convention

The site is published in a **sub-directory** (`https://<user>.github.io/mrd-group/`),
so every asset reference is relative and starts with `./`. A leading `/` would
resolve against the domain root and break every stylesheet, script and image in
production.

All HTML files live at the repository root — no nested page directories — so the
same `./css/...` prefix is valid on every page.

The single intentional exception is `404.html`, which GitHub Pages serves for
arbitrarily nested missing paths. Its CSS is inlined and its two links use the
repository-root path. **If the repository is renamed, update those two links.**

## Local preview

Any static server works. The site must be served over HTTP — ES modules do not
load from `file://`.

```bash
npx --yes serve .
```

## Deployment

GitHub Pages, served from the `main` branch root. No workflow or build
configuration is required.

If a custom domain is added later, update in this order:

1. `js/config.js` → `SITE.baseUrl`
2. `<link rel="canonical">` and the `og:url` / `og:image` / `twitter:image`
   tags in each HTML file (Open Graph requires absolute URLs)
3. `sitemap.xml` and `robots.txt`
4. `404.html` links

## Gallery photos

`img/gallery/<sector>-01…12.jpg` are self-hosted **sample** photos (retail /
construction / solar) sourced from Unsplash under the Unsplash License (free
commercial use, no attribution required). They are placeholders to show the
carousel with real imagery — replace them with the company's own photos (via
the `/panel` tool or by dropping files into `img/gallery/` with the same names).

## Placeholder content

Everything below is provisional and must be replaced before the site is treated
as final:

- **Contact details** — phone, WhatsApp and e-mail in `js/config.js`. The same
  values also appear as static fallback text inside the HTML so they stay
  visible and crawlable if JavaScript fails; update both.
- **Company identity** — full registered trade name, founding year, street
  address. Structured data in `index.html` and `iletisim.html` carries the same
  values.
- **Logo** — the current mark is typographic: the name set in Newsreader beside
  a bronze rule. See the page header, `img/favicon.svg` and `img/og-image.png`.
- **Sector artwork** — `img/sectors/*.svg` are technical-drawing placeholders,
  not photography.
- **Map** — `iletisim.html` centres on Gaziantep city centre; replace with the
  exact location once the address is known.
- **Figures** — the homepage deliberately states only verifiable facts (three
  sectors, one group, Gaziantep). No invented statistics.

## Accessibility and motion

- All content is real HTML above the canvas; the WebGL layer is decorative and
  marked `aria-hidden`.
- `prefers-reduced-motion` disables the scene, the smooth scroll, the custom
  cursor and every reveal; a static gradient replaces the canvas.
- If WebGL is unavailable, the same gradient fallback is applied automatically.
- Skip link, visible focus rings, and keyboard-operable navigation throughout.

## Licence

Fonts: SIL Open Font License 1.1 (Newsreader, Inter).
GSAP and Lenis: see their respective licences.
Site content and artwork: © MRD Group.
