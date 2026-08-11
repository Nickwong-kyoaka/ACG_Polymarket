import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { getCopy, hrefWithLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ComfortMode = {
  slug: string;
  label: string;
  need: string;
  tagline: string;
  description: string;
  colorFrom: string;
  colorTo: string;
  supportCharacter: {
    name: string;
    slug: string;
    role: string;
    line: string;
  };
  sweetTalk: string[];
  voiceTracks: Array<{
    title: string;
    duration: string;
    texture: string;
  }>;
  storyPanels: Array<{
    title: string;
    body: string;
  }>;
  ritual: string[];
  unlocks: string[];
  stats: Array<{
    label: string;
    value: string;
  }>;
};

export const comfortModes: ComfortMode[] = [
  {
    slug: "loneliness",
    label: "Loneliness",
    need: "When the room feels too quiet",
    tagline: "A soft check-in where a character stays nearby without asking you to perform.",
    description:
      "Use this mode for gentle presence, friend-coded lines, calm voice slots, and small story beats about being seen.",
    colorFrom: "#ff9f7a",
    colorTo: "#ffd2a1",
    supportCharacter: {
      name: "Akari Hoshino",
      slug: "akari-hoshino",
      role: "Warm signal captain",
      line: "I saved you a seat. We can move at your pace tonight.",
    },
    sweetTalk: [
      "You do not have to be exciting to be worth staying with.",
      "I am here for the quiet version of you too.",
      "Let this be a small room where nobody has to win attention.",
    ],
    voiceTracks: [
      { title: "Window seat check-in", duration: "02:20", texture: "Low city rain" },
      { title: "Stay beside me loop", duration: "03:10", texture: "Warm room tone" },
    ],
    storyPanels: [
      { title: "Panel 01", body: "A lamp turns on before the user reaches the door." },
      { title: "Panel 02", body: "Akari slides a cup across the table without a big speech." },
      { title: "Panel 03", body: "The support ticker glows, but nobody compares scores." },
      { title: "Panel 04", body: "The night ends with a saved wallpaper and a calmer pulse." },
    ],
    ritual: ["Choose one sweet-talk card", "Play a voice placeholder", "Support one favorite"],
    unlocks: ["Cozy window avatar frame", "AI-generated dusk wallpaper", "Quiet friend profile skin"],
    stats: [
      { label: "Sweetness", value: "92" },
      { label: "Energy", value: "Low" },
      { label: "Best time", value: "Late night" },
    ],
  },
  {
    slug: "stress",
    label: "Stress",
    need: "When everything is too loud",
    tagline: "A pressure-release lane with steady breathing, gentle focus, and no rivalry language.",
    description:
      "Use this mode when the day feels crowded. The page keeps copy short, the sounds slow, and the CTA positive.",
    colorFrom: "#5fa8d3",
    colorTo: "#bee9e8",
    supportCharacter: {
      name: "Ren Tsukimori",
      slug: "ren-tsukishiro",
      role: "Steady composer",
      line: "One bar at a time. You do not need to finish the whole song tonight.",
    },
    sweetTalk: [
      "Your worth is not measured by how much pressure you can carry.",
      "Let the next minute be smaller than the whole problem.",
      "I will count the beat. You only need to breathe with it.",
    ],
    voiceTracks: [
      { title: "Four-count reset", duration: "01:40", texture: "Soft metronome" },
      { title: "Desk light cooldown", duration: "02:45", texture: "Paper and pencil" },
    ],
    storyPanels: [
      { title: "Panel 01", body: "Ren lowers the tempo until the room stops rushing." },
      { title: "Panel 02", body: "A checklist folds into three tiny steps." },
      { title: "Panel 03", body: "The support button becomes a thank-you, not a bet." },
      { title: "Panel 04", body: "The last panel leaves space for tomorrow." },
    ],
    ritual: ["Name the loudest worry", "Pick the smallest next step", "Close with a thank-you"],
    unlocks: ["Blue note avatar frame", "AI-generated rain desk wallpaper", "Calm tempo profile skin"],
    stats: [
      { label: "Sweetness", value: "84" },
      { label: "Energy", value: "Steady" },
      { label: "Best time", value: "After tasks" },
    ],
  },
  {
    slug: "study-fatigue",
    label: "Study fatigue",
    need: "When your brain is fogged out",
    tagline: "A cute focus break for tired students, creators, and late-night grinders.",
    description:
      "Use this mode between study blocks. It gives bright reassurance, tiny comic rewards, and a return-to-focus CTA.",
    colorFrom: "#f4c430",
    colorTo: "#fff2a8",
    supportCharacter: {
      name: "Mira Kagetsu",
      slug: "mira-kagetsu",
      role: "Wildcard dancer",
      line: "You already showed up. That counts before the score does.",
    },
    sweetTalk: [
      "Rest is part of learning, not a bug in your discipline.",
      "Your tired brain is still trying for you. Be kind to it.",
      "One page later is still progress. One breath now is allowed.",
    ],
    voiceTracks: [
      { title: "Ten-minute break bell", duration: "00:45", texture: "Cafe sparkle" },
      { title: "Back-to-focus cue", duration: "01:30", texture: "Pencil tap rhythm" },
    ],
    storyPanels: [
      { title: "Panel 01", body: "Mira catches a falling sticky note with dramatic flair." },
      { title: "Panel 02", body: "The page turns into a snack break stage." },
      { title: "Panel 03", body: "A tiny support unit lands like a star sticker." },
      { title: "Panel 04", body: "The desk returns, less scary than before." },
    ],
    ritual: ["Drink water", "Read one comic panel", "Return for one tiny block"],
    unlocks: ["Star sticker avatar frame", "AI-generated study desk wallpaper", "Break-time profile skin"],
    stats: [
      { label: "Sweetness", value: "89" },
      { label: "Energy", value: "Bright" },
      { label: "Best time", value: "Pomodoro break" },
    ],
  },
  {
    slug: "sleep",
    label: "Sleep",
    need: "When the day will not let go",
    tagline: "A low-light mode for winding down with slower words, softer panels, and sleepy ASMR slots.",
    description:
      "Use this mode as an entertainment wind-down. It keeps stakes low and turns support into a gentle good-night ritual.",
    colorFrom: "#4c5f8f",
    colorTo: "#c7d2fe",
    supportCharacter: {
      name: "Shiori Archive",
      slug: "shiori-archive",
      role: "Archive keeper",
      line: "I will shelve the heavy thoughts. You can pick them up tomorrow if you still need them.",
    },
    sweetTalk: [
      "You are allowed to end the day without solving every thread.",
      "Let tomorrow be the page that carries the next line.",
      "Nothing here needs you to prove anything before you rest.",
    ],
    voiceTracks: [
      { title: "Library rain loop", duration: "04:00", texture: "Rain and pages" },
      { title: "Good-night archive", duration: "02:35", texture: "Soft whisper placeholder" },
    ],
    storyPanels: [
      { title: "Panel 01", body: "Shiori closes a glowing folder labeled later." },
      { title: "Panel 02", body: "The market board dims into a night-light." },
      { title: "Panel 03", body: "A blanket pattern becomes an AI wallpaper reward." },
      { title: "Panel 04", body: "The last speech bubble simply says good night." },
    ],
    ritual: ["Lower the brightness", "Play a sleepy placeholder", "Save one kind line"],
    unlocks: ["Moon archive avatar frame", "AI-generated blanket wallpaper", "Night library profile skin"],
    stats: [
      { label: "Sweetness", value: "95" },
      { label: "Energy", value: "Very low" },
      { label: "Best time", value: "Before bed" },
    ],
  },
  {
    slug: "low-confidence",
    label: "Low confidence",
    need: "When you feel smaller than your effort",
    tagline: "A confidence refill that praises effort, taste, and character love without turning it into a contest.",
    description:
      "Use this mode when you need fan-positive affirmation. It frames support as care, not proof that one fan is better.",
    colorFrom: "#fb7185",
    colorTo: "#fed7aa",
    supportCharacter: {
      name: "Akari Hoshino",
      slug: "akari-hoshino",
      role: "Warm signal captain",
      line: "I see the effort you keep hiding in the margins.",
    },
    sweetTalk: [
      "Your taste is allowed to be sincere, even if nobody claps first.",
      "Small courage still counts as courage.",
      "You do not need a perfect version of yourself to be loved by your favorites.",
    ],
    voiceTracks: [
      { title: "Tiny win applause", duration: "01:15", texture: "Soft crowd shimmer" },
      { title: "Mirror pep talk", duration: "02:05", texture: "Warm studio air" },
    ],
    storyPanels: [
      { title: "Panel 01", body: "A draft post waits with the cursor blinking." },
      { title: "Panel 02", body: "Akari points to the one line that already shines." },
      { title: "Panel 03", body: "The support CTA becomes a ribbon, not a scoreboard." },
      { title: "Panel 04", body: "The user posts one sincere sentence." },
    ],
    ritual: ["Write one tiny win", "Pick an affirmation", "Pin a favorite with pride"],
    unlocks: ["Courage ribbon avatar frame", "AI-generated sunrise wallpaper", "Brave note profile skin"],
    stats: [
      { label: "Sweetness", value: "90" },
      { label: "Energy", value: "Rising" },
      { label: "Best time", value: "Before posting" },
    ],
  },
  {
    slug: "heartbreak",
    label: "Heartbreak",
    need: "When affection has nowhere soft to land",
    tagline: "A tender room for heavy feelings, fictional devotion, and sweet comic relief.",
    description:
      "Use this mode for a gentle fictional container. It does not replace real support, but it can make the next breath feel less lonely.",
    colorFrom: "#9f7aea",
    colorTo: "#fecdd3",
    supportCharacter: {
      name: "Ren Tsukimori",
      slug: "ren-tsukishiro",
      role: "Steady composer",
      line: "Love leaving a bruise does not make your heart foolish.",
    },
    sweetTalk: [
      "The love you gave still says something kind about you.",
      "You can miss someone and still choose a softer evening.",
      "Let your favorite hold the scene while you put yourself back in the story.",
    ],
    voiceTracks: [
      { title: "After-message silence", duration: "02:50", texture: "Night train hum" },
      { title: "Soft goodbye practice", duration: "03:30", texture: "Distant piano" },
    ],
    storyPanels: [
      { title: "Panel 01", body: "A message window closes without a dramatic crash." },
      { title: "Panel 02", body: "Ren places a melody under the unsent words." },
      { title: "Panel 03", body: "A comic panel lets the tears exist without judgment." },
      { title: "Panel 04", body: "The final frame points back to the user's own name." },
    ],
    ritual: ["Mute the painful loop", "Read the softest card", "Support a character who feels safe"],
    unlocks: ["Gentle repair avatar frame", "AI-generated train window wallpaper", "After-rain profile skin"],
    stats: [
      { label: "Sweetness", value: "93" },
      { label: "Energy", value: "Tender" },
      { label: "Best time", value: "After midnight" },
    ],
  },
];

export function getComfortMode(slug: string) {
  return comfortModes.find((mode) => mode.slug === slug);
}

export function ComfortNotice({ className, locale = "en" }: { className?: string; locale?: Locale }) {
  const copy = getCopy(locale);

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-black/10 bg-white/80 px-5 py-4 text-sm leading-7 text-slate-600 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]",
        className,
      )}
    >
      {copy.comfort.notice}
    </div>
  );
}

