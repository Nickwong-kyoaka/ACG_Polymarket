import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CharacterSupportCta,
  ComfortModeCard,
  ComfortNotice,
  RitualChecklist,
  StoryPanelStrip,
  SweetTalkCards,
  UnlockPreview,
  VoicePlayerPlaceholders,
  comfortModes,
  getComfortMode,
} from "@/components/comfort-hub";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { hrefWithLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";

type ComfortModePageProps = {
  params: Promise<{ mode: string }>;
};

export function generateStaticParams() {
  return comfortModes.map((mode) => ({ mode: mode.slug }));
}

export async function generateMetadata({ params }: ComfortModePageProps): Promise<Metadata> {
  const { mode: modeSlug } = await params;
  const mode = getComfortMode(modeSlug);

  if (!mode) {
    return {
      title: "Comfort Mode | ACG Support Market",
    };
  }

  return {
    title: `${mode.label} Comfort | ACG Support Market`,
    description: mode.description,
  };
}

export default async function ComfortModePage({ params }: ComfortModePageProps) {
  const locale = await getRequestLocale();
  const { mode: modeSlug } = await params;
  const mode = getComfortMode(modeSlug);

  if (!mode) {
    notFound();
  }

  const relatedModes = comfortModes.filter((entry) => entry.slug !== mode.slug).slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-10 sm:py-14">
      <section
        className="overflow-hidden rounded-[2.5rem] border border-black/10 shadow-[0_30px_120px_-50px_rgba(15,23,42,0.55)]"
        style={{ background: `linear-gradient(135deg, ${mode.colorFrom}, ${mode.colorTo})` }}
      >
        <div className="grid gap-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.20),rgba(255,255,255,0.06))] px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-12">
          <div className="space-y-6 text-white">
            <Link
              href={hrefWithLocale("/comfort", locale)}
              className="inline-flex rounded-full bg-black/15 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-black/25"
            >
              {locale === "cn" ? "返回安慰室" : "Back to comfort rooms"}
            </Link>
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/75">
                {mode.need}
              </p>
              <h1 className="font-display text-5xl leading-none sm:text-6xl lg:text-7xl">
                {mode.label}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/90">{mode.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {mode.stats.map((stat) => (
                <span
                  key={stat.label}
                  className="rounded-full bg-black/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
                >
                  {stat.label}: {stat.value}
                </span>
              ))}
            </div>
          </div>

          <Surface className="bg-white/90 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#db5d35]">
              {locale === "cn" ? "第一句" : "First line"}
            </p>
            <p className="mt-4 font-display text-3xl leading-tight text-slate-950">
              {mode.supportCharacter.line}
            </p>
            <div className="mt-6 rounded-[1.5rem] bg-[#fff8ef] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {locale === "cn" ? "建議循環" : "Suggested loop"}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {locale === "cn"
                  ? `讀一張卡、播放一個預留語音，如果這間房讓你被接住一點，就支持 ${mode.supportCharacter.name}。`
                  : `Read one card, play one placeholder, then support ${mode.supportCharacter.name} if this room helped you feel a little more held.`}
              </p>
            </div>
          </Surface>
        </div>
      </section>

      <ComfortNotice locale={locale} />

      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow={locale === "cn" ? "情話卡" : "Sweet-talk cards"}
            title={locale === "cn" ? "會留下來的小句子" : "Small lines that stay with the user"}
            description={
              locale === "cn"
                ? "這些卡片把情緒表面做清楚，同時保持產品定位是粉絲娛樂。"
                : "These cards make the emotional surface explicit while keeping the product clearly in fandom entertainment."
            }
          />
          <div className="mt-8">
            <SweetTalkCards mode={mode} compact locale={locale} />
          </div>
        </Surface>

        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow={locale === "cn" ? "語音與 ASMR" : "Voice and ASMR"}
            title={locale === "cn" ? "未來立繪語音的音訊位置" : "Audio slots for future standee voice"}
            description={
              locale === "cn"
                ? "目前控制項刻意是預留位，展示未來管理員上傳或 AI 生成安慰音訊的位置。"
                : "The controls are intentionally placeholders in this slice. They show where admin-uploaded or AI-generated comfort audio can land later."
            }
          />
          <div className="mt-8">
            <VoicePlayerPlaceholders mode={mode} locale={locale} />
          </div>
        </Surface>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow={locale === "cn" ? "連環畫" : "Mini comic"}
          title={locale === "cn" ? "為這種需要準備的四格溫柔畫面" : "Four gentle panels for this comfort need"}
          description={
            locale === "cn"
              ? "每個模式都能承載短漫畫或分鏡故事，暫時不需要後端改動。"
              : "Each mode can host a short comic or story-board sequence without needing backend changes yet."
          }
        />
        <StoryPanelStrip mode={mode} locale={locale} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <RitualChecklist mode={mode} locale={locale} />
        <UnlockPreview mode={mode} locale={locale} />
      </section>

      <CharacterSupportCta mode={mode} locale={locale} />

      <section className="grid gap-8">
        <SectionHeading
          eyebrow={locale === "cn" ? "其他房間" : "Other rooms"}
          title={locale === "cn" ? "溫柔地換一間房，而不是滑到崩潰" : "Move gently instead of doom-scrolling"}
          description={
            locale === "cn"
              ? "設計鼓勵切換安慰需要，而不是比較角色或粉絲。"
              : "The design encourages changing the comfort need, not comparing characters or fans."
          }
        />
        <div className="grid gap-5 md:grid-cols-3">
          {relatedModes.map((relatedMode) => (
            <ComfortModeCard key={relatedMode.slug} mode={relatedMode} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}
