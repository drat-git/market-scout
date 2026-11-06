# Verification record — initial desktop foundation

Date: November 5, 2026, Eastern Time.

## Automated checks

`npm test`: **21 passed, 0 failed**.

These are developer-authored deterministic correctness checks, not an independently reviewed research-quality evaluation or a held-out model benchmark. Synthetic clinic fixtures are labeled synthetic and stay out of the published research data. No prompt tuning or model evaluation has been performed.

Coverage includes:

- Company/market/branch counts and shared companies.
- Any-core versus all-required-service rules.
- Missing and contradictory evidence.
- Services split between branches.
- Company-wide claims versus clinic evidence.
- Adult-only and explicit ABA-only exclusions; ABA with an eligible therapy retained.
- Wrong geography, primary versus directory sources, and service coverage versus physical presence.
- Human decisions remaining unchanged by screening.
- Immutable briefs with resolved references and market-specific citations.
- Domain normalization, exact identity consolidation, and ambiguous brands.
- CSV formula escaping and separate location rows.
- Referential integrity, API input validation, agreement with shared logic, and research preflight blocking.

`npm run validate:data`: passes. Verifies schema/references and a maximum 25 quoted words per source URL, and regenerates example comparison/brief artifacts. This does not verify that a passage semantically supports every fact; independent source review remains required.

`npm run build`: TypeScript and Vite production build pass. Zod emits two harmless Rollup comment-annotation warnings; they do not affect compilation. Dependency audit after updating Zod: zero reported vulnerabilities at the time of the check.

## CLI and skill checks

Representative screen, compare, and brief commands completed and wrote reusable artifacts. Brief consumed the saved comparison. Research wrote a blocked preflight and returned exit 3, with no paid call. All four SKILL.md packages passed the bundled structural validator after its YAML dependency was installed in an isolated temporary environment.

This verifies command behavior and skill structure, not autonomous live research. The research skill explicitly surfaces the current unavailable state instead of substituting searches.

## Local HTTP checks

Against the running Vite development server:

| Request | Observed result |
| --- | --- |
| POST /api/screen, known record + default criteria | 200, match |
| POST /api/brief, baseline selection | 200, 18 unique companies |
| POST /api/research | 503, failed preflight |
| Methodology, attribution, MIT-notice assets | 200, text/markdown |

These are local development endpoints. Production Vercel functions and server session/run storage are not implemented.

## Desktop browser checks

At 1440px:

- Initial research table and comparison loaded without console errors.
- Requiring physical therapy and running screening returned nine uncertain records and preserved previous assessments.
- Opened Achieve's Austin evidence; branch-specific service passage and Cedar Park address were displayed.
- Excluded and restored that company–market entry; evidence and screening assessment remained intact.
- Entered an analyst note and created a comparison snapshot with current criteria.
- A nonexistent provider search showed an explanatory empty state; clearing filters restored records.
- Discovery readiness produced a blocked run; later stages stayed Not run.
- Document width matched viewport width; no desktop horizontal overflow.
- Independent screenshot review returned `ship` for the initial desktop local foundation, explicitly not the full product release.

The desktop screenshot is in `.impeccable/review/preview.png`. Review artifacts are ignored by Git.

## Not yet verified

- Independent human validation of baseline claims or brief interpretations.
- Held-out screening agreement, incorrect/missed identity merges, citation-support rate, and analyst-correction count.
- Real paid research, model usage, operating cost, completion time, cancellation, partial results, cache behavior, signed sessions, concurrency, distributed limits, or budget enforcement.
- Printed PDF pagination and comprehensive keyboard/screen-reader accessibility audit. Print CSS and native dialog focus behavior are implemented, but do not constitute those audits.

The application made **no paid OpenAI calls** in these checks. No live operating-cost estimate is represented as measured. Desktop use is the current target per user clarification.


## Desktop beta UI redesign verification

The redesign replaces editorial headings and the serif visual system with a compact dashboard, adds dedicated Providers and Workspace settings views, and retains all existing research flows.

- `npm test`: 21 passed. `npm run validate:data`: valid, counts unchanged. `npm run build`: passed.
- Browser: market-order swap/save reflected in comparison and chart series; result filter returned three baseline uncertain records; provider sorting reversed correctly; criteria changes and screening preserved history.
- Browser: excluded/restored a provider; inspected scoped sources; empty search recovered; analyst note appeared in a new brief snapshot.
- Downloaded and parsed CSV (21 rows, including documented clinics and coverage-only record), workspace JSON (including marketOrder), and brief JSON (9 sections, 26 source records).
- Checked blocked discovery and all three retained information dialogs, including added design references.
- Layout captures: 1440px desktop, 1280px laptop, and the actual approximately 746px app panel. The table scrolls inside its own region in narrow windows; the document does not overflow horizontally after the containment fix. Mobile was not a target.
- Screenshot artifacts use `.impeccable/review/redesign-*`. Native print action remains; PDF pagination was not newly verified.

