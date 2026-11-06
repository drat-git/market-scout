# Writing and citation guide

Answer the configured question in the vocabulary of its industry. A good brief leads with what can be established, explains why it matters, considers alternatives, and prioritizes evidence that could change the next decision. Do not force all cases into an expansion recommendation.

## Narrative contract

Copy `narrative.template.json` from the compare run and preserve `caseId`, `datasetVersion`, `contextHash`, and the full `comparison` object. Add a title and sections:

```json
{
  "title":"A question-specific finding",
  "kind":"finding",
  "text":"A supported observation and its scope.",
  "evidenceIds":["an-actual-source-id-from-the-pack"],
  "table":{"columns":["Business","Documented capability","Follow-up"],"rows":[["Name","Scoped fact","Next check"]]}
}
```

The table is optional; every row must match the columns. Kinds: `finding`, `interpretation`, `limitation`, `next-step`. Findings need supporting references. Factual premises in other section types still need citations even when the schema permits an empty list.

`brief-input.json.sources` is the citation register. It includes selected business evidence and optional configured context IDs such as `context:market-id:metric-id`. Context has a source/value/period/boundary, not a fabricated quotation. Do not cite an unrelated business simply to satisfy a reference check. Excluded-business sources are unavailable. Local document sources use `sourceRef` when no public URL exists.

## Claim-to-source review

For each material claim, verify passage support, business identity, exact scope, source date, and numerical denominator. General menus cannot establish local capabilities. Missing or conflicting evidence stays unresolved. A valid reference ID with an irrelevant passage is still an invalid citation.

Use the calculated comparison, including units, rather than recomputing counts in prose. Avoid attributing a sample difference to unmet demand, capacity, quality, margins, or investment merit without corresponding evidence. Context periods/boundaries must be compatible before comparing numeric values.

Keep sections short enough that readers can tell which source supports which claim. Tables should name concrete businesses or scopes where useful. An operational comparator is a documented configuration, not automatically a similar financial business.

## Decision usefulness

- Lead with an answer, not an announcement of the memo.
- Explain the importance of differences rather than repeat cards or counts.
- Consider at least one plausible alternative explanation for a consequential difference.
- Order follow-ups by their potential to change the next decision, with a realistic source/method.
- Keep context, interpretations, and unresolved assumptions distinguishable.

Follow-ups depend on the industry: contract mix, service access, staffing, distribution reach, site economics, supplier relationships, licensing, or other relevant operating facts. Treat these as questions until researched. Suggested outreach is not permission to send it.

## Revisions

The validator checks source IDs and the exact case/evidence/criteria/selection snapshot. It does not establish semantic truth. If inputs change, regenerate comparison and re-review prose; do not paste a new snapshot under the old analysis without checking it.

Read the rendered `brief.md`, tables, and source register. The assistant's own source check is not independent analyst approval. Preserve the original run and return both the readable memo and reproducible artifacts. Local generation does not publish or change the fixed dashboard examples.
