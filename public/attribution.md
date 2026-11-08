# Upstream attribution

Market Scout adapts ideas and a small normalization routine from Nicolas Goldberg's sourcing projects. This is an independent adaptation.

Pinned sources inspected during implementation:

- `opensourcing-release`: `50f8fa47de186c80e35369460181deb2bcf27d99`
- `opensourcing`: `396f338b655dc17407004d7c881d7886be940fcf`

| Upstream | Classification | Market Scout implementation |
| --- | --- | --- |
| [normalize.py](https://github.com/nicogoldberg1-rgb/opensourcing-release/blob/50f8fa47de186c80e35369460181deb2bcf27d99/skills/udu-source/lib/normalize.py) | Conceptual inspiration | Shared record shapes and explicit missing values in `shared/schema.ts`; no financial/contact field extraction copied. |
| [merge.py](https://github.com/nicogoldberg1-rgb/opensourcing-release/blob/50f8fa47de186c80e35369460181deb2bcf27d99/skills/udu-source/lib/merge.py) | Translated/adapted behavior | `normalizeDomain` in `shared/normalize.ts` strips scheme, www, path, and case. JS URL parsing adds validation. Exact name+domain duplicates consolidate evidence; shared domains with different names are flagged, not automatically merged. Branches remain separate. |
| [screen-companies/SKILL.md](https://github.com/nicogoldberg1-rgb/opensourcing-release/blob/50f8fa47de186c80e35369460181deb2bcf27d99/skills/screen-companies/SKILL.md) | Adapted instruction pattern | `skills/screen-providers/SKILL.md` and `shared/screen.ts` preserve explicit checks/reasons/uncertainty. Acquisition fit becomes pediatric service and geographic eligibility. |
| [run-cycle/SKILL.md](https://github.com/nicogoldberg1-rgb/opensourcing-release/blob/50f8fa47de186c80e35369460181deb2bcf27d99/skills/run-cycle/SKILL.md) | Conceptual workflow adaptation | Versioned CLI outputs and run event types preserve stage boundaries. The earlier live cycle is retained experimentally. The public demo now presents a saved example; the four skills preserve research, screening, comparison, and briefing handoffs. |
| [lib/state.py](https://github.com/nicogoldberg1-rgb/opensourcing-release/blob/50f8fa47de186c80e35369460181deb2bcf27d99/lib/state.py) | Conceptual inspiration | Criteria, review selection, and run artifacts are explicit in the TypeScript model. No Python tracker code is shipped. The experimental backend has Redis persistence, but the default static demo uses browser memory and local CLI artifacts. |
| [cycles.ts](https://github.com/nicogoldberg1-rgb/opensourcing/blob/396f338b655dc17407004d7c881d7886be940fcf/server/src/lib/cycles.ts) | Conceptual inspiration | Artifact-backed status and visible stage outcomes in Research runs. No upstream React components or cycle parser were copied. The guided demo replaces the run dashboard with an inspectable saved workflow. |

The applicable MIT license is preserved verbatim in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No large upstream code blocks or unused Python helpers are retained. Market Scout's Python baseline preparation script is original offline data assembly.

Market Scout additions include: evidence scope and provenance, branch-aware service screening, human decisions separate from assessments, deterministic company/market counting, snapshot briefs with resolved citations, CSV formula protection, and the React interface.

A public Market Scout repository has not been published yet; no placeholder repository link is presented as real.


## Dashboard layout research

The desktop interface redesign uses original React and CSS. Conceptual references, not copied template code:

- [Nico’s dashboard layout](https://github.com/nicogoldberg1-rgb/opensourcing/blob/396f338b655dc17407004d7c881d7886be940fcf/web/src/components/Layout.tsx) and [task panels](https://github.com/nicogoldberg1-rgb/opensourcing/blob/396f338b655dc17407004d7c881d7886be940fcf/web/src/pages/Home.tsx): compact navigation, task-oriented panels, inspectable records, and explicit run states.
- [Twenty workspace layout](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/core-concepts/layout.mdx): persistent workspace navigation, object views, settings, and record detail panels.
- [Tremor dashboard template](https://github.com/tremorlabs/template-dashboard-oss): restrained dashboard typography, comparison graphics, and table hierarchy.

The design uses the Impeccable skill. New industry datasets and multi-market selection remain future work; the current settings support the display order of the two baseline markets.

## Guided proof-of-concept update

The four canonical skill instructions now directly describe the adapted sourcing and screening procedures. New research and narrative writing are performed by the assistant using its available tools; default CLI commands validate, calculate, and export without API calls. The public demo presents a prepared case through three screens. Additional markets and industries are outside the current release.
