import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import cases from "../src/data/evaluation_cases.json";
import { AgentOrchestrator } from "../src/lib/agent-orchestrator";

const live = process.argv.includes("--live");
if (live) {
  const envFile = path.resolve(".env.local");
  if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  if (!process.env.QLOO_API_KEY) throw new Error("Clé Qloo absente : l’évaluation live ne peut pas être remplacée par un mock.");
}
const caseArgIndex = process.argv.indexOf("--case");
const targetCaseId = caseArgIndex !== -1 ? process.argv[caseArgIndex + 1] : null;
const resume = process.argv.includes("--resume");
const outputDir = path.resolve("docs/recommendation-evaluation");
fs.mkdirSync(outputDir, { recursive: true });
const results = [];
for (const scenario of cases) {
  if (targetCaseId && scenario.id !== targetCaseId) continue;
  const file = `${live ? "live" : "mock"}-${scenario.id}.json`;
  const filePath = path.join(outputDir, file);
  if (resume && fs.existsSync(filePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (existing && existing.passed !== undefined && existing.result) {
        console.log(`[Resume] Utilisation du résultat existant pour ${scenario.id}`);
        const row = {
          id: scenario.id,
          passed: existing.passed,
          mode: existing.result.provenance?.qloo_state,
          signal_count: existing.result.provenance?.signals?.length,
          elapsed_ms: 0,
          branchA: existing.checks?.[0],
          branchB: existing.checks?.[1],
          comparison: existing.result.comparison_metrics,
        };
        results.push(row);
        continue;
      }
    } catch {
      // Si fichier invalide, relancer
    }
  }
  const started = Date.now();
  const result = await new AgentOrchestrator({ mode: live ? "live_only" : "mock_only" }).runAnalysis(scenario.brief);
  const branches = [result.branchA_without_qloo, result.branchB_with_qloo];
  const checks = branches.map((branch) => ({
    name: branch === branches[0] ? "A_without_qloo" : "B_with_qloo",
    selected: branch.items.map((item) => ({ sku: item.product.sku, name: item.product.name, semantic: item.semantic_matches, qloo_score: item.qloo_score, qloo_matches: item.qloo_evidence?.map((proof) => ({ name: proof.name, anchor: proof.anchor_name, state: proof.state, method: proof.match_method, mapping_note: proof.mapping_note })) })),
    expected_hits: branch.items.filter((item) => scenario.expected_skus.includes(item.product.sku)).length,
    financial_invariants: branch.items.every((item) => item.product.stock_units > 0 && item.product.margin_pct >= 0.35),
    no_forbidden: branch.items.every((item) => !scenario.forbidden_skus.includes(item.product.sku)),
    no_padding: branch.items.length <= scenario.maximum_items,
  }));
  const passed = checks.every((branch) => branch.expected_hits >= scenario.minimum_expected && branch.financial_invariants && branch.no_forbidden && branch.no_padding);
  fs.writeFileSync(filePath, JSON.stringify({ scenario, result, checks, passed }, null, 2));
  const row = { id: scenario.id, passed, mode: result.provenance?.qloo_state, signal_count: result.provenance?.signals.length, elapsed_ms: Date.now() - started,
    branchA: checks[0], branchB: checks[1], comparison: result.comparison_metrics };
  results.push(row);
  console.log(JSON.stringify({ id: row.id, passed, mode: row.mode, changed: result.comparison_metrics.changed_skus, matched: result.branchB_with_qloo.items.filter((item) => item.qloo_evidence?.length).length, elapsed_ms: row.elapsed_ms }));
}
const report = { evaluated_at: new Date().toISOString(), mode: live ? "LIVE_ATTEMPT" : "MOCK_SIMULATED", catalog_sha256: crypto.createHash("sha256").update(fs.readFileSync("src/data/catalog_sample.json")).digest("hex"), cases_sha256: crypto.createHash("sha256").update(fs.readFileSync("src/data/evaluation_cases.json")).digest("hex"), results };
fs.writeFileSync(path.join(outputDir, `${live ? "live" : "mock"}-summary.json`), JSON.stringify(report, null, 2));
if (results.some((row) => !row.passed)) process.exitCode = 1;
