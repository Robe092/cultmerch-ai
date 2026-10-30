import type { MerchandisingScore } from "@/types";

/** Highlight evidence actually used by selected products; preserve raw signals in provenance. */
export function matchedQlooInsights(brief: string, items: Pick<MerchandisingScore, "qloo_evidence">[]): string[] {
  const names = items.flatMap((item) => (item.qloo_evidence || []).map((evidence) => evidence.name.trim()));
  return Array.from(new Set(names)).filter((name) => name && !brief.toLowerCase().includes(name.toLowerCase())).slice(0, 5);
}
