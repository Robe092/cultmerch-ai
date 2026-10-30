# Judge walkthrough and testing instructions

The application uses English labels. An expandable Quick guide is visible at the top of each screen. Original Qloo entity names and user-entered text are preserved.

1. On **Dashboard**, enter an audience brief such as `Fans of John Coltrane, Japanese raw denim, analog audio and handmade ceramics`. For the controlled single-anchor run verified on 30 October, remove **all** manual references under **Analysis** first (the counter should read 0), then use that exact English brief. The three example buttons also populate their own named references; their results need not equal the historical evaluation cases, which used no manual seeds.
2. Keep the minimum margin at **35%**. Click **Run analysis**. With authorized credentials, wait for real Qloo results; without credentials in development this is explicitly a simulation. Do not infer connectivity from the presence of a key.
3. On **Collections**, inspect A (without Qloo) and B (with Qloo). Both use the same brief interpretation, catalog and constraints. Read the actual changed-reference count and signed theoretical margin difference. A zero or negative difference is a valid outcome.
4. On **Analysis**, expand **Inspect resolved entities and request provenance** to inspect anchors, request states and original timestamps. **Inspect the agent decision steps** shows tool selection, filters and matching.
5. On **Catalog**, click a product to inspect **Why this product?** (Why this item?). The chain is audience anchor → Qloo signal → local product match. Editorial brand links do not mean Qloo certifies the product or the brand endorses it.
6. On **Approvals**, add a review note and click **Approve** for one piece. Progress must be 1/4 and export must remain blocked. **Request revision** revokes approval. **Approve all** records all decisions. Export JSON/CSV via **Export collection** or **Exports & provenance**.
7. Reload the same analysis URL: decisions and notes remain visible. Stored live evidence is labeled **Cached Qloo**. A new visit to the root URL opens a clean illustrative preview, not somebody else's latest collection.
8. Change the brief after running: the stale-results warning appears and approval/export are disabled until another analysis completes.

## Negative cases

- `Only skincare products, no clothing`: at most two suitable skincare products in this catalog; never pad to four.
- `Only squash rackets and competition squash balls`: no relevant products; approval/export must remain unavailable.
- Stock-zero and insufficient-margin catalog entries must never be selected.
- No Qloo score must be fabricated when the provider omits it. Partial failures must be disclosed.

## What the demo establishes

On 30 October 2026, the public host completed that controlled brief with 12 successful logical Qloo operations, 53 signals, four products with evidence and two changed references. The calculated margin difference was +EUR60.50 on the synthetic catalog. Human approval, blocked exports, JSON/CSV export and saved-result reload were verified on the public host; the evidence drawer and revision/reapproval were also exercised in the browser. Gemini was disabled.

These checks establish current integration and workflow behavior, not sales, conversion lift or independent cultural relevance. Provider responses can change. The Dashboard percentage is the arithmetic mean of individual product margin rates; the comparator uses total gross margin in euros, and the exported collection rate is weighted by retail value.

Render Free can sleep and clear its temporary storage. Start a new analysis if an old analysis URL is unavailable. New analyses consume the provider quota; provider costs must be checked for your own credentials. The owner authorized the recorded live checks and server activation despite unconfirmed provider billing conditions.
