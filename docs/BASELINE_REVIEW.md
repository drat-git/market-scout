# Baseline review packet

Status: **independent analyst review pending**. No human sign-off is recorded.

Dataset: `2026-11-06.draft-2`. Nineteen unique companies, twenty company–market records (ten per metro), twenty-one documented clinics, and twenty-eight scoped provider evidence records. Default screening gives seventeen matches and three uncertain records.

## Materials

- `data/baseline.json`: company, branch, service-area, evidence, and demographic records.
- `data/examples/brief.json`: immutable comparison, context, criteria, sources, and limitations.
- `data/market-context.json`: geographic definitions, estimates, raw margin annotations, retrieval timestamps, source URLs, and SHA-256 hashes.
- `data/sources/census/`: unmodified Census Summary File tables and July 2023 metro delineation workbook.
- `scripts/build-context.py`, then `scripts/build-baseline.py`, then `npm run validate:data`: offline reproduction and validation.

## Priority decisions

| Record | Evidence issue | Review action |
| --- | --- | --- |
| Little Tesoros / Austin | Company menu does not establish services at both branches | Obtain dated branch service rosters; retain uncertain status meanwhile |
| Pediatric Therapy Specialists / San Antonio | Same company-wide versus branch-specific distinction | Verify each clinic separately |
| TeamCare / San Antonio | Pediatric coverage is documented; physical clinic treatment is not | Confirm treatment setting; do not count the office as a clinic |
| Brighton Center | Age eligibility differs across descriptions | Confirm applicable ages |
| Pediatric Therapy Associates | Older directory address differs from the current provider page | Verify current location; primary page currently takes precedence |
| Mighty Kids / Austin | Round Rock homepage ties therapies to one roof; contact page supplies the address | Review scope attribution and pediatric claim against both primary pages |
| All providers | Websites do not independently establish operational capacity or every current service | Confirm evidence support and distinguish clinical validation from website source checks |

The Census geography workbook confirms five Austin counties and eight San Antonio counties. ACS estimates describe the full metros. Population's -555555555 margin annotation means a controlled estimate, not ±0. Housing and under-18 margins are published at 90% confidence. Do not infer therapy demand from these totals or rank markets from the purposive provider sample.

Reviewers should record their identity, date, reviewed dataset version, corrections, and approval decision in a separate review record. This packet is preparation for that review, not evidence that review occurred.
