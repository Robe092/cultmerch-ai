# CultMerch AI — Devpost submission draft (English)

**Status: DRAFT.** Do not submit until a public functional application, a public repository with license, and current Qloo connectivity have been verified. Review the current form's required fields before final submission.

## Project name
CultMerch AI

## Tagline
An explainable cultural merchandising agent that turns Qloo taste signals into stock- and margin-constrained collections.

## Inspiration
Small brands and cultural venues need merchandise that fits an audience without ignoring available stock and margin. A text-only suggestion can sound plausible while giving the merchandiser little evidence for the choice. We wanted a workflow that shows where an audience signal came from and how it changed a feasible collection.

## What it does
A merchandiser describes the audience and can add named cultural references with explicit priorities. CultMerch plans entity searches, queries Qloo for cross-domain affinities, and matches those signals to a 50-product synthetic catalog. It filters out zero-stock and insufficient-margin entries, then compares the same brief and constraints without and with Qloo signals. Each item exposes its evidence chain. A human reviews the collection before downloading a JSON manifest or CSV.

## How we built it / the role of Qloo
Next.js 15.5, React 19, TypeScript, Tailwind and Zod provide the application and API contracts. The orchestrator uses Qloo `/search` to resolve audience anchors and catalog brands, then `/v2/insights` to request cultural tags and targeted brand affinities. Qloo scores and reference priorities affect the ranking. Product-to-brand links and tag translations are explicit local editorial mappings, not claims that Qloo returns or endorses these products.

Optional Gemini can interpret briefs and write copy; the agent can also use disclosed deterministic rules. Qloo is the sponsor-specific source of cross-domain signals. The comparator isolates those signals from the shared brief interpretation, catalog and hard constraints.

## Evidence and what it means
An offline replay on 29 October reproduced six historical scenario calculations from archived response signals using the current catalog/scorer. Tokyo Jazz changed two references with a theoretical margin difference of +€60.50; Monolith changed one with −€8.50; Cinema changed none with €0 difference. These are historical catalog calculations, not current live benchmarks, observed revenue or independent evidence of better taste. The archived files report live Qloo capture on 16 October; their external origin cannot be authenticated from the saved JSON alone.

Current results may differ with audience seeds, LLM interpretation, provider responses and catalog changes. The final demonstration must describe the values actually shown. Do not present the baseline as a benchmark against every generic LLM.

## Challenges
Connecting broad cultural signals to specific stock required an explicit matching layer. We separate exact tags, local translations and declared catalog-brand associations. Missing scores contribute no invented affinity bonus. We preserve negative and zero comparison outcomes. Another challenge was approval consistency after reload: saved item decisions and notes now restore correctly, while stored live responses are labeled cached.

## Accomplishments
A complete local workflow links cultural evidence to feasible product choices, an auditable comparator, human approval and guarded exports. The 29 October audit distinguishes automated simulations, historical replays and live checks instead of counting unverified integration tests as passing.

## What we learned
A higher internal Qloo-alignment score is not evidence of purchase intent. A useful merchandising assistant must expose the editorial bridge from signal to SKU, preserve business constraints, and allow a human to disagree. Real commercial validation requires a merchant catalog and a prospective experiment.

## What's next
Merchant-owned catalog integration, shared durable storage for distributed hosting, direct commerce connectors, and a real conversion study. These are future work, not delivered integrations.

## Testing instructions
See `TESTING_EN.md`. The UI includes an expandable English guide. All catalog data is synthetic. The current store is single-server temporary storage; distributed persistence is not implemented.

## Built with
Qloo API, Next.js, React, TypeScript, Tailwind CSS, Zod, Lucide; optional Google Gemini. Node test and Puppeteer for local verification.

## Links and verification status
- Public application: **NOT_VERIFIED — required**
- Public source repository: https://github.com/Robe092/cultmerch-ai — verified accessible without authentication on 29 October 2026.
- License: MIT, `LICENSE`; detected as MIT by GitHub and verified through its public API on 29 October 2026.
- Optional demo video: **not recorded**

Official sources checked 29 October 2026: https://qloo.devpost.com/ ; https://qloo.devpost.com/rules ; https://qloo.devpost.com/details/dates . The video is optional and no video duration cap was found on these current pages. The former Qloo LLM hackathon's three-minute rule does not govern this event.

Recorded Qloo response data is kept private and is excluded from the public source repository, according to the official hackathon developer guide. Public tests use synthetic fixtures.
