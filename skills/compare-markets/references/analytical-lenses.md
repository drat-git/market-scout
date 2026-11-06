# Analytical lenses and counting

The case question determines the useful comparison. Clinic models, retail formats, maintenance coverage, and distributor capabilities require different configurations; do not reuse an industry-specific interpretation automatically.

| Business question | Artifact | Boundary |
| --- | --- | --- |
| Which businesses have a comparable operating configuration? | `comparison.markets[].profiles` | Profiles use their configured facts and scope. Company-wide capabilities do not prove same-site delivery. |
| Where are documented sites? | `markets[].geography.localities` and `unresolved` | Recorded locality labels, not municipal GIS, catchments, or exhaustive coverage |
| Which operators span markets? | `sharedOperators[].markets` | Physical site IDs and service-area IDs remain separate; common branding is not evidence of economics or ownership of other brands |
| Which apparent differences need verification? | Selected `providers` in the brief pack | Missing documentation is not absence of capability |
| What external context helps the question? | Configured `markets[].context` and `context:` source IDs | Respect period, boundary, units, and uncertainty; no automatic demand inference |

## Measures

- `companies`: accepted company–market records within the market. `uniqueCompanies`: deduplicated companies across all markets.
- `locations`: documented physical sites, not every site a business might have.
- `coverageCompanies`: accepted companies with supported service-area evidence. Do not add this to physical counts as though disjoint.
- `attributes[].companyClaims`: companies with a supported company-wide claim; `atPhysicalLocation` and `inServiceArea`: companies with supported local facts and presence. These counts overlap and must remain separate.
- `profiles[].providers`: one entry per qualifying company–market record with named qualifying scopes and source IDs. A profile's entire combination must hold at one configured scope.
- `matches`, `uncertain`, `screenedExclusions`: outcomes among accepted records. Deliberate analyst inclusion can retain an excluded assessment.

CSV includes a company row and separate site/coverage rows. Row count is never company count. Local attributes require supported presence; general company claims are visible only on the company row.

For each finding, connect observed evidence to a cautious implication and a concrete next check. Consider uneven research or source completeness as an alternative explanation. Avoid ratios with incomplete competitor denominators, unsupported opportunity scores, and invented capacity, price, quality, workforce, or margin claims.

One configured market yields a single-market result. More than two yields the same measures for each. An empty market is a research gap, not an absence of competitors.
