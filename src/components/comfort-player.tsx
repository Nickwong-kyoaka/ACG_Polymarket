"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart, Pause, Play, RotateCcw } from "lucide-react";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { roomRequest, safeRoomMediaUrl, type RoomMedia } from "@/components/room-ui";

export function ComfortPlayer({ locale, modeSlug, line, characterId, characterName, contentId, audio }: { locale: PublicLocale; modeSlug: string; line: string; characterId?: string; characterSlug?: string; characterName?: string; contentId?: string; audio?: RoomMedia }) {
  const ambientRef = useRef<AudioContext | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const locked = useRef(false);
  const [ambient, setAmbient] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [failedAudio, setFailedAudio] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const audioUrl = audio && failedAudio !== audio.url ? safeRoomMediaUrl(audio.url) : undefined;

  function speak() {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setStatus(pick(locale, "Browser speech is unavailable. You can still read the line above.", "瀏覽器未提供語音功能，仍可閱讀上方文字。"));
      return;
    }
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = locale === "zh-Hant" ? "zh-HK" : "en-GB";
    utterance.rate = 0.85;
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  async function toggleAmbient() {
    if (ambientRef.current) {
      await ambientRef.current.close().catch(() => undefined);
      ambientRef.current = null; setAmbient(false); return;
    }
    try {
      if (!("AudioContext" in window)) throw new Error();
      const context = new AudioContext();
      ambientRef.current = context;
      const gain = context.createGain(); gain.gain.value = 0.025;
      const oscillator = context.createOscillator(); oscillator.type = "sine"; oscillator.frequency.value = 174;
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
      await context.resume(); setAmbient(true);
    } catch {
      void ambientRef.current?.close().catch(() => undefined); ambientRef.current = null;
      setStatus(pick(locale, "Browser ambience is unavailable.", "瀏覽器環境音暫時無法使用。"));
    }
  }

  function save(kind?: "SOOTHED" | "REPLAY") {
    if (locked.current) return;
    locked.current = true;
    startTransition(async () => {
      setStatus(null);
      try {
        await roomRequest(kind ? "/api/comfort/reaction" : "/api/comfort/session", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kind ? { modeSlug, contentId, kind } : { modeSlug, characterId, needText: line }),
        });
        setStatus(kind ? pick(locale, "Your feeling was added gently.", "你的感受已被溫柔記下。") : pick(locale, "Comfort session saved to your room.", "安慰流程已收藏到你的房間。"));
      } catch (error) { setStatus(error instanceof Error ? error.message : pick(locale, "Could not save. Please try again.", "暫時無法儲存，請重試。")); }
      finally { locked.current = false; }
    });
  }

  useEffect(() => () => {
    void ambientRef.current?.close().catch(() => undefined);
    if (speechRef.current) window.speechSynthesis?.cancel();
  }, []);

  return <div className="exchange-panel comfort-player p-6 sm:p-8">
    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#a34855]">{characterName ?? pick(locale, "A quiet moment", "安靜片刻")}</p>
    <blockquote className="mt-5 font-display text-2xl leading-relaxed text-[#302a2b]">&ldquo;{line}&rdquo;</blockquote>
    {audioUrl ? <div className="mt-5 grid gap-3"><p className="text-xs font-bold text-slate-500">{pick(locale, "Published audio", "已發佈音訊")} · {audio?.label}</p><audio key={audioUrl} aria-label={pick(locale, "Comfort audio", "安慰音訊")} controls preload="none" src={audioUrl} onError={() => setFailedAudio(audioUrl)} className="w-full" /></div> : <div className="mt-5"><p className="mb-3 text-xs leading-6 text-slate-500">{pick(locale, "Fallback: browser speech synthesis. Not a character recording or generated character voice.", "備用：瀏覽器語音合成，並非角色錄音或生成角色聲音。")}</p><button type="button" onClick={speak} className="character-voice-play">{speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{speaking ? pick(locale, "Stop browser reading", "停止瀏覽器朗讀") : pick(locale, "Read with browser voice", "使用瀏覽器朗讀")}</button></div>}
    <div className="mt-5"><button type="button" onClick={toggleAmbient} className="comfort-ambient-button">{ambient ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{ambient ? pick(locale, "Stop browser ambience", "停止瀏覽器環境音") : pick(locale, "Add browser-synthesized ambience", "加入瀏覽器合成環境音")}</button></div>
    <div className="mt-6 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => save()} className="exchange-button-primary"><Heart className="h-4 w-4" />{pick(locale, "Keep this moment", "收藏這段陪伴")}</button><button type="button" disabled={pending} onClick={() => save("SOOTHED")} className="comfort-reaction-button">{pick(locale, "I feel softer", "心情柔和了一點")}</button><button type="button" disabled={pending} onClick={() => save("REPLAY")} className="comfort-reaction-button"><RotateCcw className="mr-1 inline h-3 w-3" />{pick(locale, "Come back later", "之後再回來")}</button></div>
    {status ? <p role="status" className="mt-4 text-sm text-slate-500">{status}</p> : null}
  </div>;
}