export function ComfortModeCard({ mode, locale = "en" }: { mode: ComfortMode; locale?: Locale }) {
  const copy = getCopy(locale);

  return (
    <Surface className="group overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_-42px_rgba(15,23,42,0.55)]">
      <div
        className="h-3"
        style={{ background: `linear-gradient(90deg, ${mode.colorFrom}, ${mode.colorTo})` }}
      />
      <div className="flex h-full flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {mode.need}
            </p>
            <h3 className="mt-3 font-display text-3xl text-slate-950">{mode.label}</h3>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white"
            style={{ background: mode.colorFrom }}
          >
            {copy.common.room}
          </span>
        </div>
        <p className="text-sm leading-7 text-slate-600">{mode.tagline}</p>
        <div className="mt-auto flex flex-wrap gap-2">
          {mode.stats.map((stat) => (
            <span
              key={stat.label}
              className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {stat.label}: {stat.value}
            </span>
          ))}
        </div>
        <Link
          href={hrefWithLocale(`/comfort/${mode.slug}`, locale)}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {locale === "cn" ? `打開 ${mode.label}` : `Open ${mode.label.toLowerCase()} mode`}
        </Link>
      </div>
    </Surface>
  );
}

export function SweetTalkCards({
  mode,
  compact = false,
  locale = "en",
}: {
  mode: ComfortMode;
  compact?: boolean;
  locale?: Locale;
}) {
  return (
    <div className={cn("grid gap-4", compact ? "" : "sm:grid-cols-3")}>
      {mode.sweetTalk.map((line, index) => (
        <div
          key={line}
          className="relative overflow-hidden rounded-[1.75rem] border border-black/10 bg-[#fffdf9] p-5"
        >
          <div
            className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl"
            style={{ background: mode.colorFrom }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {locale === "cn" ? "情話卡" : "Sweet talk"} {String(index + 1).padStart(2, "0")}
          </p>
          <p className="relative mt-4 text-base leading-8 text-slate-700">{line}</p>
        </div>
      ))}
    </div>
  );
}

export function VoicePlayerPlaceholders({ mode, locale = "en" }: { mode: ComfortMode; locale?: Locale }) {
  const copy = getCopy(locale);

  return (
    <div className="grid gap-4">
      {mode.voiceTracks.map((track) => (
        <div key={track.title} className="rounded-[1.75rem] bg-slate-950 p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                {locale === "cn" ? "語音 / ASMR 預留位" : "Voice / ASMR placeholder"}
              </p>
              <h3 className="mt-3 font-display text-2xl">{track.title}</h3>
              <p className="mt-2 text-sm text-white/65">
                {track.texture} - {track.duration}
              </p>
            </div>
            <button
              type="button"
              disabled
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60"
            >
              {copy.common.locked}
            </button>
          </div>
          <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs text-white/50">
            <span>0:00</span>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full w-1/3 rounded-full"
                style={{ background: `linear-gradient(90deg, ${mode.colorFrom}, ${mode.colorTo})` }}
              />
            </div>
            <span>{track.duration}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StoryPanelStrip({ mode, locale = "en" }: { mode: ComfortMode; locale?: Locale }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {mode.storyPanels.map((panel, index) => (
        <article
          key={panel.title}
          className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/90"
        >
          <div
            className="flex h-36 items-end p-4 text-white"
            style={{
              background: `linear-gradient(135deg, ${mode.colorFrom}, ${mode.colorTo})`,
            }}
          >
            <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
              {locale === "cn" ? "場景" : "Scene"} {index + 1}
            </span>
          </div>
          <div className="p-5">
            <h3 className="font-display text-2xl text-slate-950">{panel.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{panel.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CharacterSupportCta({ mode, locale = "en" }: { mode: ComfortMode; locale?: Locale }) {
  return (
    <Surface className="overflow-hidden">
      <div
        className="p-6 text-white sm:p-8"
        style={{ background: `linear-gradient(135deg, ${mode.colorFrom}, ${mode.colorTo})` }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
          Character support CTA
        </p>
        <h2 className="mt-4 font-display text-4xl leading-tight">{mode.supportCharacter.name}</h2>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
          {mode.supportCharacter.role}
        </p>
        <p className="mt-5 max-w-2xl rounded-[1.5rem] bg-black/15 px-5 py-4 text-sm leading-7 text-white/90">
          {mode.supportCharacter.line}
        </p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <p className="text-sm leading-7 text-slate-600">
          {locale === "cn"
            ? "應援份數維持正向。這個 CTA 是慶祝喜歡的角色，不是踩低其他粉絲或角色。"
            : "Support units stay positive-only. The CTA celebrates a favorite character without putting another fan or character down."}
        </p>
        <Link
          href={hrefWithLocale(`/character/${mode.supportCharacter.slug}`, locale)}
          className="inline-flex items-center justify-center rounded-full bg-[#db5d35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c14a24]"
        >
          {locale === "cn" ? "支持這個角色" : "Support this character"}
        </Link>
      </div>
    </Surface>
  );
}

export function RitualChecklist({ mode, locale = "en" }: { mode: ComfortMode; locale?: Locale }) {
  return (
    <Surface className="p-6 sm:p-8">
      <SectionHeading
        eyebrow={locale === "cn" ? "小儀式" : "Tiny ritual"}
        title={locale === "cn" ? "三步安慰循環" : "A three-step comfort loop"}
        description={
          locale === "cn"
            ? "循環刻意做得很小：感受一下、收下一句甜話，再用不對立的方式表達支持。"
            : "The loop is intentionally small: feel something, receive something sweet, then express support without conflict."
        }
      />
      <div className="mt-8 grid gap-3">
        {mode.ritual.map((step, index) => (
          <div key={step} className="flex gap-4 rounded-[1.5rem] bg-[#fff9f2] p-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: mode.colorFrom }}
            >
              {index + 1}
            </span>
            <p className="pt-1 text-sm leading-7 text-slate-600">{step}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}

export function UnlockPreview({ mode, locale = "en" }: { mode: ComfortMode; locale?: Locale }) {
  return (
    <Surface className="p-6 sm:p-8">
      <SectionHeading
        eyebrow={locale === "cn" ? "解鎖物" : "Unlocks"}
        title={locale === "cn" ? "為喜歡而存在的外觀，不是戰力" : "Cosmetics for affection, not advantage"}
        description={
          locale === "cn"
            ? "這些是未來商店物品的前端預留位：頭像框、個人頁皮膚、壁紙與漫畫掉落。"
            : "These are frontend placeholders for future shop items: avatar frames, profile skins, wallpapers, and comic drops."
        }
      />
      <div className="mt-8 grid gap-4">
        {mode.unlocks.map((unlock) => (
          <div
            key={unlock}
            className="rounded-[1.5rem] border border-dashed border-black/15 bg-white/70 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
              {locale === "cn" ? "AI 生成友善" : "AI-generated friendly"}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{unlock}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
