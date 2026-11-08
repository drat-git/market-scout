---
name: compare-markets
description: Compare reviewed businesses across a Market Scout case's markets using configured capability groups, documented locations and coverage, shared operators, and evidence gaps to answer a business research question.
---

# Compare markets

Explain the differences relevant to the research question. The case defines the industry, markets, attributes, and comparison groups; do not impose clinic-specific metrics or investment rankings.

## Establish the working set

Work from the Market Scout checkout. Read the prior run's configuration, criteria, decisions, and user overrides. See `docs/CLI.md` for setup. Do not accept candidates or re-research sources just to make samples equal.

```sh
npm run scout -- compare --from .market-scout/case/screen-01 --selection .market-scout/case/decisions.json --out .market-scout/case/compare-01
```

Omit `--selection` when choices are unchanged. Read `compare.json`, `brief-input.json`, and `research.csv`. These contain calculated counts, configured comparison groups with named businesses/scopes, locality groupings, shared operators, verification details, and selected sources.

## Interpret the comparison

Read [analytical lenses](references/analytical-lenses.md). Choose the findings that answer the case question, rather than reporting every available number.

- Which businesses match the relevant operating model at the configured scope?
- Where are documented sites, and where is service coverage established separately?
- Which operators span markets, and is that based on sites, coverage, or both?
- Which apparent differences arise from incomplete evidence or uneven research?

State units and denominators. Companies, company–market records, sites, and service areas are distinct. Attribute counts overlap. Accepted uncertain businesses stay included but unsupported facts do not become positive counts. Do not infer missing capabilities, market share, demand, profitability, or quality from the sample.

A configured company-wide profile cannot be described as same-site capability. Locality labels are recorded address information, not geocoded catchments. Market context retains its own geography/date/source; it is not an automatic demand proxy.

For zero accepted records, return the review gap. For one market or one-sided evidence, give a bounded single-market finding rather than a false comparison. More than two markets use the same workflow; keep the analysis focused on the question.

## Deliver and hand off

Return two or three useful findings, material uncertainty, and prioritized follow-ups. Link the CSV and run. Pass the compare run to `write-market-brief`; it contains a context-bound narrative template and source pack. Changed configuration, evidence, rules, or decisions require a new comparison. Local outputs do not automatically update the prepared dashboard.
