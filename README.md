# Yojana Setu — योजना सेतु

> The bridge between you and central government health schemes.

Yojana Setu is a client-side web application that helps users find central
government health and medical schemes that fit their situation. It explains
**who can apply, what is covered, and where to apply** — no jargon, no sign-up.

Built as a CEP (Community Engagement Project) at **Modern Education Society's
College of Engineering, Pune**.

## Features

- **Find a scheme** — search by name or topic (try "dialysis", "delivery", "PM-JAY")
- **Filter by audience** — low-income family, mother-to-be, child, employee/pensioner,
  senior citizen, patient with a long-term illness
- **Filter by age group** — children (0–17), adults (18–59), seniors (60+), seniors 70+
- **Filter by income** — type your monthly household income (₹); schemes with
  income limits are shortlisted automatically (e.g. PM-JAY ≤ ₹10,000/month,
  RAN / PMNDP ≤ ~₹8,300/month, ESIC wages ≤ ₹21,000/month)
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
C:\Karan_CEP\
├── index.html              # page markup (no inline CSS/JS/data)
├── README.md
└── assets\
    ├── css\
    │   ├── base.css        # reset, design tokens, typography, utilities
    │   ├── components.css  # all component styles
    │   ├── themes.css      # dark theme overrides (loaded last)
    │   └── print.css       # print/paper-friendly styles
    ├── js\
    │   └── app.js          # all application logic
    ├── data\
    │   └── schemes.json    # the 23 scheme records
    └── img\
        ├── logo.webp       # brand emblem / hero image
        └── institution.webp# institution logo (footer)
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
6 per page with Previous/Next controls.

## Adding or editing a scheme

Open `assets/data/schemes.json` and add or edit an object:

```json
{
  "id": "PM-SOME-SCHEME",
  "name": "Full scheme name",
  "short_name": "SHORT",
  "category": "Health Insurance / Financial Protection",
  "ministry": "Ministry of ...",
  "implementing_body": "Optional body",
  "launch_year": 2026,
  "scheme_type": "Type of scheme",
  "status": "active",
  "description": "One or two sentences.",
  "coverage_amount": "What it gives.",
  "eligibility": "Who can use it.",
  "target_beneficiaries": "Who it is meant for.",
  "official_website": "https://example.gov.in",
  "key_features": ["Feature 1", "Feature 2"],
  "audience": ["family"],
  "age_group": ["all"],
  "income_max_annual": 120000
}
```

Valid `audience` values: `family`, `mother`, `child`, `worker`, `senior`, `patient`.

Valid `age_group` values: `all` (no age restriction), `child` (0–17), `adult`
(18–59), `senior` (60+), `senior70` (70+). Use `"all"` when the scheme serves
every age.

`income_max_annual` is the maximum household income per year in rupees, used by
the income filter (the app compares `monthly input × 12` against it). Use
`null` when the scheme has no income test (universal schemes match every income).

A scheme matches the age filter when its list contains `"all"` **or** the
selected value. Universal schemes therefore appear under every age group.
A non-`active` status is shown as **Legacy · no longer enrolling**.

## Data sources & disclaimer

- Scheme data compiled on **10 September 2026** from official government sources.
- **This is not an official government portal.** Amounts and eligibility change;
  always confirm details on each scheme's official website before applying.

## Acknowledgements

- Scheme information from the respective ministries / official portals
- Icons and branding created for this project
- Built as a CEP project for Modern Education Society's College of Engineering, Pune