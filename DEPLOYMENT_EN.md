# Deployment requirements before submission

Status on 29 October 2026: the separate source repository https://github.com/Robe092/cultmerch-ai is public, with a verified MIT license. The Render Free deployment at https://cultmerch-ai.onrender.com completed a real Qloo workflow on 30 October 2026, including human approval and JSON/CSV exports. The provider key is configured only as a server secret; Gemini is absent. Do not publish the parent multi-project repository or `.env.local`.

## Supported demonstration topology

Run one long-lived Node process with `npm ci`, `npm run build`, then `npm start -- --hostname 0.0.0.0 --port <provider-port>`. Configure QLOO_API_KEY as a server-side hosting secret. Leave Gemini absent unless its use and cost are authorized. HTTPS and a stable public URL are required. One Node process must serve analysis, approval and export; the temporary-file store is not suitable for multiple isolated serverless instances. Do not claim the old Vercel configuration fixes that constraint.

For multi-instance/serverless hosting, implement and test a shared durable store first. Do not enable a paid plan or attach a billing method without explicit approval.

## Publication checklist

- Public GitHub/GitLab/Bitbucket repository containing only the sanitized source candidate, lockfile, English README/testing instructions and MIT LICENSE. Never include recorded Qloo API responses: the official hackathon guide permits only private server-side caching of those responses.
- Confirm GitHub/GitLab detects the license. Do not include `.env*` except `.env.example`, `node_modules`, `.next`, scratch stores, machine-specific archives or unrelated projects.
- Stable external application accessible without private access; verify in a fresh browser outside the local machine.
- Real Qloo run with traceable requests and meaningful product evidence. Verify quota and provider conditions before making calls.
- Analyze → inspect comparison → approve one item → approve all → export JSON/CSV → reload. Repeat after restarting the hosted process and document the temporary-storage limitation.
- Keep the app usable, free to judges, through the judging period. The rules and schedule differ on the judging end time; use the later rule deadline (5 November 2026 23:45 US Eastern / 6 November 05:45 Paris) as the availability target.
- Submit English description and testing instructions. A video is optional; if supplied, English narration/subtitles should explain the French labels.

External publication, access changes, official submission and paid resources require separate user authorization. A local source package is not a deployed app.

## Deployed hosting: Render Free web service

Official sources reviewed on 29 October 2026:
https://render.com/docs/free
https://render.com/docs/faq
https://render.com/docs/deploy-nextjs-app

A single Free instance was created with explicit user authorization. The account showed Hobby, no card on file, no pending charges, and unused free allowances before deployment. The initial deployment succeeded. After explicit owner authorization, QLOO_API_KEY was configured as a server secret and the service rebuilt from commit `822ec9ff4550f54a5662922e8ebb0978c66e6014`. The hosted live workflow passed on 30 October. Provider billing remains unconfirmed; the owner authorized the bounded checks and public activation despite that uncertainty.

- Service: Node Web Service, single Free instance. Do not select a static site for these API routes.
- Source: https://github.com/Robe092/cultmerch-ai, branch `main` (public source verified).
- Build: `npm ci --include=dev && npm run build`.
- Start: `npm start -- --hostname 0.0.0.0 --port "$PORT"`.
- Node: application tested locally on 24.11.1; confirm host Node version in its build log.
- Server secret: QLOO_API_KEY, only after access/cost is verified and secret transfer to Render is authorized. No Gemini key and no mock-production override for a live competition demo.
- No custom domain, paid database, persistent disk or paid instance is required for this candidate.
- Before creation: inspect the workspace payment method, remaining free quotas and billing controls. A Free compute plan can still incur bandwidth/build charges if a payment method is present. With no payment method, Render documents suspension rather than those charges when allowances are exceeded.
- Expect about one minute of cold-start loading after 15 minutes idle. All temporary data disappears on sleep/restart; approval/export must be completed during an active session. Explicitly disclose this prototype limitation.
- An account connection, terms acceptance, publication and any transfer of the Qloo secret are separate steps requiring appropriate user participation/authorization. Only this Free web service has been created. The Qloo key was added with explicit authorization. No Gemini secret, card, paid resources, disk, database or custom domain was added. HTML and six public JavaScript assets were checked and contained no copy of the actual Qloo key.
