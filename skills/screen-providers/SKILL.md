---
name: screen-providers
description: Screen businesses against a Market Scout case's configurable evidence criteria, explain specific verification gaps, and prepare analyst inclusion decisions while preserving source uncertainty.
---

# Screen businesses

Keep source verification, eligibility assessment, and analyst inclusion separate. The skill name remains stable, but “providers” can mean businesses in any configured industry.

## Run the assessment

Work from the Market Scout checkout. Read the previous run's `case.json`, `criteria.json`, and `selection.json`. Read [screening and review](references/screening-and-review.md) to interpret rule scopes. See `docs/CLI.md` for setup/recovery.

Use the existing criteria unless the user requests a change. Rules come from the case, not pediatric/clinic defaults. Save requested changes in a separate criteria file with a new version. Check whether they concern the company, one local site, a service area, or either kind of presence.

```sh
npm run scout -- screen --from .market-scout/case/research-01 --out .market-scout/case/screen-01
# Add --criteria .market-scout/case/criteria-v2.json for an authorized rule change.
```

Inspect `screen.json`, `verification.json`, and `review.csv`; do not recalculate outcomes in prose. The command uses stored evidence only. Explain changes from a prior assessment without silently changing inclusion.

## Make the review actionable

Present provider/market, inclusion decision, outcome, decisive unknown or contradiction, and next source/check. Use `decisionChecks` and `decisionScope` for the overall result and `groups` for alternative sites. One qualifying local scope is enough; optional gaps elsewhere need not block it.

- **Match:** all configured requirements are supported at the required scope.
- **Uncertain:** required facts are missing, unverified, or conflicting. Name the fact and explain why it is unresolved.
- **Exclude:** evidence explicitly contradicts an applicable requirement. This is an assessment, not automatic removal.

Never combine required services across sites, inherit company claims into a local rule, treat coverage as a physical site, or turn silence into a negative finding. Source types permitted by a case still require claim-level checking.

## Record inclusion decisions

Apply explicit user choices or an already authorized policy. Otherwise retain pending candidates and present the queue; useful work on already accepted records can continue. Do not ask again for authorized decisions.

Write a separate JSON override keyed by actual relationship IDs:

```json
{"business@market-one":"accepted","other@market-two":"excluded"}
```

Pass it to the next command with `--selection`; unmentioned decisions inherit. Accepted uncertain records contribute supported facts while keeping gaps visible. To correct evidence, revise a dataset copy, import it with `--data`, and re-screen. UI flag removal is not verification.

Return the review outputs, decision file/policy, consequential gaps, and run path for `compare-markets`. Do not contact businesses merely because a suggested next step is a call.
