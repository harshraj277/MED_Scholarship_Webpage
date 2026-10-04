#!/usr/bin/env node
/* ============================================================
   Yojana Setu – tools/build-schemes.js
   Merges the expanded source dataset into assets/data/schemes.json.

   WHY THIS EXISTS
   The expanded source file (datas/source/health_schemes_expanded.json)
   is *not* drop-in ready for the app. It drops the four fields the
   filters depend on (audience, age_group, gender, income_max_annual),
   renames categories and ministries, adds state schemes and replaces
   scheme_type with implementation plumbing. This script is the
   editorial layer that fixes all of that deterministically, so the
   dataset can be regenerated instead of hand-edited.

   The app itself has NO build step – it loads the JSON this writes.

   USAGE
     node tools/build-schemes.js

   INPUTS
     datas/source/health_schemes_expanded.json  (104 records, incl. state)
     datas/schemes_verified_23.json             (23 verified records)
   OUTPUT
     assets/data/schemes.json                    (89 central records)

   EDITORIAL DECISIONS ENCODED HERE
     1. Verified text wins. For any scheme present in the verified file,
        the 10 Sep 2026 official-source wording is kept as-is; the source
        file only contributes its `notes` field.
     2. State schemes are excluded – the project is central-scope.
     3. Category + ministry strings are normalised so the dropdowns
        don't split one concept across near-duplicate labels.
     4. `verified` flag records provenance per record; the UI badges it.
     5. `help_type` is a curated "kind of scheme" bucket that drives the
        filter, because the raw scheme_type had 29 plumbing values
        ("Programme under NHM" alone appeared 23 times).
     6. income_max_annual is left null where the source states a
        criterion but gives no figure. Inventing a number would be a
        worse lie than admitting we do not have it.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'datas', 'source', 'health_schemes_expanded.json');
const VERIFIED = path.join(ROOT, 'datas', 'schemes_verified_23.json');
const OUT = path.join(ROOT, 'assets', 'data', 'schemes.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/* ---------- 1. id renames: source file renamed 3 existing schemes ---------- */
const ID_ALIAS = {
  'MI-IMI': 'MI',          // Mission Indradhanush / IMI  -> MI
  'RSBY-LEGACY': 'RSBY',   // RSBY                      -> RSBY
  'AYUSH-NAM': 'NAM'       // NAM                       -> NAM
};

/* ---------- 2. taxonomy normalisation ---------- */
/* Fold source categories into the project's established vocabulary so the
   "Category" dropdown never shows two labels for one idea. */
const CATEGORY_MAP = {
  'Disease Control Programme': 'Disease Control',
  'Employee/Pensioner Health Scheme': 'Employee / Pensioner Schemes',
  'Medicine Access & Affordability': 'Medicine Access',
  'AYUSH / Traditional Medicine': 'AYUSH'
  // Non-Communicable Disease Care, Disability & Rehabilitation,
  // Emergency & Trauma Care, Health Promotion & Quality and
  // Tribal & Rural Health are genuinely new – kept as-is.
};

/* Strip ministry abbreviations and one garbled value so the Ministry
   dropdown collapses to one entry per real ministry. DEPwD is a
   *department* of the Ministry of Social Justice and Empowerment, and the
   filter is documented as listing parent ministries, so it is mapped up. */
const MINISTRY_MAP = {
  'Ministry of Health and Family Welfare (MoHFW)': 'Ministry of Health and Family Welfare',
  'Ministry of Women and Child Development (MoWCD)': 'Ministry of Women and Child Development',
  'Ministry of Labour and Employment (originally); later MoHFW': 'Ministry of Health and Family Welfare',
  'Ministry of Chemicals and Fertilizers (Dept. of Pharmaceuticals)': 'Ministry of Chemicals and Fertilizers',
  'Department of Empowerment of Persons with Disabilities (DEPwD)': 'Ministry of Social Justice and Empowerment'
};

/* ---------- 2b. link corrections, each verified against the source ---------- */
const WEBSITE_FIX = {
  /* HLL Lifecare Ltd is a Government of India public-sector enterprise and the
     nodal agency for AMRIT; amritpharmacy.in is not the official domain. */
  AMRIT: 'https://www.lifecarehll.com/',
  /* Deep-link to the scheme page rather than the DEPwD homepage. */
  ADIP: 'https://depwd.gov.in/en/adip-scheme',
  DDRS: 'https://depwd.gov.in/en/scheme-of-assistance-to-disabled-persons',
  KIRAN: 'https://depwd.gov.in/en/others-helplines/'
};
/* Verified as already correct, listed so a future audit need not re-check:
     disabilityaffairs.gov.in  still resolves and now serves DEPwD
     poshantracker.in         official MoWCD/NeGD dashboard (cited by PIB)
     thenationaltrust.gov.in   National Trust
     tbcindia.gov.in           National TB Elimination Programme        */

