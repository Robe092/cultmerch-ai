export function JuryGuide() {
  return <details lang="en" className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
    <summary className="cursor-pointer font-semibold text-slate-900">Quick guide · Audience → Qloo evidence → Collection → Approval</summary>
    <p className="mt-3">CultMerch helps a merchandiser turn cultural tastes into a stock- and margin-constrained collection. This prototype uses 50 synthetic products.</p>
    <ol className="mt-3 list-decimal pl-5 space-y-2">
      <li>Use the audience brief on Dashboard. Configure named references in <strong>Analysis</strong>. <strong>Run analysis</strong> runs the workflow; <strong>Run analysis again</strong> reruns it.</li>
      <li><strong>Collections</strong> compares the same brief, catalog and constraints, without and with Qloo signals. Differences are theoretical catalog calculations, not measured sales.</li>
      <li><strong>Analysis</strong> shows resolved entities, request timestamps and evidence. In <strong>Catalog</strong>, open an item to inspect its signal-to-product link. Product-to-brand associations are local editorial data.</li>
      <li><strong>Approvals</strong> records individual decisions. <strong>Approve</strong> approves a piece; <strong>Request revision</strong> requests changes; <strong>Approve all</strong> approves the collection. Export JSON/CSV after all pieces are approved.</li>
    </ol>
    <p className="mt-3 text-xs"><strong>Data labels:</strong> “Live Qloo” = fresh API response; “Cached Qloo” = stored response, see original date; “Simulation — synthetic data” = synthetic signals; “Partial or mixed result” = incomplete/mixed provenance; “No usable Qloo data” = no usable Qloo data.</p>
  </details>;
}
