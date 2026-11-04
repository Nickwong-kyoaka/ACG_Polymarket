import { notFound, redirect } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { ModerationAppealForm } from "@/components/moderation-appeal-form";
import { requireSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function MyModeration({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isPublicLocale(locale)) notFound();
  const userId = await requireSessionUserId().catch(() => null); if (!userId) redirect(localePath(locale, "/onboarding"));
  const decisions = await prisma.report.findMany({ where: { status: { in: ["RESOLVED", "DISMISSED"] }, OR: [{ commentId: null, post: { is: { authorId: userId } } }, { comment: { is: { userId } } }] }, orderBy: { createdAt: "desc" }, take: 50 });
  const zh = locale === "zh-Hant";
  return <div className="exchange-page"><h1 className="font-display text-5xl">{zh ? "審核與申訴" : "Review and appeals"}</h1>{decisions.map((item) => <article key={item.id} className="exchange-panel p-6"><h2 className="font-bold">{item.reason}</h2><p className="mt-3 text-sm text-slate-600">{item.status === "DISMISSED" ? (zh ? "原處置已撤回或檢舉已結案。" : "The report is dismissed or the original decision was reversed.") : (zh ? "如有需要補充的背景，可在這裡提交一次申訴。" : "You may submit an appeal with additional context here.")}</p>{item.status === "RESOLVED" ? <ModerationAppealForm id={item.id} locale={locale} /> : null}</article>)}{!decisions.length ? <p>{zh ? "目前沒有需要處理的審核記錄。" : "There are no moderation decisions for your content."}</p> : null}</div>;
}
