"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart, Pause, Play, RotateCcw } from "lucide-react";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { CharacterVoicePlayer } from "@/components/character-voice-player";
import { getCharacterVoiceProfile } from "@/data/character-voices";

export function ComfortPlayer({ locale, modeSlug, line, characterId, characterSlug, characterName, contentId }: { locale: PublicLocale; modeSlug: string; line: string; characterId?: string; characterSlug?: string; characterName?: string; contentId?: string }) {
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
    const profile = getCharacterVoiceProfile(characterSlug);
    low.type = "sine"; low.frequency.value = profile.ambience[0];
    high.type = "triangle"; high.frequency.value = profile.ambience[1];
    low.connect(gain); high.connect(gain); gain.connect(context.destination);
    low.start(); high.start();
    audioRef.current = { context, nodes: [low, high, gain] };
    setPlaying(true);
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

  useEffect(() => () => { audioRef.current?.context.close(); }, []);

  return <div className="exchange-panel comfort-player p-6 sm:p-8"><CharacterVoicePlayer locale={locale} characterSlug={characterSlug} characterName={characterName} line={line} compact /><div className="mt-5"><button type="button" onClick={toggleAmbient} className="comfort-ambient-button"><span>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</span>{playing ? pick(locale, "Pause room ambience", "暫停房間環境音") : pick(locale, "Add room ambience", "加一點房間環境音")}</button></div><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#eadfd2]"><div className={`h-full w-2/3 rounded-full bg-gradient-to-r from-[#d86b77] to-[#dfad55] ${playing ? "animate-pulse" : "opacity-35"}`} /></div><div className="mt-6 flex flex-wrap gap-2"><button disabled={pending} onClick={startSession} className="exchange-button-primary"><Heart className="h-4 w-4" />{pick(locale, "Keep this moment", "收藏這段陪伴")}</button><button disabled={pending} onClick={() => react("SOOTHED")} className="comfort-reaction-button">{pick(locale, "I feel softer", "心情柔和了一點")}</button><button disabled={pending} onClick={() => react("REPLAY")} className="comfort-reaction-button"><RotateCcw className="mr-1 inline h-3 w-3" />{pick(locale, "Come back later", "之後再回來")}</button></div>{status ? <p className="mt-4 text-sm text-slate-500">{status}</p> : null}</div>;
}
