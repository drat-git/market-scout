# Skill audit — configurable research toolkit

Updated November 6, 2026. The current skills use a generic case configuration. Austin/San Antonio pediatric therapy is an example rather than an industry/geography restriction.

## What changed

| Area | Previous limitation | Current behavior |
| --- | --- | --- |
| Research | Pediatric vocabulary and two fixed metros | Case-defined industry, question, markets, attributes, and source policy; new cases start without demo data |
| Screening | Fixed age/service checks | Configurable all/any factual requirements, expected true/false, company/local scope, and physical/coverage/either/no-presence modes |
| Comparison | Fixed therapy bundles and Texas mailing-city parsing | Configured capability profiles, explicit locality labels, separate physical/coverage measures, and shared operators across one or more markets |
| Briefing | Pediatric-specific context and prose assumptions | Case-bound question, selected sources, optional sourced market context, and validated authored narratives |
| Handoffs | Dataset/rule/decision fingerprint | Entire case configuration is now included; changed question or boundary invalidates old briefing context |
| Examples | One narrow reference case | Saved pediatric case plus a clearly fictional commercial-HVAC case; neither becomes an implicit default for a new configured case |

The new `toolkit/` modules implement the generic workflow. The prepared dashboard retains its original `shared/` model and data. V1 CLI commands and saved runs remain compatible through `cli/legacy.ts`; new skills always start with `--case` and continue with `--from`.

## Skill quality and operating guidance

All four entrypoints and their references now describe configuration-driven workflows. The [SOP](SOP.md) covers question definition, case design, research, review, comparison, authoring, and revisions. [CASE-CONFIG.md](CASE-CONFIG.md) provides a complete worked configuration and explains scope, boolean rule semantics, custom comparisons, and optional context. Installation, example prompts, and recovery are documented in [CLI.md](CLI.md).

The existing evidence safeguards remain: original dates, short real source passages, explicit uncertainty, no automatic human acceptance, no inferred branch services, no unsupported attractiveness scores, and no semantic-truth claim from schema validation. Unknown facts/markets fail validation rather than being replaced with demo values. No application AI calls or dashboard imports are introduced.

## Automated validation

All **76 tests passed** at the completion of the toolkit changes, including the 66 prior checks and ten new configured-workflow tests. They cover:

- Commercial HVAC coverage screening with matching, uncertain, and explicitly excluded records.
- The pediatric configuration reproducing the demo's selected company/site/service counts.
- A different industry with arbitrary UK market IDs, one- and three-market cases, and site-level combinations.
- Configured source types, explicit negative criteria, missing/conflicting evidence, and company-versus-local distinctions.
- Physical versus coverage versus either-presence behavior.
- Unknown markets/facts, duplicate definitions, invalid presence scopes, and incompatible rules.
- A complete configured CLI chain ending in an authored, source-bound brief.
- Changed questions/boundaries, immutable snapshots, source-selection restrictions, and no implicit acceptance of supplied baseline records.
- Explicit context citations without inheriting another case's demographics.
- Scope-preserving CSV output and spreadsheet-formula protection.

TypeScript validation and all four skill-creator structural validators passed. Skill metadata and local reference links were checked. A source/data fingerprint confirmed that the original demo files were unchanged by the toolkit generalization; separately requested download-interface edits follow this work.

## Independent cross-industry execution

A separate assistant received the revised skills, their operating guides, and a fictional raw source packet for independently owned coffee-roasting businesses in Leeds, Bristol, and Cardiff. It was not given expected answers or tests. It created its own case configuration and research batch, ran all four stages, applied an already authorized inclusion policy, and wrote a cited analytical memo without implementation edits or command failures.

The run distinguished Bridge's same-site roasting/wholesale from Harbour's company-wide menu and Split's capabilities at separate sites. It excluded the explicitly retail-only Cardiff record while keeping other unknowns visible. The accepted result contained three unique businesses, four company–market records, and five sites across the three configured markets. Cardiff's empty accepted sample was described as a research gap, not a lack of competitors. Original source timestamps and the fictional status were preserved. The memo identified the shared-operator limitation of the two qualifying Bridge sites rather than treating them as independent business benchmarks.

The primary agent inspected the generated Markdown and artifacts. This exercise demonstrates creating a new configuration and using the workflow in another industry and country. It does not establish real-world research accuracy or comprehensive sector coverage.

## Evaluation boundaries

These checks establish observable workflow behavior, not research completeness or sound investment conclusions. The assistant still needs tools/source access and judgment. A checked passage is not independent analyst approval. Automatic skill discovery in a fresh desktop installation and execution in Claude Code have not been tested.

The tool handles qualitative evidence propositions and descriptive comparisons. It does not implement arbitrary financial threshold models, automatic geographic membership checking, unattended monitoring, or full dashboard integration. The commercial-HVAC practice dataset is fictional, not market research.

## Prior audit retained in context

The preceding audit exercised the fixed pediatric workflow using a fictional supplied-source case and a bounded check of two real Achieve clinic pages. Those checks motivated explicit decision checks, context-preserving run handoffs, and a stronger citation/writing process. They did not establish cross-industry reuse; the configurable implementation and current tests address that limitation directly.
