# Research method — draft 2026-11-05

## Question and limits

How do researched pediatric therapy providers in Austin and San Antonio differ in service mix and documented footprint, and what should an analyst investigate before considering expansion?

This is an independent illustrative research project. It is not commissioned by TBD Investors and does not assert Oaklin Lane is considering these markets. The supplied brief identifies Oaklin Lane as the multiservice model reference. Its services URL returned an error during this pass, so no additional Oaklin Lane claims were independently added.

## Geography

Store Austin–Round Rock–San Marcos (CBSA 12420) and San Antonio–New Braunfels (CBSA 41700). County lists and FIPS codes were verified against the July 21, 2023 delineation file used by the 2024 ACS. Austin contains five counties; San Antonio contains eight. The saved workbook, source hashes, and extraction script make this check reproducible. [Census explains the delineation basis and 2023 update](https://www.census.gov/programs-surveys/metro-micro/about/delineation-files.html).

Default eligibility requires a documented pediatric clinic with speech, occupational, or physical therapy. Home-service coverage is a separate entity. A headquarters or generic contact address is not sufficient evidence of a therapy clinic. ABA alongside eligible therapy is retained; adult-only and ABA-only services do not qualify. Ownership is not an exclusion criterion.

## Search and collection log

Research was performed on November 5, 2026, Eastern Time, and records use a UTC collection-batch timestamp. Broad public web queries included:

- `pediatric speech occupational physical therapy Austin clinic locations`
- `pediatric speech occupational physical therapy San Antonio clinic locations`
- `Austin pediatric therapy clinic speech occupational physical`
- `San Antonio pediatric therapy clinic speech occupational physical`

Follow-up queries checked exact provider names and primary domains for Little Tesoros, Achieve, KidVentures, KidTherapy, Capital Area Speech, Children's Therapeutics, Line Leader, Sol Speech, Pediatric Therapy Specialists, Pediatric Therapy Associates, Kinspire, and Autism Treatment Center. Search directories were used as discovery leads only. Eligibility and services in the dataset use retrieved provider pages.

This is a purposive sample assembled from search results, not a randomized or comprehensive survey. The order of search results can affect the sample. No provider was selected to manufacture a market difference.

## Evidence handling

Each of the 28 evidence records has a stable ID, scoped claim, primary URL/title, brief excerpt, batch collection time, source type, provenance, and verification status. Ellipses mark noncontiguous excerpts. Quotes per source URL are limited to 25 words in the baseline. `source-checked` means the builder inspected the retrieved primary page; it does not mean independent human sign-off or clinical validation.

Company identities, clinics, and service areas are separate records. Achieve is one company in two markets. Little Tesoros and Pediatric Therapy Specialists have two documented branches each; general menus remain company-scoped and do not qualify every branch automatically. TeamCare's pediatric page documents San Antonio coverage; its contact address is not treated as a confirmed therapy clinic.

A claim with missing or conflicting evidence returns uncertain. Positive claims about one clinic cannot silently satisfy criteria at a different clinic. Multiple selected services are conjunctive. No evidence of a service is not evidence that it is absent.

## Selection and counting

The draft contains 19 unique companies / 20 company–market relationships, with ten records in each metro. It has 21 documented clinic locations, not a complete census of branches. Default screening returns 17 matches and three uncertain records. Mighty Kids Therapy completes the Austin sample: its homepage explicitly associates pediatric speech, occupational, and physical therapy under one roof in Round Rock; the contact page identifies the clinic address.

The baseline includes unresolved clinic-specific services so they can be inspected, not counted as verified matches. Children's Therapeutics of Austin was not included because retrieval failed; the exclusion/uncertainty log preserves the lead. A Building Bridges RGV result documented clinics outside the target metros and was left out of the sample.

The comparison computes company, location, coverage, and service counts in code. A company in both metros contributes once to each market and once to the combined unique-company total. Branch-level service counts are distinguished from company-wide menu evidence. Do not infer relative demand or attractiveness from this sample.

## Demographics

The required context is 2024 ACS one-year estimates: B01003_001E (population), B09001_001E (under-18 population), and B25001_001E (housing units), plus corresponding M fields. Estimates and margins were retrieved from the official table-based Summary File because the API required a key. Exact full-metro rows (310M700US12420 and 310M700US41700) are retained in saved source files. Census column names such as B01003_E001 map to API identifiers such as B01003_001E. The population MOE sentinel -555555555 is retained as a raw annotation and normalized to a null numeric MOE with status controlled; it is never represented as zero. Published under-18 and housing margins use 90% confidence. The dataset and every new brief preserve figures, source URLs, collection times, geographic vintage, and annotation guidance. These are context variables, not demand estimates.

## Review still required

An analyst should check each claim against its passage and source, confirm clinic addresses and service rosters, resolve Brighton's age-range inconsistency, inspect the Pediatric Therapy Associates address discrepancy, review the completed draft brief, and then record approval with identity/date. No approval has been fabricated or prefilled.

## Historical live candidate research

Live research uses OpenAI web-search discovery followed by structured extraction from retrieved provider pages. Search directories supply leads only. Primary URLs must be cited by discovery and match the provider domain. Retrieved text is treated as evidence, not instructions. Exact excerpts are checked against normalized page text; proposed excerpts absent from the source or exceeding the per-source excerpt allowance are omitted.

The live `source-checked` label means automated retrieval and exact-passage validation; semantic interpretation still requires analyst review. Company-wide menus do not qualify every branch. Unknown clinic status or county placement remains uncertain, even when a city name appears plausible. Failed source checks and extraction warnings remain visible.

Candidates begin unreviewed and do not affect the working comparison until accepted. Acceptance preserves uncertainty and does not imply independent evidence validation. Run artifacts persist privately for 24 hours; local decisions and notes require export before refresh. The two initial live runs are functionality checks, not a quality benchmark or complete market census.

## Guided demonstration selection

The initial comparison includes nine Austin records and eight San Antonio records supported by the default clinic rules. Little Tesoros, Pediatric Therapy Specialists, and TeamCare remain available under Under review but are not counted initially. There is no required number per metro. The three prepared demo briefs instead use the complete baseline reference case: 19 unique companies across 20 company–market records, including those three unresolved records. They remain fixed when visitor selections change.

The saved Austin discovery batch is a historical output, not a live website feature. Loading it does not search, spend API credits, update collection dates, or accept candidates. All candidate uncertainties are preserved. The public application uses browser memory; it does not contact the prior Redis/API backend.
