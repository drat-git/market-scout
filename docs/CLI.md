# Skills, installation, and CLI

The assistant researches and writes; the offline CLI validates, screens, calculates, and exports. Industries, markets, screening criteria, and comparison groups come from a case configuration. The public dashboard remains a separate prepared pediatric-therapy demonstration.

Start with the [SOP](SOP.md), [configuration guide](CASE-CONFIG.md), or [walkthrough](WALKTHROUGH.md).

## Setup and skill installation

Clone [drat-git/market-scout](https://github.com/drat-git/market-scout). Use Node 22+ and npm; Python 3 is needed only to rebuild the downloadable ZIP. From the repository root:

```sh
npm ci
npm run scout -- --help
```

The skill ZIP requires this repository and its dependencies. Research uses the assistant session; the CLI needs no API key.

Copy all four canonical folders from `skills/`, including references and metadata:

- **Codex:** `.agents/skills/<name>` in this project. Invoke `$research-market`, `$screen-providers`, `$compare-markets`, `$write-market-brief`. Refresh/restart if they are not discovered. [Official OpenAI guidance](https://learn.chatgpt.com/docs/build-skills).
- **Claude Code:** `.claude/skills/<name>` in this project, invoked with `/research-market`, `/screen-providers`, `/compare-markets`, `/write-market-brief`. The instructions use standard frontmatter and shell commands; runtime execution in Claude has not been tested. [Official Claude guidance](https://code.claude.com/docs/en/skills).

Inspect existing folders before copying. Update only these installed skill copies; preserve unrelated skills and research artifacts. Maintain canonical sources in `skills/`. Uninstall by removing their installed copies. Automatic discovery in a fresh desktop installation has not been tested.

Rebuild `public/market-scout-skills.zip` with `npm run package:skills` after changing packaged content. The bundle contains the guides, configurations, and example inputs alongside the four skills; it excludes private runs and secrets.

## Typical requests

```text
Use $research-market to create a case for commercial HVAC businesses in my two
markets. Require documented maintenance and installation in each service area.
Use the sources I supplied, preserve uncertainty, and screen the candidates.
```

```text
Use $screen-providers on .market-scout/case/research-01. Apply the configured
rules. Include matches, leave uncertain records pending, and record that policy.
```

```text
Use $compare-markets on my reviewed run and decisions.json. Explain which
businesses fit the configured comparison groups and where evidence is weak.
```

```text
Use $write-market-brief on .market-scout/case/compare-01. Answer its research
question with a sourced memo and prioritized next steps.
```

## Commands

```sh
# New case, with or without supplied evidence.
npm run scout -- research --case .market-scout/case/config.json --input .market-scout/case/batch.json --out .market-scout/case/research-01
npm run scout -- screen --from .market-scout/case/research-01 --out .market-scout/case/screen-01
npm run scout -- compare --from .market-scout/case/screen-01 --selection .market-scout/case/decisions.json --out .market-scout/case/compare-01
npm run scout -- brief --from .market-scout/case/compare-01 --narrative .market-scout/case/narrative-v1.json --out .market-scout/case/brief-01
```

Create the input files using the skills and [case guide](CASE-CONFIG.md). The examples above are paths, not automatically created research. See the walkthrough for ready-to-run supplied examples.

| Flag | Meaning |
| --- | --- |
| `--case file` | New or revised configuration; start every new research case explicitly |
| `--from directory` | Inherit a prior run's complete case, dataset, rules, and decisions |
| `--input file` | Append a source batch; research command only; new records remain unreviewed |
| `--data file` | Revised full dataset; cannot combine with `--input` |
| `--criteria file` | Screening-rule override using the configured attribute vocabulary |
| `--selection file` | Decision overrides keyed by relationship ID; unmentioned decisions inherit |
| `--narrative file` | Authored brief from the compare run's template |
| `--notes file` | Unverified notes for a calculated summary only, up to 8,000 characters |
| `--out directory` | New output directory; existing or interrupted runs are never overwritten |
| `--json` | Print the stage artifact; use `npm run --silent scout -- ... --json` for clean stdout |

Without `--out`, runs go under `.market-scout/<case-id>/`. Paths are relative to the repository working directory unless absolute. `research --case` without input saves an empty case; it does not claim to have searched.

To add evidence later: `research --from <run> --input <batch>`. For corrections: revise a full dataset copy, advance its version, then use `research --from <run> --data <copy>`. Identical repeated records can be imported; differing contents under an existing ID are rejected on the batch path.

## Outputs and handoffs

Every configured run contains `case.json`, `dataset.json`, `criteria.json`, explicit `selection.json`, `<command>.json`, and `run.json`.

| Stage | Additional outputs |
| --- | --- |
| Research | Counts and duplicate-review warnings in `research.json` |
| Screening | `verification.json`, `review.csv` |
| Comparison | `research.csv`, `brief-input.json`, `narrative.template.json` |
| Briefing | `brief.md` |

The comparison pack includes configured capability profiles, named sites/service areas, locality groups, shared operators, selected sources, verification, and optional market context. Counts preserve company/site/coverage distinctions.

Copy the narrative template outside its run and keep `caseId`, `datasetVersion`, `contextHash`, and `comparison` unchanged. Write the title/sections, then call brief. Omitting `--narrative` generates a **calculated summary**, not a professional authored memo.

The content fingerprint includes configuration, evidence, criteria, and decisions. It detects accidental input drift, not source truth or deliberate file tampering. Completed runs are immutable by convention. The manifest is written last; a directory without it is incomplete.

## Review decisions

```json
{"actual-business@actual-market":"accepted","another-relationship":"excluded"}
```

Allowed values are `accepted`, `excluded`, `unreviewed`. New records always default to unreviewed, including a supplied record labeled baseline. Unknown relationship IDs fail validation. An accepted uncertain/excluded record remains included deliberately, using supported facts without upgrading its verification. Store the authorizing choice/policy in the case note.

## Compatibility and recovery

The old v1 demo commands (`--example`, `--empty`, legacy `--comparison`) and saved v1 runs remain supported by an isolated compatibility path. They retain their original pediatric semantics. **Use `--case` for new work**; no new configured case silently falls back to the demo. V1 runs are not reinterpreted as another industry. To use the pediatric data in the generic toolkit, import `examples/pediatric-therapy/research.json` with `cases/pediatric-therapy.json`.

| Error | Next action |
| --- | --- |
| Unknown market, attribute, or source scope | Correct the input or deliberately revise the configuration; do not substitute a demo value |
| Conflicting existing record | Use a corrected dataset copy with `--data` |
| Unknown selection ID | Use IDs from the review queue |
| Changed saved inputs / stale narrative | Start a new run from revised copies; regenerate comparison and re-check prose |
| Output already exists | Choose a new name and preserve prior/partial results |
| No accepted records | Review candidates before an authored brief |
| Source unavailable | Preserve uncertainty or use supplied material; do not fabricate research |

Exit 0: structural validation passed. Exit 2 covers invalid inputs, stale context, file errors, and existing outputs. Errors go to stderr. Public dashboard integration is not implemented; local outputs do not automatically appear there.

The separate experimental `scout:live`/`dev:live` backend is outside this workflow and can incur charges. Do not substitute it silently; see [server notes](SERVER.md).
