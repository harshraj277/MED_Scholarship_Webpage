# Yojana Setu — योजना सेतु

> The bridge between you and central government health schemes.

Yojana Setu is a client-side web application that helps users find central
government health and medical schemes that fit their situation. It explains
**who can apply, what is covered, and where to apply** — no jargon, no sign-up.

Built as a CEP (Community Engagement Project) at **Modern Education Society's
College of Engineering, Pune**.

## Features

- **Find a scheme** — search by name or topic (try "dialysis", "delivery", "PM-JAY")
- **89 central schemes** — with coverage, eligibility and the official link for each
- **Honest provenance** — records checked against official sources are badged
  *Verified*; the rest carry a **Needs verification** badge and a per-record
  note, so an unconfirmed figure is never presented as fact
- **Filter by audience** — low-income family, mother-to-be, child, employee/pensioner,
  senior citizen, patient with a long-term illness
- **Filter by age group** — children (0–17), adults (18–59), seniors (60+), seniors 70+
- **Filter by gender** — show only the schemes a woman or a man can actually use
  (JSY, PMSMA, MAA, MHS and PMMVY are women-only; every other scheme is open to all)
- **Filter by income** — type your monthly household income (₹); schemes with
  income limits are shortlisted automatically (ADIP ≤ ₹30,000/month,
  ESIC wages ≤ ₹21,000/month, NFSA ≤ ₹10,000/month). Only 10 of the 89 schemes
  have an income test at all, so a banner tells you when a visible result rests
  on an approximate BPL/SECC threshold rather than a published figure
- **Filter by ministry and kind of scheme** — narrow by the parent ministry or by
  the kind of help (health insurance, cash assistance, free medicines & tests,
  primary care, screening & prevention, immunisation, nutrition, mental health,
  emergency & accident care, rehabilitation & devices, tele-health & digital
  records, AYUSH medicine, quality & awareness)
- **Collapsible filter panel** — all filter controls live behind a **Filters**
  toggle that expands and contracts, so the finder stays compact and search
  always stays visible. It starts collapsed, remembers whether you left it open
  (in `localStorage`), shows a live count of active filters, and makes the
  collapsed controls `inert` so keyboard focus skips them
- **Filter and sort** — by type of help, segmented status control (All / Active /
  Legacy), and sort order
- **Scheme details** — each card opens a dialog with coverage, eligibility, features,
  ministry and the official website link (with inline icons)
- **Save schemes** — bookmark schemes (persisted in `localStorage`)
- **Compare up to 3 schemes** — side-by-side table from the fixed bottom tray
- **Accessibility & UX** — light/dark theme, text-size control (A+), keyboard focus
  outlines, skip link, screen-reader labels, reduced-motion support
- **Polished UI** — gradient hero with rotating gold rings and CTA, category-coloured
  card accents, hover lift, animated skeletons while data loads, sticky-header blur
  on scroll, animated toast, footer quick links, and a print stylesheet

## Tech stack

- Plain **HTML5**, **CSS3** (custom properties, no framework)
- **Vanilla JavaScript (ES5-compatible)** — works in every modern browser
- **JSON** data file — schemes are data, not markup
- **localStorage** for saved schemes, theme and text-size preferences
- Google Fonts: *Bricolage Grotesque* + *Hind*

No build step, no dependencies, no backend.

## Project structure

```
Karan_CEP\
├── index.html              # page markup (no inline CSS/JS/data)
├── README.md
├── tools\
│   └── build-schemes.js    # optional: regenerates schemes.json from datas/ (see below)
├── assets\
│   ├── css\
│   │   ├── base.css        # reset, design tokens, typography, utilities
│   │   ├── components.css  # all component styles
│   │   ├── themes.css      # dark theme overrides (loaded last)
│   │   └── print.css       # print/paper-friendly styles
│   ├── js\
│   │   └── app.js          # all application logic
│   ├── data\
│   │   └── schemes.json    # the 89 scheme records
│   └── img\
│       ├── logo.webp       # brand emblem / hero image
│       └── institution.webp# institution logo (footer)
└── datas\                  # git-ignored scratch: source data + build inputs
```

## How to run

The app fetches `assets/data/schemes.json`, so **open it over HTTP**, not by
double-clicking the file (browsers block `fetch()` on `file://`).

```bash
# Option 1 – Python
python -m http.server 8000
# then open http://localhost:8000

# Option 2 – Node
npx serve .

# Option 3 – any static host
# Drag the folder onto Netlify / Vercel / GitHub Pages
```

## How the filtering works

`app.js` loads the JSON, builds the category dropdown and audience chips, then
re-renders the grid on every input. Cards are built as safe HTML strings (all
data is HTML-escaped). Filters are combined with AND; results are paginated
9 per page with Previous/Next controls. Every loaded record is passed through a
`normalise()` step, so a hand-edited data file with missing fields degrades
gracefully instead of throwing inside a filter.

## Adding or editing a scheme

Open `assets/data/schemes.json` and add or edit an object:

```json
{
  "id": "PM-SOME-SCHEME",
  "name": "Full scheme name",
  "short_name": "SHORT",
  "category": "Health Infrastructure",
  "ministry": "Ministry of ...",
  "implementing_body": "Optional body",
  "launch_year": 2026,
  "scheme_type": "Raw administrative classification",
  "help_type": "Primary care & hospitals",
  "status": "active",
  "description": "One or two sentences.",
  "coverage_amount": "What it gives.",
  "eligibility": "Who can use it.",
  "target_beneficiaries": "Who it is meant for.",
  "official_website": "https://example.gov.in",
  "key_features": ["Feature 1", "Feature 2"],
  "audience": ["family"],
  "age_group": ["all"],
  "gender": ["all"],
  "income_max_annual": 120000,
  "income_note": "Optional. Explains what the cap actually is.",
  "verified": false,
  "notes": "Anything the reader should know about this record."
}
```

