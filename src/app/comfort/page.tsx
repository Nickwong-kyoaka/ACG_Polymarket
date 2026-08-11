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
import { getCopy, hrefWithLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";

export const metadata: Metadata = {
  title: "Comfort Room | ACG Support Market",
  description:
    "A healing fandom room with sweet-talk cards, ASMR placeholders, comic panels, and positive character support.",
};

export default async function ComfortPage() {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const featuredMode = comfortModes[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-10 sm:py-14">
      <section className="manga-panel relative overflow-hidden rounded-[2.8rem] bg-slate-950 px-6 py-10 text-white shadow-[0_30px_120px_-50px_rgba(15,23,42,0.65)] sm:px-10 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,159,122,0.42),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(190,233,232,0.28),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(51,65,85,0.84))]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#ffd2a1]">
              {copy.comfort.eyebrow}
            </p>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none sm:text-6xl lg:text-7xl">
                {copy.comfort.title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/75">
                {copy.comfort.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#comfort-modes"
                className="rounded-full bg-[#ff9f7a] px-6 py-4 text-sm font-semibold text-slate-950 transition hover:bg-[#ffd2a1]"
              >
                {copy.comfort.chooseCta}
              </Link>
              <Link
                href={hrefWithLocale("/market", locale)}
                className="rounded-full border border-white/20 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copy.comfort.marketCta}
              </Link>
            </div>
          </div>

          <Surface className="border-white/10 bg-white/10 p-5 text-white shadow-none">
            <div className="rounded-[2rem] bg-white/90 p-5 text-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#db5d35]">
                {copy.comfort.tonight}
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
            <ComfortNotice
              locale={locale}
              className="mt-4 border-white/10 bg-white/10 text-white/75 shadow-none"
            />
          </Surface>
        </div>
      </section>

      <section id="comfort-modes" className="grid gap-8">
        <SectionHeading
          eyebrow={copy.comfort.chooseEyebrow}
          title={copy.comfort.chooseTitle}
          description={copy.comfort.chooseDescription}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {comfortModes.map((mode) => (
            <ComfortModeCard key={mode.slug} mode={mode} locale={locale} />
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow={copy.comfort.loopEyebrow}
            title={copy.comfort.loopTitle}
            description={copy.comfort.loopDescription}
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
            eyebrow={copy.comfort.sampleEyebrow}
            title={copy.comfort.sampleTitle}
            description={copy.comfort.sampleDescription}
          />
          <div className="mt-8">
            <SweetTalkCards mode={featuredMode} compact locale={locale} />
          </div>
        </Surface>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow={copy.comfort.mediaEyebrow}
          title={copy.comfort.mediaTitle}
          description={copy.comfort.mediaDescription}
        />
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <VoicePlayerPlaceholders mode={featuredMode} locale={locale} />
          <StoryPanelStrip mode={featuredMode} locale={locale} />
        </div>
      </section>

      <CharacterSupportCta mode={featuredMode} locale={locale} />
    </div>
  );
}