Independent Impeccable review found the desktop composition shippable and requested one secondary-text contrast correction. After consolidation into the darker secondary token, its verdict pass scored all six named contrast items resolved (no partial or unresolved items). This is a scoped UI review, not a production-readiness or research-validity certification.

## Research baseline and server foundation follow-up

The baseline now contains nineteen unique companies, twenty market records, twenty-one clinics, and twenty-eight evidence records. The two metro county lists and all six 2024 ACS estimates were extracted from saved official Census files. Rebuilds are offline and validation checks source hashes and preserved context. Independent analyst review remains pending.

`npm test`: 27 passed. `npm run test:redis`: four integration tests passed against a dedicated Redis 7.2.12 Unix socket. These cover real atomic idempotency under twenty simultaneous requests, session isolation, expiry, revision conflicts, cookie issuance, and read-only progress. No paid API calls were made. API spending and usage limits are deferred per the user; they are neither enforced nor represented as verified.

The updated app was checked for the ten-company counts, the added Mighty Kids record, Census estimates and annotations, and demographic context in the example brief. Production hosting and live research remain unverified. Earlier sections above describe the previous build and are historical.

## Live research follow-up — November 5, 2026 ET

This section supersedes earlier unavailable-live-path descriptions while preserving the history above.

- `npm test`: **35 passed**. `npm run test:redis`: **8 passed** against isolated Redis 7.2.12. TypeScript/Vite build and baseline/Census validation pass. The two known Zod annotation warnings remain harmless.
- New checks cover real stage persistence, acceptance boundaries, fabricated-quote rejection, company/branch scope, unknown counties, source failures, cancellation, unsafe addresses, structured Responses requests, sanitized vendor errors, and immutable candidate identities.
- HTTP/Redis tests exercise twenty concurrent duplicate claims, private session evidence in screen/brief requests, cancellation, expiry, stale revisions, and read-only interrupted-run reporting.
- A real Austin CLI run and a real San Antonio browser run each finished in approximately **27 seconds**, each retaining **three candidates**. All six remained uncertain because the retrieved pages did not establish every clinic requirement. These are smoke tests, not a held-out quality evaluation. Model usage is recorded in each run; monetary cost was not measured.
- Browser checks: actual stage updates, source/evidence inspection, acceptance increasing the working comparison, exclusion and restoration, and a new brief containing the accepted candidate's sources and updated counts. Refresh restored the saved San Antonio run and reset local decisions to unreviewed; the baseline remained nineteen companies/twenty records.
- Local Redis is bound to loopback port 6380 with AOF storage in ignored `.market-scout/redis`. Dashboard research artifacts expire after 24 hours; browser notes, decisions, and briefs remain memory-only. The OpenAI key is configured privately and an exact-value bundle check confirmed it is absent from generated client JavaScript.
- Screenshot: `.impeccable/review/live-research.png`. The final browser reload rendered the saved review queue successfully; a historical Vite reload error from intermediate editing was present in the retained console log, with no new error from the final reload.

No production deployment, hosted Redis connection, shared result cache, independent baseline approval, or independent model-quality evaluation is claimed. API spending caps and usage quotas remain deferred by the user. Evidence enrichment for county placement and branch services is the next research-quality task.


## Guided static demo — November 5, 2026 ET

This section describes the current default application and supersedes the earlier dashboard and live-backend descriptions above.

- `npm test`: **41 passed, 0 failed**. Six new checks cover the evidence-based initial selection, idempotent saved-candidate loading, inclusion versus verification, criteria consistency, authored-narrative snapshot/reference validation, and empty selections.
- `npm run validate:data`: passed. The original research remains intact; the guided selection includes 9 Austin and 8 San Antonio entries and leaves three unresolved baseline entries pending.
- `npm run build`: passed. The two existing Zod annotation warnings remain non-blocking.
- All four skill folders passed the bundled skill-creator structural validator. All four offline CLI commands completed, including prepared-narrative validation and a merged-research → comparison → deterministic-summary handoff. These checks verify instructions/artifacts and commands, not autonomous execution by Codex or Claude.
- Browser checks covered source drawers, selection removal, updated counts, physical-therapy rule application, chart-to-provider filtering, loading saved candidates, accepting an uncertain candidate without changing its assessment, the fixed-brief mismatch notice, reset confirmation, and the How it works and Add a market dialogs.
- Desktop (1440px), narrow (390px), and the normal app-panel layout were inspected. The document stayed within the viewport at both explicit sizes. Provider and demographic tables use contained scrolling. Temporary viewport overrides were reset.
- React review checked shared derived state, functional selection updates, named controls, native modal behavior, and page-heading focus. This is not a comprehensive assistive-technology audit.
- The Impeccable detector reported design-token documentation advisories, with no blocking findings. The visual pass retained the navy/teal direction. Screenshot: `.impeccable/review/guided-comparison.png`.
- CLI Markdown/CSV artifacts and the downloadable ZIP were checked. Browser export controls were exercised, but the browser automation download-event check timed out; browser-saved file contents and printed PDF pagination are not claimed as verified.

