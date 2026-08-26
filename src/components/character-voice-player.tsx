"use client";

import { useEffect, useState } from "react";
import { AudioLines, Pause, Play, Sparkles } from "lucide-react";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { getCharacterComfortLine, getCharacterVoiceProfile } from "@/data/character-voices";

interface CharacterVoicePlayerProps {
  locale: PublicLocale;
  characterSlug?: string;
  characterName?: string;
  line?: string;
  compact?: boolean;
}

function voiceFor(profileOffset: number, locale: PublicLocale) {
  const available = window.speechSynthesis.getVoices();
  const language = locale === "zh-Hant" ? "zh" : "en";
  const matching = available
    .filter((voice) => voice.lang.toLowerCase().startsWith(language))
    .sort((left, right) => Number(right.localService) - Number(left.localService) || left.name.localeCompare(right.name));
  return matching.length ? matching[profileOffset % matching.length] : undefined;
}

export function CharacterVoicePlayer({ locale, characterSlug, characterName, line, compact = false }: CharacterVoicePlayerProps) {
  const profile = getCharacterVoiceProfile(characterSlug);
  const spokenLine = line ?? getCharacterComfortLine(characterSlug, locale);
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);

  function stop() {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  function play() {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSupported(false);
      return;
    }
    if (playing) return stop();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenLine);
    utterance.lang = locale === "zh-Hant" ? "zh-HK" : "en-GB";
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = 0.92;
    utterance.voice = voiceFor(profile.voiceOffset, locale) ?? null;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return <div className={`character-voice-player ${compact ? "is-compact" : ""}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="character-voice-icon"><AudioLines className="h-5 w-5" /></span>
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#a34855]">{pick(locale, "A voice note for you", "留給你的語音便條")}</p><p className="mt-1 text-xs font-bold text-slate-500">{characterName ? `${characterName} · ` : ""}{profile.style[locale]}</p></div>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.12em] text-slate-400"><Sparkles className="h-3.5 w-3.5 text-[#d89d35]" />{pick(locale, "Original synth reading", "原創合成朗讀")}</span>
    </div>
    <blockquote className="mt-5 font-display text-2xl leading-relaxed text-[#302a2b]">&ldquo;{spokenLine}&rdquo;</blockquote>
    <div className="mt-5 flex items-center gap-4">
      <button type="button" onClick={play} className="character-voice-play" aria-label={playing ? pick(locale, "Stop voice", "停止語音") : pick(locale, "Play voice", "播放語音")}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        {playing ? pick(locale, "Pause", "暫停") : pick(locale, "Listen", "聽聽看")}
      </button>
      <div className="character-voice-wave" aria-hidden="true">{[12, 20, 9, 25, 17, 29, 13, 22, 10, 18, 8, 15].map((height, index) => <i key={index} className={playing ? "is-playing" : ""} style={{ height }} />)}</div>
    </div>
    {!supported ? <p className="mt-4 text-xs font-bold text-[#a34855]">{pick(locale, "Voice playback is not available in this browser.", "目前的瀏覽器未提供語音播放功能。")}</p> : null}
  </div>;
}
