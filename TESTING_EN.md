# Judge walkthrough and testing instructions

The current application uses French labels. An expandable English guide is visible at the top of each screen.

1. On **Dashboard**, enter an audience brief such as `Fans of John Coltrane, Japanese raw denim, analog audio and handmade ceramics`. For a controlled single-anchor run, review/remove unwanted references under **Analyses** first. The three example buttons also populate their own named references; their results need not equal the historical evaluation cases, which used no manual seeds.
2. Keep the minimum margin at **35%**. Click **Exécuter l’analyse** (Run analysis). With authorized credentials, wait for real Qloo results; without credentials in development this is explicitly a simulation. Do not infer connectivity from the presence of a key.
3. On **Collections**, inspect A (without Qloo) and B (with Qloo). Both use the same brief interpretation, catalog and constraints. Read the actual changed-reference count and signed theoretical margin difference. A zero or negative difference is a valid outcome.
4. On **Analyses**, expand **Voir les entités résolues et la provenance des appels** to inspect anchors, request states and original timestamps. **Voir les étapes de décision de l’agent** shows tool selection, filters and matching.
5. On **Catalogue**, click a product to inspect **Pourquoi cette référence ?** (Why this item?). The chain is audience anchor → Qloo signal → local product match. Editorial brand links do not mean Qloo certifies the product or the brand endorses it.
6. On **Approbations**, add a review note and click **Approuver** for one piece. Progress must be 1/4 and export must remain blocked. **Demander révision** revokes approval. **Tout approuver** records all decisions. Export JSON/CSV via **Exporter la collection** or **Exports & traçabilité**.
7. Reload the same analysis URL: decisions and notes remain visible. Stored live evidence is labeled **Qloo en cache**. A new visit to the root URL opens a clean illustrative preview, not somebody else's latest collection.
8. Change the brief after running: the stale-results warning appears and approval/export are disabled until another analysis completes.

## Negative cases

- `Only skincare products, no clothing`: at most two suitable skincare products in this catalog; never pad to four.
- `Only squash rackets and competition squash balls`: no relevant products; approval/export must remain unavailable.
- Stock-zero and insufficient-margin catalog entries must never be selected.
- No Qloo score must be fabricated when the provider omits it. Partial failures must be disclosed.

## What the demo establishes

The workflow, calculations, traceability and approval/export guards can be tested locally. Archived signals can be replayed through the current scorer. Neither proves sales, conversion lift, independent cultural relevance, or current external API availability. Public deployment must be tested from a fresh external browser through approval and export.
