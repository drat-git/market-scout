# Configure a research case

A case file defines what the four skills research and compare. Changing industries or markets requires a new configuration and evidence, not a code edit. The toolkit supports business-level facts, physical sites, service areas, and evidence-based all/any criteria.

Use `cases/pediatric-therapy.json` for the saved Austin/San Antonio example or `cases/commercial-hvac.json` for a fictional Phoenix/Tucson practice case. Copy a configuration into `.market-scout/<case>/config.json` before adapting it. Remove irrelevant facts, rules, comparisons, and context; changing only the title is insufficient.

## Minimal worked configuration

Example research scope:

```json
{
  "schemaVersion":"2",
  "id":"wholesale-bakery-research",
  "version":"1",
  "title":"Wholesale bakeries — Leeds and Bristol",
  "industry":"Wholesale bakeries",
  "question":"Which researched production sites document bread production and wholesale supply, and what should we verify before choosing operating comparators?",
  "markets":[
    {"id":"leeds","name":"Leeds","boundary":"User-defined Leeds city research area; verify boundary membership for each site.","definitionUrl":null,"context":[]},
    {"id":"bristol","name":"Bristol","boundary":"User-defined Bristol city research area; verify boundary membership for each site.","definitionUrl":null,"context":[]}
  ],
  "attributes":[
    {"id":"bread","label":"Bread production","description":"Explicit evidence of producing bread at the applicable scope."},
    {"id":"wholesale","label":"Wholesale supply","description":"Explicit evidence of supplying wholesale customers."}
  ],
  "criteria":{
    "version":"1",
    "geography":"physical",
    "acceptedSourceTypes":["business","government"],
    "rules":[
      {"id":"production-model","label":"Bread and wholesale at one site","scope":"local","match":"all","facts":["bread","wholesale"],"expected":true,"nextStep":"Obtain site-specific evidence of both production and wholesale supply."}
    ]
  },
  "comparisons":[
    {"id":"wholesale-bread","label":"Wholesale bread production at one site","scope":"location","match":"all","facts":["bread","wholesale"]}
  ],
  "limitations":["Public-source sample; no capacity, revenue, or complete competitor coverage is established."]
}
```

Start with `research --case <file>` to validate and save an empty case, or add `--input <batch.json>`. Nothing from the pediatric example is inherited automatically.

## Case identity and markets

- `schemaVersion` is `2`; `id` is a stable identifier; `version` advances when the scope changes.
- `title`, `industry`, and `question` drive the briefing context. The question should be answerable from the proposed evidence.
- One or more markets are supported. IDs are arbitrary lowercase identifiers (letters/digits, separated by hyphens, periods, or colons); they are not limited to US metros.
- Each market needs a name and explicit `boundary`. Use a reliable `definitionUrl` where available; null means the boundary is a user-defined convention, not officially verified.
- A business location or coverage claim must be checked against that boundary. The CLI validates the market ID, not spatial membership. No automatic geocoding runs.

Do not silently switch a saved run to another case ID. Start a new case. To revise the same case, copy `case.json`, advance its version, and pass `--case <revised-file>` alongside `--from`; all facts/scopes must still be valid. A changed case resets active criteria to the revised case's criteria unless an explicit `--criteria` override is supplied. Review inherited inclusion decisions when changing meaning or eligibility.

## Evidence attributes

Each attribute has an ID, label, and description of the proposition being checked. Examples: commercial customers, installation, wholesale supply, pediatric care, a product category, or a documented operating capability.

Evidence `facts` must use those IDs. Two additional reserved facts always exist:

- `physical-presence`: a location inside the configured boundary; location scope only.
- `coverage`: explicitly serving the configured market; service-area scope only.

Do not add those reserved facts to `attributes`. Never use absence of a website mention as `supports:false`; that flag requires explicit negative evidence. Numeric market context belongs in context records; arbitrary revenue/capacity thresholds are not an implemented screening rule type.

## Screening rules

All configured rules must pass. Within a rule, `match:"all"` requires every named fact; `"any"` requires at least one. `expected:true` is the usual affirmative test. `expected:false` requires explicit negative evidence for each fact being evaluated, using the same all/any logic.

| Rule scope | Sources evaluated |
| --- | --- |
| `company` | Company-wide evidence only |
| `local` | One specific site or service area |
| `company-or-local` | Company evidence plus that one local scope; choose deliberately when inheritance is valid |

When presence is required, every rule must be satisfied for **one eligible local scope**. Services at two different branches are never combined. A general company menu does not satisfy a local rule.

| Geography | Eligible scopes |
| --- | --- |
| `physical` | Documented physical locations |
| `coverage` | Documented service areas |
| `either` | A physical location or service area, evaluated separately |
| `none` | Company evidence only; deliberately no geographic verification, so only company rules are allowed |

`acceptedSourceTypes` selects from `business`, `government`, `directory`, `document`, `other`. It is a source policy, not automatic trust: the evidence must also be source-checked and non-conflicting. A license registry may be useful government evidence in one case; a directory listing may only be a lead in another. Put the reasoning in the case note.

Each rule's `nextStep` should identify the evidence that could resolve an unknown. “Verify evidence” is too vague; “Find a dated location-specific installation-services statement” is useful.

## Comparison groups

A comparison profile names a relevant combination of facts. It has `id`, `label`, `facts`, `match`, and `scope` (`company`, `location`, or `service-area`). The whole combination must be supported at that scope. Site/coverage profiles also require supported physical presence/coverage.

Profiles are analytical groups, not automatic inclusion criteria. A record may be included while not qualifying for a particular profile. A company-wide profile can be useful, but must not be described as a same-site capability.

## Optional market context

Leave `context:[]` when no relevant sourced metrics are available. A context record has:

```json
{
  "id":"business-establishments",
  "label":"Relevant business establishments",
  "value":null,
  "unit":"establishments",
  "period":"To be researched",
  "geography":"The configured market boundary",
  "sourceUrl":"https://example.org/source-to-replace",
  "collectedAt":"2026-11-06T00:00:00Z",
  "uncertainty":"Format example only; omit until a real source is collected."
}
```

This is a format illustration; do not insert its placeholder URL as research. Real records need a value (number or string, or null for unavailable), units, period, boundary, actual source URL/date, and uncertainty. Values are not automatically comparable across years or geographies. Non-null records receive `context:<market-id>:<metric-id>` citation IDs in the brief source pack. They are source-based context, not quoted provider passages or automatic demand estimates.

The pediatric example explicitly carries saved 2024 ACS context. New cases start with their own context and do not inherit it.

## Research records and revisions

Use the [batch contract](../skills/research-market/references/evidence-and-batches.md). Run snapshots save the entire case, dataset, criteria, and decisions. Changes to any of them invalidate old comparison/narrative fingerprints even if headline counts remain unchanged. Rebuild comparison and check the prose after a revision.
