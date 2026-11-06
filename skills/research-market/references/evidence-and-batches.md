# Evidence and batch format

First create/read the case using `docs/CASE-CONFIG.md`. The implementation contracts are `toolkit/schema.ts` and `toolkit/screen.ts`; industry rules live in the case JSON, not these skill instructions.

## Source method

Record the question, queries, dates, boundaries, selection rationale, exclusions, and stopping condition in `research-method.md`. The structured research log stores unresolved/excluded leads, not the whole search history. Use comparable methods across markets and preserve uneven coverage as a limitation.

Directories can identify leads. Establish claims from sources the configured policy accepts. Check the source's actual passage even when its type is accepted. Keep company identity, physical sites, coverage, and capabilities distinct. Reuse a company ID for another branch; a shared domain does not prove differently branded businesses are identical.

## Required batch arrays

`research --case <case.json> --input <batch.json>` starts a case with only supplied records. `research --from <run> --input <batch>` extends it. Without an input, `research --case` initializes an empty case.

| Array | Fields |
| --- | --- |
| `companies` | `id`, `name`, `website` (URL or null), `domain` (string or null), `origin` (`new` or `baseline`), `identityNote` (string or null) |
| `locations` | `id`, `companyId`, `marketId`, `name`, `address` (string or null), `locality` (string or null), `evidenceIds`, `note` (string or null) |
| `serviceAreas` | `id`, `companyId`, `marketId`, `name`, `evidenceIds` |
| `relationships` | `id`, `companyId`, `marketId`, `evidenceIds`; one per company–market pair |
| `evidence` | Source records below |

All five arrays are required; unused arrays are `[]`. Optional `researchLog` entries use `{name,source,outcome,reason}` with outcome `unresolved` or `excluded`. Optional `limitations` is a string array.

IDs are stable case-local identifiers. Market IDs must be configured. Every site/coverage record needs a company–market relationship. A batch may refer to existing companies/scopes; it need not repeat them. Identical repeated records are allowed, differing contents under an existing ID are rejected. For a correction, revise a full dataset copy, advance its version, and pass `research --from <original-run> --data <copy>`.

`locality` is a source-backed mailing/locality label, not an inferred municipal boundary. Leave it null when unavailable; no Texas-address parser or geocoder runs in this toolkit.

## Source records

- Identity/scope: `id`, `companyId`, `scope` (`company`, `location`, `service-area`), `scopeId`.
- Proposition: `facts` (one or more configured attribute IDs), `supports` (boolean), `claim` (paraphrase). Use false only for explicit negative evidence; silence is unknown.
- Provenance: `url` (URL or null), `sourceRef` (local/document reference or null), `title`, short exact `passage`, original ISO-UTC `collectedAt`. At least one of URL/sourceRef is required.
- Source type: `business`, `government`, `directory`, `document`, or `other`. Classification does not itself verify a claim; eligibility depends on the configured accepted types and checked evidence.
- `verification`: `source-checked`, `unverified`, or `conflicting`. Checked means the passage was inspected for this claim/scope, not independently approved.
- `provenance`: `new`, `cached`, or `baseline`; supplied saved excerpts are not freshly browsed.
- `uncertainty`: specific issue or null.

Two reserved facts apply in every industry:

| Fact | Scope and meaning |
| --- | --- |
| `physical-presence` | `location` only; a documented business site within the configured boundary |
| `coverage` | `service-area` only; an explicit claim of serving that market |

Other facts come from `case.attributes`. Company-level service menus may be saved but do not satisfy a `local` screening rule or a location/coverage comparison profile. Keep multiple claims in one record only when the passage supports every fact. Do not assign a location to a market solely from a marketing headline.

Preserve actual quotations within applicable reuse limits. Never turn a paraphrase into a quotation or use a homepage as support for every associated claim. Structural validation cannot verify source truth, boundary membership, or business identity.

## Format example

This fictional record works with the commercial-HVAC case's `maintenance` attribute; use real scoped sources for real research. A valid entire batch is available at `examples/commercial-hvac/research.json`.

```json
{
  "id":"example-phx-maintenance","companyId":"example-company",
  "scope":"service-area","scopeId":"example-phx-area",
  "facts":["coverage","maintenance"],"supports":true,
  "claim":"The fictional business offers maintenance within the configured Phoenix research area.",
  "url":"https://fictional.example/phoenix","sourceRef":null,
  "title":"Fictional source for a format example",
  "passage":"We offer maintenance throughout the Phoenix research area.",
  "collectedAt":"2026-11-06T00:00:00Z","sourceType":"business",
  "verification":"source-checked","provenance":"cached",
  "uncertainty":"Synthetic example; not real research."
}
```

A missing source should remain a lead or an uncertainty. It is acceptable to return fewer useful candidates than expected; do not pad the research sample.
