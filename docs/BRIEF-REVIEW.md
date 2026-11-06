# Prepared brief review

Updated November 6, 2026.

The public demo now has three complete, fixed research memos. Their authoritative content is in `data/examples/narrative.json`, `narrative-services.json`, and `narrative-evidence.json`; readable Markdown copies sit alongside them. The references and calculated comparisons are validated against the entire baseline: 19 unique companies, 20 company–market records, and 21 documented physical locations. Three records retain unresolved eligibility. Visitor selections do not change these memos.

## Editorial decisions

- **Expansion strategy:** recommends a bounded diligence phase in both metros; sets separate access/referral and operating-feasibility decision gates. The memo does not recommend a winning market from provider counts.
- **Competitor benchmarks:** names the ten same-clinic speech/OT/PT comparators, explains why the remaining providers still matter, and qualifies the usefulness of a shared operator and age-specific programs.
- **Research priorities:** distinguishes eligibility from comparator relevance, identifies the unresolved records and missing addresses, and specifies evidence needed to close each issue.

The five-per-metro comparator count is calculated through the branch-aware comparison logic. San Antonio's sixth physical-therapy provider is not automatically a sixth full-model comparator. The narratives distinguish absent evidence from absent services, and documented locations from complete branch networks.

## Additional primary-source checks

These pages were inspected again while refining the briefs. This was a targeted check, not a comprehensive audit or a new dataset collection pass. Original evidence timestamps remain unchanged.

| Source | Relevance to the briefs |
| --- | --- |
| [Achieve Cedar Park](https://achievepediatrics.com/cedar-park/) | Confirmed the branch identity and three-discipline description. |
| [University Health rehabilitation](https://www.universityhealth.com/pediatrics/services/rehabilitation) | Confirmed the distinction between general services and the narrower Robert B. Green branch description. |
| [Brighton pediatric therapy](https://brightonsa.org/pediatric-therapy-services-3-6/) | Confirmed that differing age descriptions warrant branch/program eligibility follow-up. |
| [Line Leader](https://www.lineleadertherapy.com/) | Confirmed the three core therapies and Austin center description; location precision remains a separate dataset gap. |
| [Healthlink Pediatric Clinic](https://www.baptisthealthsystem.com/locations/detail/healthlink-pediatric-clinic) | Confirmed the clinic's address and core service menu. |

No wait times, payer participation, staffing, financial performance, or demand estimates were added to the factual dataset. Those subjects remain proposed diligence tasks. No provider was contacted.

## Demo behavior

The three-second writing animation opens an independent copy of the selected prepared memo. A collapsible **Brief generation disclaimer:** explains that future generation is planned to use only evidence about included providers. The same disclosure is included in Markdown and print output. The CLI can still validate an assistant-authored narrative against its own exact comparison; that capability is separate from the fixed public demo.

## Validation

- All 59 automated checks pass; production TypeScript/Vite build passes.
- Baseline source integrity and reference validation pass.
- The CLI accepts the comparator narrative against the full reference comparison and exports its table.
- Browser checks covered all three completed briefs, the three-second simulation, the expanded disclaimer, fixed reference counts after a selection change, valid in-document citation targets, and Markdown download. A clean reload produced no browser errors.
- Desktop visual review covered the compact question menu and comparator table. Print styles preserve the source appendix and include a separate prepared-demo disclosure; full printed pagination was not audited.