The default entry points contain no research/API calls. No paid AI calls were made during this simplification. The earlier live backend remains opt-in and was not exercised. Independent source/interpretation approval, Claude runtime execution, public hosting, and a published repository remain outside these completed checks.


## Discovery interaction verification

The production build and all 41 existing checks passed after the discovery interaction update. Browser checks observed Researching, Gathering evidence, and Cataloging in sequence, followed by three saved additions. Opening one candidate removed only its New badge; the other two retained theirs across screen navigation. Its screening remained uncertain and the Found by AI label appeared at the top of the panel. The UI describes the timing as a simulation and makes no live AI call. Screenshot: `.impeccable/review/ai-provider-panel.png`.


## Brief library verification

The build and all 41 existing tests passed. Browser checks covered the empty state, question menu from both entry points, all three writing stages, ready-card opening, availability of print/PDF and Markdown controls, and a service-mix question preview without invented findings. The planned Upload providers control is disabled. Screenshot: `.impeccable/review/brief-library.png`. Generation remains simulated; printed pagination and downloaded file delivery were not re-tested in this update.

## Comparison depth verification

Production build and all 44 tests passed. Three added checks cover same-clinic evidence (without combining services across branches or inheriting company claims), single-company counting across multiple clinics, and shared operators requiring included verified physical presence in both markets. Browser verification confirmed collapsed counts, new comparison values, provider-to-evidence links, the removed discovery explainer, three Suggested labels, the disabled custom-question control, and Generate/Cancel before the writing-method section. The design detector reported token-documentation advisories. No live AI calls or new source verification were performed.

## Interactive service comparison verification

All 46 tests and the production build passed. Added tests cover custom combinations, unverified evidence, empty selections, and mutually exclusive company breadth groups without combining services across clinics. Browser checks covered checkbox count changes, empty selection messaging, section ordering, and desktop side-by-side bounds. At 390px the page had no document-level horizontal overflow. Temporary viewport overrides were reset. The layout detector reported no findings.

## Geographic comparison verification

All 47 tests and the production build passed. Geographic tests verify city counts, preservation of missing/unparseable addresses, and exclusion of unverified or excluded clinics. Browser verification covered city expansion and the source drawer for the Cedar Park clinic. No new source research or geocoding was performed.

## Clinic map verification

All 50 tests passed. New checks cover included/verified clinic gating, exact-address cache binding, missing matches, valid coordinates, and source references. Production build passed; Leaflet is split into a separate lazy-loaded chunk. Browser checks verified map tiles, Austin/San Antonio/both-market controls, pin clicks opening the correct provider drawer, Enter activation, zoom-in and fit controls, and the combined 10 mapped / 7 unmapped counts. Default panel layout was visually inspected. The attempted viewport override did not change the hidden test tab to 390px, so mobile rendering is not claimed as independently verified for this update. Layout detector reported no findings. No AI calls were made; one-time public address geocoding was cached, while background tile requests are live.

## Verification and inclusion clarity checks

All 54 automated tests passed, including existing screening outcomes and four new explanation checks: company-wide versus branch evidence, individual required-service gaps, physical clinic versus coverage, and conflicting versus unverified sources. Browser checks verified removal/restoration without disappearing rows, automatic inclusion-filter clearing with notice, source anchors, and the Occupational + Sensory integration checklist. Explicit statuses are separate from action buttons. The shared screening outcome and drawer consume the same verification checks.

### Flag removal and selection-aware briefs

- Browser: Remove flag hides the row warning and Restore flag reverses it; evidence checks remain unchanged.
- Browser: accepting Little Tesoros adds its two documented Austin clinics to the comparison and produces an expansion brief with 10 Austin / 8 San Antonio companies and one unresolved Austin record.
- Automated: generated briefs include accepted uncertain providers without attributing company-wide therapies to branches; snapshots remain independent of later selection changes. Original-selection briefs retain the authored narrative. All 56 tests pass; production build passes.
