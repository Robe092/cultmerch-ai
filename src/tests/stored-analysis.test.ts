import { it } from "node:test";
import assert from "node:assert/strict";
import { asStoredAnalysis } from "../lib/stored-analysis";
import synthetic from "./fixtures/stored-analysis.synthetic.json";
import type { ABComparisonResult } from "../types";
it("stored live evidence becomes cached without changing dates, scores or the original", () => {
  const original = synthetic.result as unknown as ABComparisonResult;
  const stored = asStoredAnalysis(original);
  assert.equal(stored.provenance?.qloo_state, "CACHED_QLOO");
  assert.equal(stored.branchB_with_qloo.data_state, "CACHED_QLOO");
  assert.ok(stored.provenance?.signals.every(s => s.state === "CACHED_QLOO"));
  assert.equal(stored.created_at, original.created_at);
  assert.deepEqual(stored.comparison_metrics, original.comparison_metrics);
  assert.equal(stored.provenance?.signals[0].captured_at, original.provenance?.signals[0].captured_at);
  assert.equal(original.provenance?.qloo_state, "LIVE_QLOO");
});
it("stored simulations and partial results are never promoted to verified Qloo data", () => {
  const original = structuredClone(synthetic.result) as unknown as ABComparisonResult;
  original.provenance!.qloo_state = "MIXED_QLOO";
  original.provenance!.signals[0].state = "MOCK_SIMULATED";
  const stored = asStoredAnalysis(original);
  assert.equal(stored.provenance?.qloo_state, "MIXED_QLOO");
  assert.equal(stored.provenance?.signals[0].state, "MOCK_SIMULATED");
});
