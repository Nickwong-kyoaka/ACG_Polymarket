import Link from "next/link";
import { ArrowRight, HeartHandshake, MoonStar, Sparkles } from "lucide-react";
import { localePath, pick, type PublicLocale } from "@/components/acg-locale";
import type { ComfortContent, ComfortMode } from "@/lib/types";

type ModeTranslation = { title: string; subtitle: string; description: string; promptLabel: string; tag: string };

const modeTranslations: Record<string, Record<PublicLocale, ModeTranslation>> = {
  loneliness: {
    en: { title: "Loneliness Room", subtitle: "Someone is on your side", description: "For nights when the room feels too quiet and you want a character to sit beside you.", promptLabel: "I do not want to be alone right now", tag: "Company" },
    "zh-Hant": { title: "孤單房間", subtitle: "有人會站在你這邊", description: "當房間安靜得太過分，讓一名角色坐在你身旁，陪你把今晚慢慢過完。", promptLabel: "我現在不想一個人", tag: "陪伴" },
  },
  stress: {
    en: { title: "Pressure Melt", subtitle: "Take your breath back first", description: "Short reassurance, slower pacing, and soft support before the next task.", promptLabel: "I feel pressured and need to calm down", tag: "Breathe" },
    "zh-Hant": { title: "壓力融化室", subtitle: "先把呼吸拿回來", description: "在下一件事開始前，先用短短的安定句、慢一點的節奏與柔和陪伴卸下一部分壓力。", promptLabel: "我壓力很大，想先平靜下來", tag: "呼吸" },
  },
  "study-fatigue": {
    en: { title: "Study Fatigue", subtitle: "You already worked hard today", description: "A gentle desk companion for study blocks, deadline tiredness, and low-battery days.", promptLabel: "My brain is tired from work or study", tag: "Focus" },
    "zh-Hant": { title: "讀書疲勞室", subtitle: "今天已經很努力了", description: "給長時間讀書、趕期限與低電量日子的桌邊陪伴，把下一小步縮到可以完成。", promptLabel: "我的腦袋被工作或讀書耗盡了", tag: "專注" },
  },
  sleep: {
    en: { title: "Sleep Nest", subtitle: "A small universe before good night", description: "Low-contrast words, ambient audio, and quiet panels for winding down.", promptLabel: "I want to sleep but my mind is noisy", tag: "Sleep" },
    "zh-Hant": { title: "睡眠小巢", subtitle: "晚安前的小宇宙", description: "低對比文字、環境音與安靜分鏡，陪腦內仍然吵鬧的你慢慢關燈。", promptLabel: "我想睡，但腦袋停不下來", tag: "入睡" },
  },
  "low-confidence": {
    en: { title: "Confidence Patch", subtitle: "You are not a defective draft", description: "Affectionate encouragement for self-doubt without turning it into fake motivation.", promptLabel: "I feel like I am not good enough", tag: "Courage" },
    "zh-Hant": { title: "自信補丁", subtitle: "你不是失敗品", description: "不喊空洞口號，只用角色的語氣看見你的努力，讓自我懷疑暫時小聲一點。", promptLabel: "我覺得自己不夠好", tag: "勇氣" },
  },
  heartbreak: {
    en: { title: "Heartbreak Cocoa", subtitle: "A broken heart can still be held", description: "Tender, non-judgmental comfort for missing someone, rejection, or relationship grief.", promptLabel: "My heart hurts and I need something sweet", tag: "Repair" },
    "zh-Hant": { title: "心碎可可室", subtitle: "心碎也可以被抱住", description: "為想念、拒絕與關係失落準備的不批判陪伴，讓喜歡先有一個柔軟的容器。", promptLabel: "我的心很痛，需要一點甜", tag: "修復" },
  },
};

