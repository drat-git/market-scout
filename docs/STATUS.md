# Status — demonstration and usable research skills

Updated November 6, 2026.

## Public demonstration

The static app presents Review providers → Compare markets → Briefs. It includes provider evidence drawers, inclusion decisions separate from verification, a simulated discovery sequence, interactive clinic mapping and therapy combinations, population context, CSV export, and three complete prepared briefs with print/Markdown export. Briefs use a fixed reference case. Additional markets, industries, custom questions, and deeper operating comparisons remain planned.

The app requires no application API key or Redis. Map backgrounds load OpenStreetMap tiles; saved coordinates need no runtime geocoding. The original research includes 19 unique companies across 20 market entries. The initial included sample is 17 entries (9 Austin, 8 San Antonio), with unresolved records retained for review.

## Skill workflow

The four skills can process newly supplied or assistant-collected evidence, screen it, record analyst decisions, compare it, and produce an authored brief. The generic toolkit runs offline. Case configurations define industries, markets, facts, source policies, criteria, and comparison groups. Complete run snapshots and `--from` preserve the case, evidence, criteria, and decisions. Screening exports a review queue; comparison exports a selected evidence pack, geographic/service comparisons, and a narrative template.

See the [SOP](SOP.md), [installation and commands](CLI.md), [walkthrough](WALKTHROUGH.md), and [audit/evaluation](SKILL-AUDIT.md). The downloadable bundle is rebuilt from canonical sources with `npm run package:skills`.

## Boundaries

Skills support configured industries and markets; CLI outputs stay in local files. Independent analyst review, Claude execution, and fresh-install discovery testing remain pending. See [deployment details](DEPLOYMENT.md).

The earlier live backend remains optional experimental code, separate from the demo and normal skill workflow. Historical entries in EVALUATION.md describe dated checks; the current skill audit documents this release's scope.
