---
name: write-market-brief
description: Write a sourced business-research brief from a configured Market Scout comparison, separating findings, implications, limitations, and next steps while validating the exact case and selected evidence.
---

# Write a market brief

Answer the business question. The assistant writes; the CLI validates references, calculations, and the full case snapshot.

## Scope the answer

Locate the Market Scout checkout and the chosen **compare run**. Read `case.json`, `compare.json`, `brief-input.json`, and `narrative.template.json`. Read [writing and citation guide](references/writing-and-citations.md) before drafting.

Use the configured question and industry terminology. Do not carry over therapy, payer, clinic, or population assumptions from an example unless relevant to this case. If the user changes the question, update a case copy and regenerate comparison before briefing. Explain when the evidence cannot support the requested conclusion and answer the supported part.

No accepted records means return to review. Thin or one-sided evidence supports a limited memo, not fabricated balance. Never import excluded-business facts or substitute a public-demo narrative for the chosen case.

## Author and validate

1. Copy `narrative.template.json` outside the saved run. Preserve `caseId`, `datasetVersion`, `contextHash`, and the exact `comparison`. Write a question-specific title and sections.
2. Lead with the answer; qualify only the findings affected by an evidence gap. Cite specific source IDs for material facts. Separate interpretations from observations and recommend feasible checks that could change the next decision.
3. Trace claims to actual passages and scopes. Verify dates, contradictory evidence, and denominators. Cite market context only when relevant and source-compatible; its IDs are listed in the source pack.
4. Run:

```sh
npm run scout -- brief --from .market-scout/case/compare-01 --narrative .market-scout/case/narrative-v1.json --out .market-scout/case/brief-01
```

5. Read `brief.md`, including tables and the source register. Correct weak prose or citations in the working draft and generate a new run. Do not fix validation by attaching unrelated IDs or swapping a new comparison under stale prose.

Without `--narrative`, the command produces a calculated summary, not an authored analytical memo. Label it accordingly. Authoring uses the assistant session; the CLI needs no application AI key.

## Deliver

Return the readable brief and run directory with a short answer. State dates and material evidence gaps once. Identify the next evidence worth obtaining instead of giving an unsupported investment recommendation.

New evidence needs a new research/screen/compare chain. Preserve the original run. Generating local artifacts does not publish them, contact businesses, or alter the prepared dashboard.