/* The source file stamped "DEPwD / National Trust" on ADIP, DDRS and KIRAN.
   National Trust runs neither. Corrected per scheme. */
const IMPL_FIX = {
  ADIP: 'Department of Empowerment of Persons with Disabilities, via ALIMCO, national institutes, NGOs and DDRCs',
  DDRS: 'Department of Empowerment of Persons with Disabilities',
  KIRAN: 'Department of Empowerment of Persons with Disabilities, coordinated by NIEPMD Chennai and NIMHR Sehore'
};

/* ---------- 2c. income ceilings and how much to trust them ----------
   income_max_annual is the *filter* cap. income_note records what the cap
   actually is, because for BPL and SECC-based schemes there is no published
   rupee figure — the test is a list, and the number is an approximation.
   Sourced from official portals; figures marked approximate say so.        */
const INCOME_OVERRIDE = {
  /* depwd.gov.in: ceiling Rs 30,000/month; 100% subsidy up to Rs 22,500/month,
     50% subsidy Rs 22,501-30,000/month. Scheme revised 26 Sep 2024. */
  ADIP: 360000
};

const INCOME_NOTES = {
  ADIP: 'Eligibility ceiling ₹30,000 a month (₹22,500 for the 100% subsidy tier, ₹22,501–₹30,000 for the 50% tier). Scheme revised 26 September 2024.',
  ESIC: 'Wage ceiling of ₹21,000 a month, or ₹25,000 for persons with disabilities.',
  NFSA: 'Priority Households have no member earning above ₹10,000 a month. Antyodaya Anna Yojana households are selected by States on Central criteria — there is no national AAY income figure.',
  FORTRICE: 'Delivered through PDS, ICDS and PM POSHAN, so it follows the NFSA ceiling.',
  NATIONALTRUST: 'Cover is free for BPL families; other eligible families pay a small annual contribution.',
  'AB-PMJAY': 'Eligibility is SECC 2011 deprivation and occupational category, not a published income figure. ₹1,20,000 a year approximates the bottom-40% threshold.',
  RAN: 'The test is BPL status on the state BPL list, not a published rupee figure. ₹1,00,000 a year approximates the BPL threshold.',
  HMDG: 'The test is BPL status, set by a committee per case. ₹1,00,000 a year approximates the BPL threshold.',
  PMNDP: 'The test is state-defined BPL status. ₹1,00,000 a year approximates the BPL threshold.',
  RSBY: 'The test was BPL status. ₹1,00,000 a year approximates the BPL threshold (scheme now closed).'
};

const HELP_TYPES = [
  'Health insurance',
  'Cash assistance',
  'Free medicines & tests',
  'Primary care & hospitals',
  'Screening & prevention',
  'Immunisation',
  'Nutrition',
  'Mental health support',
  'Emergency & accident care',
  'Rehabilitation & devices',
  'Tele-health & digital records',
  'AYUSH medicine',
  'Quality & awareness'
];

/* ---------- 3. curated "kind of scheme" for the 23 verified records ---------- */
const HELP_VERIFIED = {
  'AB-PMJAY': 'Health insurance',  RAN: 'Cash assistance',
  'RSBY': 'Health insurance',      'AB-HWC': 'Primary care & hospitals',
  'PM-ABHIM': 'Primary care & hospitals', NHM: 'Primary care & hospitals',
  PMSSY: 'Primary care & hospitals', CGHS: 'Health insurance',
  ESIC: 'Health insurance',        JSY: 'Cash assistance',
  JSSK: 'Free medicines & tests',  RBSK: 'Screening & prevention',
  PMSMA: 'Primary care & hospitals', MI: 'Immunisation',
  UIP: 'Immunisation',             NTEP: 'Free medicines & tests',
  NACP: 'Screening & prevention',  PMNDP: 'Free medicines & tests',
  PMBJP: 'Free medicines & tests', ABDM: 'Tele-health & digital records',
  NMHP: 'Mental health support',   POSHAN: 'Nutrition',
  NAM: 'AYUSH medicine'
};

