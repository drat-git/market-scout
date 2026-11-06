# Status — demonstration and usable research skills

Updated November 6, 2026.

## Public demonstration

The static app presents Review providers → Compare markets → Briefs. It includes provider evidence drawers, inclusion decisions separate from verification, a simulated discovery sequence, interactive clinic mapping and therapy combinations, population context, CSV export, and three complete prepared briefs with print/Markdown export. Prepared briefs remain independent of visitor selections, with an explicit disclaimer. Additional markets, industries, custom questions, and deeper operating comparisons remain planned.

The app requires no application API key or Redis. Map backgrounds load OpenStreetMap tiles; saved coordinates need no runtime geocoding. The original research includes 19 unique companies across 20 market entries. The initial included sample is 17 entries (9 Austin, 8 San Antonio), with unresolved records retained for review.

## Skill workflow

The four skills can process newly supplied or assistant-collected evidence, screen it, record analyst decisions, compare it, and produce an authored brief. The generic toolkit runs offline. Case configurations define industries, markets, facts, source policies, criteria, and comparison groups. Complete run snapshots and `--from` preserve the case, evidence, criteria, and decisions. Screening exports a review queue; comparison exports a selected evidence pack, geographic/service comparisons, and a narrative template.

See the [SOP](SOP.md), [installation and commands](CLI.md), [walkthrough](WALKTHROUGH.md), and [audit/evaluation](SKILL-AUDIT.md). The downloadable bundle is rebuilt from canonical sources with `npm run package:skills`.

## Boundaries

The research skills support configured industries and one or more markets. Austin/San Antonio pediatric therapy remains the fixed public demo case. Research depends on the assistant's available tools; schema/citation checks do not establish semantic truth, and independent analyst review remains pending. Local CLI artifacts do not automatically update the static dashboard. Claude runtime execution and automatic discovery in a fresh Codex installation have not been tested. The [public demo](https://market-scout-roan.vercel.app/) was deployed to Vercel on November 6, 2026; the source is published at [drat-git/market-scout](https://github.com/drat-git/market-scout). See [deployment details](DEPLOYMENT.md).

The earlier live backend remains optional experimental code, separate from the demo and normal skill workflow. Historical entries in EVALUATION.md describe dated checks; the current skill audit documents this release's scope.
