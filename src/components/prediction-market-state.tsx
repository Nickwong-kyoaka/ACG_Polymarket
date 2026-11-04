import type { PredictionLocale } from "./prediction-trade-model";
const marketStates: Record<string, [string, string, string, string]> = {
  DRAFT: ["Draft", "草稿", "Not published; trading is unavailable.", "尚未發佈，不能交易。"],
  OPEN: ["Trading open", "交易中", "Preview a trade before the deadline.", "截止前可預覽並確認交易。"],
  LOCKED: ["Trading closed", "已截止", "Awaiting a result proposal from the listed source.", "等待依指定來源提出結果。"],
  PROPOSED: ["Result proposed", "結果待確認", "Review the evidence; challenges are accepted until the deadline.", "請檢視證據；可在異議截止前提交挑戰。"],
  CHALLENGE: ["Challenge period", "異議期", "Review the proposed result and submit supporting evidence before the deadline.", "可檢視提案並在異議截止前提交證據。"],
  RESOLVED: ["Settled", "已結算", "Settlement is complete. Check your prediction history.", "已完成結算，可查看預測記錄。"],
  VOID: ["Voided", "已作廢", "The question was voided. Check your history for the refund.", "本題已作廢，可在記錄查看退款。"],
};
export function predictionState(status: string, locale: PredictionLocale) {
  const labels = marketStates[status] ?? ["Status unavailable", "狀態未明", "Trading is unavailable; check again later.", "目前不能交易，請稍後再查看。"];
  return { label: labels[locale === "zh-Hant" ? 1 : 0], next: labels[locale === "zh-Hant" ? 3 : 2] };
}
export function predictionProposalLabel(status: string, locale: PredictionLocale) {
  const labels: Record<string, [string, string]> = {
    PROPOSED: ["Proposed", "已提出"], CHALLENGED: ["Under review", "異議審核中"],
    CONFIRMED: ["Confirmed", "已確認"], VOIDED: ["Voided", "已作廢"],
  };
  return (labels[status] ?? ["Status unavailable", "狀態未明"])[locale === "zh-Hant" ? 1 : 0];
}
export function PredictionMarketState({ status, locale }: { status: string; locale: PredictionLocale }) {
  return <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-[#606A78]">{predictionState(status, locale).label}</span>;
}