/* ---------- 4. curation for the 66 new central records ----------
   audience : family | mother | child | worker | senior | patient
              [] = not a direct citizen benefit (facility / professional
              registry schemes) – intentionally matches no audience chip.
   age_group: all | child (0-17) | adult (18-59) | senior (60+) | senior70
   gender   : all | female | male   (female only where the benefit is
              paid to a woman specifically: JSY, PMSMA, MAA, MHS, PMMVY)
   income   : annual household rupees, or null = universal / figure unknown
------------------------------------------------------------------- */
const CURATED = {
  'PMJAY-VVC':      { help: 'Health insurance', aud: ['senior', 'family'], age: ['senior70'], gen: ['all'], inc: null },
  LAQSHYA:          { help: 'Quality & awareness', aud: ['mother', 'child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  SUMAN:            { help: 'Primary care & hospitals', aud: ['mother', 'child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  MAA:              { help: 'Nutrition', aud: ['mother', 'child'], age: ['child', 'adult'], gen: ['female'], inc: null },
  RKSK:             { help: 'Screening & prevention', aud: ['child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  WIFS:             { help: 'Nutrition', aud: ['child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  NDD:              { help: 'Screening & prevention', aud: ['child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  AMB:              { help: 'Nutrition', aud: ['mother', 'child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  HBNC:             { help: 'Primary care & hospitals', aud: ['child', 'mother'], age: ['child'], gen: ['all'], inc: null },
  SNCU:             { help: 'Primary care & hospitals', aud: ['child'], age: ['child'], gen: ['all'], inc: null },
  NSSK:             { help: 'Quality & awareness', aud: ['mother', 'child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  PMMVY:            { help: 'Cash assistance', aud: ['mother'], age: ['adult'], gen: ['female'], inc: null },
  NIKSHAY:          { help: 'Cash assistance', aud: ['patient', 'family'], age: ['all'], gen: ['all'], inc: null },
  NIKSHAYMITRA:     { help: 'Nutrition', aud: ['patient', 'family'], age: ['all'], gen: ['all'], inc: null },
  NLEP:             { help: 'Free medicines & tests', aud: ['patient'], age: ['all'], gen: ['all'], inc: null },
  NCVBDC:           { help: 'Screening & prevention', aud: ['family', 'patient'], age: ['all'], gen: ['all'], inc: null },
  NPNCD:            { help: 'Screening & prevention', aud: ['patient', 'senior', 'family'], age: ['adult', 'senior'], gen: ['all'], inc: null },
  NTCP:             { help: 'Screening & prevention', aud: ['family'], age: ['all'], gen: ['all'], inc: null },
  NPCBVI:           { help: 'Primary care & hospitals', aud: ['patient', 'senior', 'child'], age: ['all'], gen: ['all'], inc: null },
  NPHCE:            { help: 'Primary care & hospitals', aud: ['senior', 'patient'], age: ['senior'], gen: ['all'], inc: null },
  NPPCD:            { help: 'Rehabilitation & devices', aud: ['patient', 'child', 'senior'], age: ['all'], gen: ['all'], inc: null },
  NOHP:             { help: 'Primary care & hospitals', aud: ['family'], age: ['all'], gen: ['all'], inc: null },
  NPPC:             { help: 'Primary care & hospitals', aud: ['patient', 'senior'], age: ['all'], gen: ['all'], inc: null },
  NVHCP:            { help: 'Free medicines & tests', aud: ['patient'], age: ['all'], gen: ['all'], inc: null },
  NSCAEM:           { help: 'Screening & prevention', aud: ['child', 'patient'], age: ['child', 'adult'], gen: ['all'], inc: null },
  TELEMANAS:        { help: 'Mental health support', aud: ['patient', 'family'], age: ['all'], gen: ['all'], inc: null },
  KIRAN:            { help: 'Mental health support', aud: ['patient', 'family'], age: ['all'], gen: ['all'], inc: null },
  DMHP:             { help: 'Mental health support', aud: ['patient'], age: ['all'], gen: ['all'], inc: null },
  NPPCF:            { help: 'Screening & prevention', aud: ['family', 'child'], age: ['all'], gen: ['all'], inc: null },
  NRCP:             { help: 'Free medicines & tests', aud: ['family'], age: ['all'], gen: ['all'], inc: null },
  NAPSE:            { help: 'Emergency & accident care', aud: ['family', 'worker'], age: ['all'], gen: ['all'], inc: null },
  IDSP:             { help: 'Screening & prevention', aud: ['family'], age: ['all'], gen: ['all'], inc: null },
  HMDG:             { help: 'Cash assistance', aud: ['patient', 'family'], age: ['all'], gen: ['all'], inc: 100000 },
  FDSI:             { help: 'Free medicines & tests', aud: ['patient', 'family', 'senior'], age: ['all'], gen: ['all'], inc: null },
  FDI:              { help: 'Free medicines & tests', aud: ['patient', 'family'], age: ['all'], gen: ['all'], inc: null },
  AMRIT:            { help: 'Free medicines & tests', aud: ['family', 'patient', 'senior'], age: ['all'], gen: ['all'], inc: null },
  ESANJEEVANI:      { help: 'Tele-health & digital records', aud: ['family', 'patient'], age: ['all'], gen: ['all'], inc: null },
  UWIN:             { help: 'Tele-health & digital records', aud: ['mother', 'child'], age: ['child', 'adult'], gen: ['all'], inc: null },
  NHCX:             { help: 'Tele-health & digital records', aud: [], age: ['all'], gen: ['all'], inc: null },
  HPR:              { help: 'Quality & awareness', aud: [], age: ['all'], gen: ['all'], inc: null },
  MERAASPATAAL:     { help: 'Quality & awareness', aud: ['patient', 'family'], age: ['all'], gen: ['all'], inc: null },
  KAYAKALP:         { help: 'Quality & awareness', aud: [], age: ['all'], gen: ['all'], inc: null },
  SSS:              { help: 'Quality & awareness', aud: ['family'], age: ['all'], gen: ['all'], inc: null },
  EATRIGHT:         { help: 'Quality & awareness', aud: ['family'], age: ['all'], gen: ['all'], inc: null },
  FITINDIA:         { help: 'Quality & awareness', aud: ['family'], age: ['all'], gen: ['all'], inc: null },
  SHWP:             { help: 'Quality & awareness', aud: ['child'], age: ['child'], gen: ['all'], inc: null },
  MHS:              { help: 'Nutrition', aud: ['mother', 'child'], age: ['child', 'adult'], gen: ['female'], inc: null },
  MPV:              { help: 'Free medicines & tests', aud: ['mother'], age: ['adult'], gen: ['all'], inc: null },
  NATIONALTRUST:    { help: 'Health insurance', aud: ['patient', 'senior'], age: ['all'], gen: ['all'], inc: 100000 },
  ADIP:             { help: 'Rehabilitation & devices', aud: ['patient', 'senior'], age: ['all'], gen: ['all'], inc: 360000 },
  DDRS:             { help: 'Rehabilitation & devices', aud: ['patient'], age: ['all'], gen: ['all'], inc: null },
  TRAUMA:           { help: 'Emergency & accident care', aud: ['family', 'worker'], age: ['all'], gen: ['all'], inc: null },
  CASHLESSRTA:      { help: 'Emergency & accident care', aud: ['family', 'worker'], age: ['all'], gen: ['all'], inc: null },
  AMBULANCE:        { help: 'Emergency & accident care', aud: ['family', 'mother', 'patient', 'senior', 'child'], age: ['all'], gen: ['all'], inc: null },
  ECHS:             { help: 'Health insurance', aud: ['worker', 'senior', 'family'], age: ['all'], gen: ['all'], inc: null },
  AYUSHMANCAPF:     { help: 'Health insurance', aud: ['worker', 'family'], age: ['all'], gen: ['all'], inc: null },
  PMSBY:            { help: 'Health insurance', aud: ['worker', 'family'], age: ['adult', 'senior'], gen: ['all'], inc: null },
  PMJJBY:           { help: 'Health insurance', aud: ['worker', 'family'], age: ['adult'], gen: ['all'], inc: null },
  ABVKY:            { help: 'Cash assistance', aud: ['worker'], age: ['adult'], gen: ['all'], inc: null },
  SAKSHAMANG:       { help: 'Nutrition', aud: ['child', 'mother'], age: ['child', 'adult'], gen: ['all'], inc: null },
  POSHANTRACKER:    { help: 'Nutrition', aud: ['child', 'mother'], age: ['child'], gen: ['all'], inc: null },
  NFSA:             { help: 'Nutrition', aud: ['family'], age: ['all'], gen: ['all'], inc: 120000 },
  FORTRICE:         { help: 'Nutrition', aud: ['family', 'child', 'mother'], age: ['all'], gen: ['all'], inc: 120000 },
  AYURSWASTHYA:     { help: 'AYUSH medicine', aud: [], age: ['all'], gen: ['all'], inc: null },
  AYURGYAN:         { help: 'AYUSH medicine', aud: [], age: ['all'], gen: ['all'], inc: null },
  PMJANMAN:         { help: 'Primary care & hospitals', aud: ['family', 'child', 'mother', 'senior', 'patient'], age: ['all'], gen: ['all'], inc: null }
};

/* ---------- helpers ---------- */
const cat = (c) => CATEGORY_MAP[c] || c;
const min = (m) => MINISTRY_MAP[m] || m;

const AUD_VALUES = ['family', 'mother', 'child', 'worker', 'senior', 'patient'];
const AGE_VALUES = ['all', 'child', 'adult', 'senior', 'senior70'];
const GEN_VALUES = ['all', 'female', 'male'];

function validate(id, r) {
  const errs = [];
  (r.audience || []).forEach((a) => { if (!AUD_VALUES.includes(a)) errs.push('audience "' + a + '"'); });
  (r.age_group || []).forEach((a) => { if (!AGE_VALUES.includes(a)) errs.push('age_group "' + a + '"'); });
  (r.gender || []).forEach((g) => { if (!GEN_VALUES.includes(g)) errs.push('gender "' + g + '"'); });
  if (HELP_TYPES.indexOf(r.help_type) < 0) errs.push('help_type "' + r.help_type + '"');
  if (!r.id) errs.push('missing id');
  if (!r.name) errs.push('missing name');
  if (!r.official_website) errs.push('missing official_website');
  if (!Array.isArray(r.key_features) || !r.key_features.length) errs.push('missing key_features');
  if (r.launch_year == null || isNaN(r.launch_year)) errs.push('bad launch_year');
  if (r.income_max_annual != null && r.income_max_annual <= 0) errs.push('income_max_annual must be > 0');
  return errs;
}

/* A website we could not find on an official portal is worth failing on.
   Programme sites on their own domain are legitimate, so they are allow-listed
   rather than forced to a .gov domain. */
const NON_GOV_ALLOWED = {
  'www.lifecarehll.com': 'HLL Lifecare Ltd, Govt of India PSU',
  'poshantracker.in': 'MoWCD / NeGD official dashboard'
};
function auditDomains(list) {
  return list.filter(function (r) {
    let host;
    try { host = new URL(r.official_website).hostname; } catch (e) { return true; }
    if (/\.(gov|nic)\.[a-z]{2}$/.test(host)) return false;
    return !Object.prototype.hasOwnProperty.call(NON_GOV_ALLOWED, host);
  });
}

/* ---------- build ---------- */
const src = readJson(SRC);
const verified = readJson(VERIFIED);
const verifiedById = new Map(verified.map((s) => [s.id, s]));

// index the source by resolved id, preferring a non-empty website
const srcById = new Map();
const skipped = [];
for (const s of src.schemes) {
  if (s.category === 'State Health Scheme') { skipped.push({ id: s.id, why: 'state scheme (out of scope)' }); continue; }
  const id = ID_ALIAS[s.id] || s.id;
  if (verifiedById.has(id)) continue; // handled by the verified pass
  if (!CURATED[id]) { skipped.push({ id: s.id, why: 'no curation entry – would ship with dead filters' }); continue; }
  if (srcById.has(id)) { skipped.push({ id: s.id, why: 'duplicate id' }); continue; }
  srcById.set(id, s);
}

const out = [];

/* pass 1 – verified records keep their own wording */
for (const v of verified) {
  out.push({
    id: v.id,
    name: v.name,
    short_name: v.short_name,
    category: cat(v.category),
    ministry: min(v.ministry),
    implementing_body: IMPL_FIX[v.id] || v.implementing_body || v.ministry,
    launch_year: v.launch_year,
    scheme_type: v.scheme_type,
    help_type: HELP_VERIFIED[v.id] || 'Primary care & hospitals',
    status: v.status,
    description: v.description,
    coverage_amount: v.coverage_amount,
    eligibility: v.eligibility,
    target_beneficiaries: v.target_beneficiaries,
    official_website: WEBSITE_FIX[v.id] || v.official_website,
    key_features: v.key_features,
    audience: v.audience,
    age_group: v.age_group,
    gender: v.gender,
    income_max_annual: INCOME_OVERRIDE[v.id] != null ? INCOME_OVERRIDE[v.id] : v.income_max_annual,
    income_note: INCOME_NOTES[v.id] || null,
    verified: true,
    notes: null
  });
}

/* pass 2 – new central records get curated filter metadata */
for (const [id, s] of srcById) {
  const c = CURATED[id];
  const extraNote = id === 'AMRIT'
    ? ' Run by HLL Lifecare Ltd, a Government of India public-sector enterprise and the official nodal agency for AMRIT.'
    : id === 'POSHANTRACKER'
      ? ' poshantracker.in is the official Ministry of Women and Child Development dashboard (built on NeGD/MeitY).'
      : '';
  out.push({
    id: id,
    name: s.name,
    short_name: s.short_name,
    category: cat(s.category),
    ministry: min(s.ministry),
    implementing_body: IMPL_FIX[id] || min(s.implementing_body) || s.implementing_body,
    launch_year: s.launch_year,
    scheme_type: s.scheme_type,
    help_type: c.help,
    status: s.status,
    description: s.description,
    coverage_amount: s.coverage_amount,
    eligibility: s.eligibility,
    target_beneficiaries: s.target_beneficiaries,
    official_website: WEBSITE_FIX[id] || s.official_website,
    key_features: s.key_features,
    audience: c.aud,
    age_group: c.age,
    gender: c.gen,
    income_max_annual: INCOME_OVERRIDE[id] != null ? INCOME_OVERRIDE[id] : c.inc,
    income_note: INCOME_NOTES[id] || null,
    verified: false,
    notes: (s.notes || '').replace('Added from general knowledge; not live-verified. ', '') + extraNote || null
  });
}

/* pull `notes` from the source onto the verified records they describe */
const notesById = new Map();
for (const s of src.schemes) {
  const id = ID_ALIAS[s.id] || s.id;
  if (s.notes) notesById.set(id, s.notes);
}
for (const r of out) {
  if (r.verified && notesById.has(r.id) && r.id !== 'RSBY') r.notes = notesById.get(r.id);
}

/* stable order: verified first (original 23 order), then new by category+name */
const verOrder = new Map(verified.map((s, i) => [s.id, i]));
out.sort((a, b) => {
  const va = verOrder.has(a.id) ? verOrder.get(a.id) : 1000;
  const vb = verOrder.has(b.id) ? verOrder.get(b.id) : 1000;
  if (va !== vb) return va - vb;
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
});

/* ---------- validate ---------- */
const problems = [];
const seen = new Set();
for (const r of out) {
  for (const e of validate(r.id, r)) problems.push(r.id + ': ' + e);
  if (seen.has(r.id)) problems.push(r.id + ': duplicate id in output');
  seen.add(r.id);
}
const badDomains = auditDomains(out);
badDomains.forEach((r) => problems.push(r.id + ': unrecognised non-government domain ' + r.official_website));
if (problems.length) {
  console.error('BUILD FAILED – ' + problems.length + ' problem(s):');
  problems.forEach((p) => console.error('  ! ' + p));
  process.exit(1);
}

/* ---------- report ---------- */
const tally = (f) => out.reduce((m, r) => { const v = String(r[f]); m[v] = (m[v] || 0) + 1; return m; }, {});
console.log('records written : ' + out.length + '  (verified ' + out.filter(r => r.verified).length + ', needs verification ' + out.filter(r => !r.verified).length + ')');
console.log('categories      : ' + Object.keys(tally('category')).length);
console.log('ministries      : ' + Object.keys(tally('ministry')).length);
console.log('help types      : ' + Object.keys(tally('help_type')).length);
const capped = out.filter((r) => r.income_max_annual != null);
console.log('income capped   : ' + capped.length + ' of ' + out.length +
  '  (max Rs ' + Math.max.apply(null, capped.map((r) => r.income_max_annual)) + '/yr)');
console.log('income notes    : ' + out.filter((r) => r.income_note).length);
console.log('non-gov links   : ' + Object.keys(NON_GOV_ALLOWED).length + ' (allow-listed)');
console.log('skipped         : ' + skipped.length + ' (' + Object.keys(tally2(skipped)).length + ' distinct reasons)');
function tally2(list) { const m = {}; list.forEach(s => { m[s.why] = 1; }); return m; }
skipped.forEach(s => console.log('  - ' + s.id + '  (' + s.why + ')'));

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('\nwrote ' + path.relative(ROOT, OUT));
