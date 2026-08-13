"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { pick, type PublicLocale } from "@/components/acg-locale";

export function ComfortPlayer({ locale, modeSlug, line, characterId, contentId }: { locale: PublicLocale; modeSlug: string; line: string; characterId?: string; contentId?: string }) {
  const audioRef = useRef<{ context: AudioContext; nodes: AudioNode[] } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function stopAmbient() {
    audioRef.current?.context.close();
    audioRef.current = null;
    setPlaying(false);
  }

  function toggleAmbient() {
    if (playing) return stopAmbient();
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.025;
    const low = context.createOscillator();
    const high = context.createOscillator();
    low.type = "sine"; low.frequency.value = 174;
    high.type = "triangle"; high.frequency.value = 261.6;
    low.connect(gain); high.connect(gain); gain.connect(context.destination);
    low.start(); high.start();
    audioRef.current = { context, nodes: [low, high, gain] };
    setPlaying(true);
  }

  function speakLine() {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = locale === "zh-Hant" ? "zh-HK" : "en-GB";
    utterance.rate = 0.82;
    utterance.pitch = 1.02;
    speechSynthesis.speak(utterance);
  }

  function startSession() {
    startTransition(async () => {
      const response = await fetch("/api/comfort/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modeSlug, characterId, needText: line }) });
      const payload = await response.json().catch(() => ({}));
      setStatus(response.ok ? pick(locale, "Comfort session saved to your room.", "安慰流程已收藏到你的房間。") : payload.error ?? pick(locale, "Sign in to save this comfort session.", "登入後即可收藏這次安慰流程。"));
    });
  }

  function react(kind: "SOOTHED" | "SWEET" | "REPLAY") {
    startTransition(async () => {
      const response = await fetch("/api/comfort/reaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modeSlug, contentId, kind }) });
      const payload = await response.json().catch(() => ({}));
      setStatus(response.ok ? pick(locale, "Your feeling was added gently.", "你的感受已被溫柔記下。") : payload.error ?? pick(locale, "Could not save this reaction.", "暫時無法記下這個反應。"));
    });
  }

  useEffect(() => () => { audioRef.current?.context.close(); speechSynthesis.cancel(); }, []);

  return <div className="exchange-panel bg-[#111827] p-6 text-white sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#3ed6e0]">SYNTH VOICE / AMBIENT LOOP</p><blockquote className="mt-5 font-display text-3xl leading-snug">&ldquo;{line}&rdquo;</blockquote><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={toggleAmbient} className="inline-flex items-center justify-center gap-2 rounded-[15px_4px_15px_4px] bg-[#ff4e72] px-5 py-3 text-sm font-black"><span>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</span>{playing ? pick(locale, "Pause ambience", "暫停環境音") : pick(locale, "Play ambience", "播放環境音")}</button><button type="button" onClick={speakLine} className="inline-flex items-center justify-center gap-2 rounded-[15px_4px_15px_4px] border border-white/15 px-5 py-3 text-sm font-black"><Volume2 className="h-4 w-4" />{pick(locale, "Synth voice preview", "合成語音試聽")}</button></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/8"><div className={`h-full w-2/3 rounded-full bg-gradient-to-r from-[#3ed6e0] to-[#ffcc66] ${playing ? "animate-pulse" : "opacity-40"}`} /></div><div className="mt-6 flex flex-wrap gap-2"><button disabled={pending} onClick={startSession} className="exchange-button-primary"><Heart className="h-4 w-4" />{pick(locale, "Save this session", "收藏這次安慰")}</button><button disabled={pending} onClick={() => react("SOOTHED")} className="rounded-full border border-white/12 px-4 py-2 text-xs font-bold text-white/65 hover:bg-white/8">{pick(locale, "I feel softer", "心情柔和了一點")}</button><button disabled={pending} onClick={() => react("REPLAY")} className="rounded-full border border-white/12 px-4 py-2 text-xs font-bold text-white/65 hover:bg-white/8"><RotateCcw className="mr-1 inline h-3 w-3" />{pick(locale, "Replay later", "之後再聽")}</button></div>{status ? <p className="mt-4 text-sm text-white/55">{status}</p> : null}</div>;
}
