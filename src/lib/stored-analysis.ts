import type { ABComparisonResult, QlooDataState } from "@/types";

/** Reading a saved result never constitutes a fresh Qloo request. Capture times remain unchanged. */
export function asStoredAnalysis(analysis: ABComparisonResult): ABComparisonResult {
  const result = structuredClone(analysis);
  const cached = (state: QlooDataState): QlooDataState => state === "LIVE_QLOO" ? "CACHED_QLOO" : state;
  for (const branch of [result.branchA_without_qloo, result.branchB_with_qloo]) {
    branch.data_state = cached(branch.data_state);
    for (const item of branch.items) for (const proof of item.qloo_evidence || []) proof.state = cached(proof.state);
  }
  if (result.provenance) {
    result.provenance.qloo_state = cached(result.provenance.qloo_state);
    for (const entry of [...result.provenance.anchors, ...result.provenance.calls, ...result.provenance.signals, ...(result.provenance.target_brands || [])]) entry.state = cached(entry.state);
  }
  return result;
}