const contentTranslations: Record<string, Record<PublicLocale, { title: string; body: string }>> = {
  "comfort-akari-lonely-talk": { en: { title: "Akari saves you a front-row seat", body: "You made it here, and that already counts. Sit with me for one song; no one has to shine alone tonight." }, "zh-Hant": { title: "明里替你留下第一排的位置", body: "你能走到這裡已經很了不起。陪我聽完一首歌吧，今晚沒有人需要獨自發光。" } },
  "comfort-ren-sleep-asmr": { en: { title: "Ren's midnight metronome", body: "Four beats in, six beats out. Let the rhythm close the day for you." }, "zh-Hant": { title: "蓮的午夜節拍器", body: "吸氣四拍，吐氣六拍。讓節奏替你把今天輕輕合上。" } },
  "comfort-mira-study-comic": { en: { title: "Three-panel snack break", body: "Mira steals the textbook, covers it in heart-shaped notes, and returns only one tiny task." }, "zh-Hant": { title: "米菈的點心休息漫畫", body: "米菈先搶走課本，貼滿心形便條，再只還給你一件很小、可以完成的任務。" } },
  "comfort-tohka-confidence-talk": { en: { title: "Tohka believes the obvious thing", body: "If you are still trying, you have not lost. Eat something warm, stand again, and let me cheer loudly." }, "zh-Hant": { title: "十香相信最直接的答案", body: "你還在努力，就不算輸。先吃一點溫暖的東西，再站起來，讓我大聲替你加油！" } },
  "comfort-kurumi-heartbreak-voice": { en: { title: "Kurumi's velvet reset", body: "Your heart is not foolish for wanting to be loved. Rest here before choosing the next hour." }, "zh-Hant": { title: "狂三的絲絨重置", body: "想被愛的心並不愚蠢。在決定下一個小時以前，先在這裡休息吧。" } },
  "comfort-shiori-stress-wallpaper": { en: { title: "Archive breathing wallpaper", body: "A rights-safe gradient archive made for slower breathing and calmer dashboards." }, "zh-Hant": { title: "檔案館呼吸壁紙", body: "以可安全使用的原創漸層構成，讓呼吸與玩家房間都慢下來。" } },
};

export function localizeComfortMode(mode: ComfortMode, locale: PublicLocale): ComfortMode & { tag: string } {
  return { ...mode, ...(modeTranslations[mode.slug]?.[locale] ?? {}), tag: modeTranslations[mode.slug]?.[locale].tag ?? "Comfort" };
}

export function localizeComfortContent(content: ComfortContent, locale: PublicLocale): ComfortContent {
  return { ...content, ...(contentTranslations[content.id]?.[locale] ?? {}) };
}

export function ComfortNotice({ locale }: { locale: PublicLocale }) {
  return <div className="flex gap-4 rounded-[20px_5px_20px_5px] border border-[#ffcc66]/25 bg-[#fffbeb] p-5 text-sm leading-7 text-slate-600"><HeartHandshake className="mt-1 h-5 w-5 shrink-0 text-[#d99a14]" /><p>{pick(locale, "This is a fictional comfort and fandom-entertainment space, not therapy or emergency support. If you may be in immediate danger, contact local emergency services or someone you trust.", "這是虛構角色陪伴與粉絲娛樂空間，不是心理治療或緊急支援。如果你可能正處於立即危險，請聯絡當地緊急服務或可信任的人。")}</p></div>;
}

export function ComfortModeCard({ mode, locale }: { mode: ComfortMode; locale: PublicLocale }) {
  const localized = localizeComfortMode(mode, locale);
  return <Link href={localePath(locale, `/comfort/${mode.slug}`)} className="exchange-panel group flex min-h-80 flex-col p-6 transition hover:-translate-y-1" style={{ background: `radial-gradient(circle at 90% 10%, ${mode.accentTo}55, transparent 38%), rgba(255,253,247,.92)` }}><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-[16px_4px_16px_4px] text-white" style={{ background: mode.accentFrom }}><MoonStar className="h-6 w-6" /></span><span className="rounded-full bg-[#111827] px-3 py-1 text-[9px] font-black uppercase tracking-[.18em] text-white">{localized.tag}</span></div><p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-[#e83c62]">{localized.subtitle}</p><h3 className="mt-2 font-display text-4xl leading-none">{localized.title}</h3><p className="mt-4 text-sm leading-7 text-slate-600">{localized.description}</p><span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black text-slate-800">{pick(locale, "Enter room", "進入房間")}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>;
}

export function MiniComic({ mode, locale }: { mode: ComfortMode; locale: PublicLocale }) {
  const title = localizeComfortMode(mode, locale).title;
  const panels = locale === "zh-Hant" ? [
    `門上的「${title}」燈牌亮起。`,
    "角色把外面的雜音調成很小聲。",
    "一張只屬於你的溫柔台詞卡落在桌上。",
    "最後一格沒有催促，只有一句：明天再繼續也可以。",
  ] : [
    `The ${title} sign turns on.`,
    "A character lowers the volume of everything outside.",
    "One gentle line lands on the desk with your name on it.",
    "The final panel does not rush you: tomorrow is allowed.",
  ];
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{panels.map((line, index) => <article key={line} className="exchange-panel overflow-hidden"><div className="relative h-44 p-4 text-white" style={{ background: `linear-gradient(${125 + index * 10}deg, ${mode.accentFrom}, ${mode.accentTo})` }}><div className="halftone absolute inset-0 opacity-35" /><span className="relative text-6xl font-black text-white/22">0{index + 1}</span><Sparkles className="absolute right-5 top-5 h-6 w-6 text-white/70" /></div><p className="p-5 text-sm leading-7 text-slate-600">{line}</p></article>)}</div>;
}
