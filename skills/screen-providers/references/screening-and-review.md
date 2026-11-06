# Screening and review

Read `case.json` and active `criteria.json`. The case defines the vocabulary; no particular industry, age group, service list, or geography is built in. See `docs/CASE-CONFIG.md` for the full contract.

## How a rule works

A rule has an ID, label, `facts`, `match` (`all` or `any`), `scope`, `expected` (usually true), and a concrete `nextStep` for unresolved evidence.

| Scope | Evidence evaluated |
| --- | --- |
| `company` | Company-wide claims only |
| `local` | Claims at one candidate site/service area only |
| `company-or-local` | Company-wide claims plus that one candidate local scope; use only when inheritance makes business sense |

All rules must pass together at one eligible local scope. `all` means every named fact must meet its expected value; `any` means at least one. `expected:false` requires explicit negative evidence for the named facts, not missing mentions.

Geography `physical` tests sites; `coverage` tests documented service areas; `either` allows either kind without combining them. `none` deliberately waives geographic verification and supports company rules only. A relationship assigned to a market under `none` is not proof of local presence.

A fact resolves to yes/no only when checked evidence of an accepted source type supports/contradicts it. Conflicting checked claims resolve to unknown. Multiple facts use three-valued logic: a definite contradiction can exclude an all-rule; missing facts alone cannot.

## Interpret the output

`screen.json` contains assessments. `verification.json` adds the analyst decision. `decisionChecks` and `decisionScope` identify the checks behind the overall result; `groups` exposes every tested site/service area. `review.csv` provides a compact queue.

One qualifying scope is enough for a match. If there are several uncertain branches, the decisive group is a practical starting point, not a statement that the others need no research. Compare unknowns with the user's business question before prioritizing them.

Examples across industries:

- A company's menu lists repair and installation, but the local coverage page only establishes repair: uncertain for both-in-market criteria.
- Two shops offer different capabilities: do not add them together to satisfy a same-site combination.
- An explicit residential-only statement contradicts a commercial-customer criterion.
- Service coverage in a region does not establish a physical office there.
- A pediatric clinic may inherit an age-group claim only because that case explicitly allows company-or-local scope.

## Inclusion is separate

`accepted` includes the company–market record even if its screen is uncertain/excluded. Only supported facts contribute to relevant measures. `unreviewed` and `excluded` are omitted but retain evidence. Acceptance never changes verification.

Use actual relationship IDs in a separate decisions JSON. Unmentioned decisions inherit from `--from`; new relationships start unreviewed even if `origin` says baseline. Apply explicit choices or an authorized policy. Do not infer acceptance from a request to screen.

Correct source claims through a revised dataset and re-screen. Do not edit saved run files or treat a cosmetic UI flag as verified evidence. A recommended direct confirmation is not authorization to contact a business.
