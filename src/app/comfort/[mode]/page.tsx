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
              href="/comfort"
              className="inline-flex rounded-full bg-black/15 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-black/25"
            >
              Back to comfort rooms
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
              First line
            </p>
            <p className="mt-4 font-display text-3xl leading-tight text-slate-950">
              {mode.supportCharacter.line}
            </p>
            <div className="mt-6 rounded-[1.5rem] bg-[#fff8ef] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Suggested loop
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Read one card, play one placeholder, then support {mode.supportCharacter.name} if
                this room helped you feel a little more held.
              </p>
            </div>
          </Surface>
        </div>
      </section>

      <ComfortNotice />

      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="Sweet-talk cards"
            title="Small lines that stay with the user"
            description="These cards make the emotional surface explicit while keeping the product clearly in fandom entertainment."
          />
          <div className="mt-8">
            <SweetTalkCards mode={mode} compact />
          </div>
        </Surface>

        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="Voice and ASMR"
            title="Audio slots for future standee voice"
            description="The controls are intentionally placeholders in this slice. They show where admin-uploaded or AI-generated comfort audio can land later."
          />
          <div className="mt-8">
            <VoicePlayerPlaceholders mode={mode} />
          </div>
        </Surface>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Mini comic"
          title="Four gentle panels for this comfort need"
          description="Each mode can host a short comic or story-board sequence without needing backend changes yet."
        />
        <StoryPanelStrip mode={mode} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <RitualChecklist mode={mode} />
        <UnlockPreview mode={mode} />
      </section>

      <CharacterSupportCta mode={mode} />

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Other rooms"
          title="Move gently instead of doom-scrolling"
          description="The design encourages changing the comfort need, not comparing characters or fans."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {relatedModes.map((relatedMode) => (
            <ComfortModeCard key={relatedMode.slug} mode={relatedMode} />
          ))}
        </div>
      </section>
    </div>
  );
}
