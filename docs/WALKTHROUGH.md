# Try the configurable four-skill workflow

Run from the Market Scout repository after [setup](CLI.md). Use new output directories each time. These walkthroughs are offline; the CLI makes no search or application AI calls.

## Option A: fictional commercial HVAC practice case

This case uses Phoenix/Tucson research areas and capabilities unrelated to pediatric therapy. Every business and source is fictional. Example decisions deliberately include uncertain records for learning; they are not a general acceptance policy.

```sh
npm run scout -- research --case cases/commercial-hvac.json --input examples/commercial-hvac/research.json --out .market-scout/hvac/research-01
npm run scout -- screen --from .market-scout/hvac/research-01 --out .market-scout/hvac/screen-01
npm run scout -- compare --from .market-scout/hvac/screen-01 --selection examples/commercial-hvac/decisions.json --out .market-scout/hvac/compare-01
```

Inspect `review.csv` and verification details. The case demonstrates commercial-customer eligibility, same-service-area maintenance/installation, company-menu ambiguity, a residential-only exclusion, and one shared operator. Comparison counts four accepted company–market records representing three unique businesses; coverage is documented, physical sites are not.

Ask the assistant:

```text
Use $write-market-brief on .market-scout/hvac/compare-01. Answer the configured
question using only the supplied evidence, explicitly label this a fictional
exercise, and write a sourced memo with prioritized verification steps.
```

It should fill a copy of the narrative template outside the saved run and call:

```sh
npm run scout -- brief --from .market-scout/hvac/compare-01 --narrative .market-scout/hvac/narrative-v1.json --out .market-scout/hvac/brief-01
```

For a command-only smoke test, omit `--narrative`; the result is a calculated summary, not an authored analytical brief.

## Option B: the saved pediatric example through the same toolkit

```sh
npm run scout -- research --case cases/pediatric-therapy.json --input examples/pediatric-therapy/research.json --out .market-scout/pediatric/research-01
npm run scout -- screen --from .market-scout/pediatric/research-01 --out .market-scout/pediatric/screen-01
npm run scout -- compare --from .market-scout/pediatric/screen-01 --selection examples/pediatric-therapy/decisions.json --out .market-scout/pediatric/compare-01
```

This reuses saved source dates and explicitly configured 2024 ACS context. The initial selected sample matches the demo's 9 Austin and 8 San Antonio companies (16 unique across both). Outputs stay in local files.

## Option C: your own industry and markets

Follow [CASE-CONFIG.md](CASE-CONFIG.md), create a configuration, and use `research-market` to collect a scoped batch from real sources or supplied documents. Run the same four commands with your case and input paths. New cases inherit no demo businesses, therapy rules, or population figures. Choose an inclusion policy deliberately and keep material uncertainty.

For an interview, show the configured question, one scoped source, one evidence gap, one useful comparison, and the resulting cited brief. Explain which parts came from [Nico's workflow](ATTRIBUTION.md), which were added, and which dashboard interactions are prepared demonstrations.

## Interactive dashboard tour

Run `npm run dev` and open the local URL. The welcome dialog appears on every page load or refresh. Choose **Start guided demo** for a hands-on walkthrough, or **Explore on my own** to use the dashboard normally. **Reset demo** offers the same choices; Cancel preserves the current session. About → How it works also includes a replay button.

The approximately two-to-three-minute tour follows one workflow in four stages:

1. **Discover:** understand the expansion question, then click Find more providers to load three candidates.
2. **Review:** open From the Heart Therapy Services, understand its unresolved clinic checks, and keep it under review.
3. **Compare:** select speech + occupational + physical therapy, inspect the updated counts, and expand the named clinic shortlist.
4. **Brief:** generate the selected Competitor benchmarks memo, read its recommendation, and finish at the shortlist with supporting sources.

The tour uses eleven callouts with concise context and clearly separated action prompts. Its progress indicator shows the current callout and workflow stage. Each skill is named once with a short explanation of its role. Map exploration, detailed source inspection, exports, and attribution remain available without adding more required steps.

Callouts connect discovery to `research-market`, evidence checks to `screen-providers`, comparison to `compare-markets`, and briefing to `write-market-brief`. These explain the reusable workflow; the dashboard does not execute assistant skills. Browser comparisons are calculated, while discovery and brief generation use prepared material. Briefs retain the fixed reference case regardless of visitor selections.

Back revisits instructions without undoing analyst decisions or rerunning completed work. Exit preserves the working session. If you navigate elsewhere, **Return to this step** restores the relevant screen or drawer. Refresh starts over; only the color theme persists. The guide supports keyboard controls, narrow screens, dark mode, and reduced motion, and is hidden from printed output.
