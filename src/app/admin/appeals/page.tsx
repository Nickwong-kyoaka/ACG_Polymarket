import { ModerationAppealForm } from "@/components/moderation-appeal-form";
import { requireAdminSessionUserId } from "@/lib/auth";
import { listModerationAppeals } from "@/lib/moderation-appeals";

export const dynamic = "force-dynamic";
export default async function AppealsPage() {
  await requireAdminSessionUserId();
  const appeals = await listModerationAppeals();
  return <div className="grid gap-5"><h1 className="font-display text-4xl">Moderation appeals</h1>{appeals.map((item) => <article className="exchange-panel p-6" key={item.id}><p className="text-xs text-slate-500">{item.reportId} · {item.createdAt}</p><p className="mt-3 whitespace-pre-wrap">{item.reason}</p>{item.decision ? <p className="mt-4 text-sm text-slate-500">Reviewed</p> : <ModerationAppealForm id={item.id} locale="en" admin />}</article>)}</div>;
}