Valid `audience` values: `family`, `mother`, `child`, `worker`, `senior`, `patient`.
Use `[]` for schemes that are **not a direct citizen benefit** — facility funding,
quality awards and professional registries (PM-ABHIM, PMSSY, ABDM, NAM, Kayakalp,
HPR, NHCX). An empty list matches no audience chip on purpose.

Valid `age_group` values: `all` (no age restriction), `child` (0–17), `adult`
(18–59), `senior` (60+), `senior70` (70+). Use `"all"` when the scheme serves
every age.

Valid `gender` values: `all` (open to everyone), `female`, `male`. Use
`["all"]` unless the scheme pays a benefit to one gender specifically — currently
JSY, PMSMA, MAA, MHS and PMMVY are `["female"]`. A record with no `gender` key is
treated as `["all"]`.

`income_max_annual` is the maximum household income per year in rupees, used by
the income filter (the app compares `monthly input × 12` against it). Use `null`
when the scheme genuinely has no income test — the UI then says
"No income test" rather than implying an unstated limit.

**Only 10 of the 89 records carry a cap, and that is the honest number.** Most
central health schemes are universal (anyone at a public facility) or gated by
category rather than income (occupation, disability certificate, BPL list
membership). Padding this field out would mean inventing ceilings.

`income_note` is the companion field that keeps the filter honest. For schemes
whose real test is a **list, not a rupee figure** — BPL, SECC 2011 — the cap is
an approximation of that threshold, so the note says so and the UI renders
"Up to ₹X per year **(approximate)**". Whenever an income filter is active, a
banner counts how many visible results rest on an approximation.

| Scheme | Cap | Basis |
|---|---|---|
| ADIP | ₹3,60,000 | **Exact** — ₹30,000/month ceiling, revised 26 Sep 2024 |
| ESIC | ₹2,52,000 | **Exact** — ₹21,000/month wage ceiling |
| NFSA, Fortified Rice | ₹1,20,000 | **Approximate** — Priority Household ₹10,000/month |
| PM-JAY | ₹1,20,000 | **Approximate** — SECC 2011 category, no rupee figure |
| RAN, PMNDP, HMDG, RSBY, Niramaya | ₹1,00,000 | **Approximate** — BPL list membership |

`category` must have an entry in `CAT_COLORS` in `app.js`, or the card silently
falls back to flat navy.

`verified: true` means the record was checked against the ministry's official
portal on **10 September 2026**. `verified: false` renders a **Needs
verification** badge on the card, plus the `notes` text in the detail dialog.

`help_type` drives the "Kind of scheme" filter and must be one of the 13 values
in `HELP_TYPES` in `tools/build-schemes.js`. Keep the raw administrative
classification in `scheme_type` — it is shown in the detail dialog but is too
noisy to filter on (the source data had 29 values, one of which covered 23
schemes).

A scheme matches the age and gender filters when its list contains `"all"`
**or** the selected value. Universal schemes therefore appear under every age
group and for every gender. A non-`active` status is shown as
**Legacy · no longer enrolling**.

## Regenerating the dataset

`assets/data/schemes.json` is generated, not hand-maintained. To rebuild it:

```bash
node tools/build-schemes.js
```

The script merges `datas/source/health_schemes_expanded.json` (104 records,
including state schemes) with `datas/schemes_verified_23.json` (the 23
official-source records) and encodes the editorial decisions in one place:

- verified wording wins over the source file's rewritten text;
- the 15 **state** schemes are dropped (this project is central-scope);
- `MI-IMI`, `RSBY-LEGACY` and `AYUSH-NAM` are aliases of the existing `MI`,
  `RSBY` and `NAM`, not new schemes;
- category and ministry strings are normalised so no dropdown splits one idea
  across two labels;
- new records get curated `audience` / `age_group` / `gender` /
  `income_max_annual` / `help_type` values from a lookup table — a record with
  no curation entry is **skipped**, never shipped with dead filters;
- `WEBSITE_FIX`, `IMPL_FIX`, `INCOME_OVERRIDE` and `INCOME_NOTES` record
  corrections applied after checking the source against official portals (ADIP's
  income ceiling, AMRIT's nodal agency, DEPwD deep links), with the reasoning
  inline;
- every link is audited — any domain that is neither `.gov`/`.nic` nor on the
  `NON_GOV_ALLOWED` allow-list **fails the build**, so a typo'd or hijacked URL
  cannot slip in;
- output is validated (unique ids, required fields, known enum values) and the
  build fails loudly rather than writing a broken file.

Because `datas/` is git-ignored, a fresh clone has no build inputs — copy the
source file back in or just edit `assets/data/schemes.json` directly. The app
never needs the script; it only loads the JSON.

## Data sources & disclaimer

- **23 schemes** were compiled from official government sources and verified on
  **10 September 2026** — these are badged *Verified*.
- **66 further schemes** were added on **4 October 2026** from compiled public
  sources and are **not** live-verified. Every one carries a *Needs
  verification* badge and a per-record note. Treat their amounts and eligibility
  rules as a starting point, not a fact.
- The dataset covers **central** government schemes only. State schemes
  (Aarogyasri, CMCHIS, MJPJAY and 12 others) are deliberately excluded.
- **This is not an official government portal.** Amounts and eligibility change;
  always confirm details on each scheme's official website before applying.

## Acknowledgements

- Scheme information from the respective ministries / official portals
- Icons and branding created for this project
- Built as a CEP project for Modern Education Society's College of Engineering, Pune