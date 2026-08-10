import type { Metadata } from "next";
import Link from "next/link";
import {
  CharacterSupportCta,
  ComfortModeCard,
  ComfortNotice,
  StoryPanelStrip,
  SweetTalkCards,
  VoicePlayerPlaceholders,
  comfortModes,
} from "@/components/comfort-hub";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = {
  title: "Comfort Room | ACG Support Market",
  description:
    "A healing fandom room with sweet-talk cards, ASMR placeholders, comic panels, and positive character support.",
};

export default function ComfortPage() {
  const featuredMode = comfortModes[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-10 sm:py-14">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-black/10 bg-slate-950 px-6 py-10 text-white shadow-[0_30px_120px_-50px_rgba(15,23,42,0.65)] sm:px-10 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,159,122,0.42),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(190,233,232,0.28),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(51,65,85,0.84))]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#ffd2a1]">
              Healing fandom room
            </p>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none sm:text-6xl lg:text-7xl">
                Sweet support for days when your favorite character feels like home.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/75">
                Pick a comfort mode, read a few soft lines, preview voice and ASMR slots, then
                support a character without rivalry, loser boards, or pressure to prove anything.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#comfort-modes"
                className="rounded-full bg-[#ff9f7a] px-6 py-4 text-sm font-semibold text-slate-950 transition hover:bg-[#ffd2a1]"
              >
                Choose a comfort mode
              </Link>
              <Link
                href="/market"
                className="rounded-full border border-white/20 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Visit support market
              </Link>
            </div>
          </div>

          <Surface className="border-white/10 bg-white/10 p-5 text-white shadow-none">
            <div className="rounded-[2rem] bg-white/90 p-5 text-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#db5d35]">
                Tonight preview
              </p>
              <h2 className="mt-3 font-display text-3xl">{featuredMode.label}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{featuredMode.tagline}</p>
              <div className="mt-5 grid gap-3">
                {featuredMode.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between rounded-2xl bg-[#fff8ef] px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-slate-500">{stat.label}</span>
                    <span className="font-bold text-slate-950">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <ComfortNotice className="mt-4 border-white/10 bg-white/10 text-white/75 shadow-none" />
          </Surface>
        </div>
      </section>

      <section id="comfort-modes" className="grid gap-8">
        <SectionHeading
          eyebrow="Choose a need"
          title="Six rooms for different kinds of tired"
          description="Each mode has its own sweet-talk deck, voice placeholders, comic panels, unlocks, and character support CTA."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {comfortModes.map((mode) => (
            <ComfortModeCard key={mode.slug} mode={mode} />
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="Positive loop"
            title="Read, listen, support, unlock"
            description="The comfort page is designed as a soft front door into the support economy. It is emotional expression first, token spending second."
          />
          <div className="mt-8 grid gap-4">
            {[
              "Sweet-talk cards for quick reassurance.",
              "Voice and ASMR placeholders for future uploaded tracks.",
              "Mini comic panels for short healing story beats.",
              "Character support CTAs that never frame other characters as enemies.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] bg-[#fff9f2] p-5 text-sm leading-7 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="overflow-hidden p-6 sm:p-8">
          <SectionHeading
            eyebrow="Sample deck"
            title="Soft words before market action"
            description="A mode can become a daily healing ritual before the user checks in, claims tokens, or supports a favorite."
          />
          <div className="mt-8">
            <SweetTalkCards mode={featuredMode} compact />
          </div>
        </Surface>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Voice and comic preview"
          title="Placeholders for ASMR, standee voice, and sweet story panels"
          description="No media pipeline is changed in this frontend slice. These cards reserve the product surface for future admin-uploaded or AI-generated comfort assets."
        />
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <VoicePlayerPlaceholders mode={featuredMode} />
          <StoryPanelStrip mode={featuredMode} />
        </div>
      </section>

      <CharacterSupportCta mode={featuredMode} />
    </div>
  );
}
