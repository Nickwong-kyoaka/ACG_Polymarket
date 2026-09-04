"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/components/acg-locale";

export interface OnboardingCharacter {
  id: string;
  slug: string;
  name: string;
  title: string;
  imageUrl: string | null;
  altText: string;
  accentFrom: string;
  accentTo: string;
}

const interestOptions = [
  { value: "new-season", en: "New season", zh: "本季新番" },
  { value: "character-lore", en: "Character lore", zh: "角色考據" },
  { value: "outfit-notes", en: "Outfit notes", zh: "角色衣裝" },
  { value: "comfort-corner", en: "Comfort corner", zh: "安慰陪伴" },
  { value: "fan-creation", en: "Fan creation", zh: "二次創作" },
  { value: "voice-asmr", en: "Voice & ASMR", zh: "語音與 ASMR" },
  { value: "support-signals", en: "Support signals", zh: "角色應援" },
  { value: "prediction-desk", en: "Prediction desk", zh: "季番預測" },
] as const;

function safeBackground(imageUrl: string | null, from: string, to: string) {
  return imageUrl
    ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` }
    : { backgroundImage: `linear-gradient(145deg, ${from}, ${to})` };
}

export function OnboardingPicker({
  locale,
  characters,
  initialTags,
  initialCharacterIds,
  nextPath,
}: {
  locale: PublicLocale;
  characters: OnboardingCharacter[];
  initialTags: string[];
  initialCharacterIds: string[];
  nextPath: string;
}) {
  const router = useRouter();
  const zh = locale === "zh-Hant";
  const [tags, setTags] = useState<string[]>(initialTags);
  const [characterIds, setCharacterIds] = useState<string[]>(initialCharacterIds.slice(0, 3));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleTag(value: string) {
    setTags((current) => current.includes(value) ? current.filter((tag) => tag !== value) : current.length < 5 ? [...current, value] : current);
  }

  function toggleCharacter(id: string) {
    setCharacterIds((current) => current.includes(id) ? current.filter((entry) => entry !== id) : current.length < 3 ? [...current, id] : current);
  }

  async function finish() {
    if (tags.length === 0 || characterIds.length === 0) {
      setMessage(zh ? "先挑一個興趣和一名想關注的角色吧。" : "Pick at least one interest and one character to follow.");
      return;
    }

    setMessage("");
    const response = await fetch("/api/me/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, favoriteTags: tags, characterIds }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? (zh ? "暫時未能保存，請再試一次。" : "We could not save this yet. Please try again."));
      return;
    }

    startTransition(() => {
      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <div className="onboarding-picker">
      <section className="onboarding-sheet">
        <div className="onboarding-sheet-heading">
          <span>01</span>
          <div>
            <p>{zh ? "你的書架" : "YOUR SHELF"}</p>
            <h2>{zh ? "最近想看些什麼？" : "What are you in the mood for?"}</h2>
          </div>
        </div>
        <div className="interest-grid">
          {interestOptions.map((option) => {
            const selected = tags.includes(option.value);
            return (
              <button key={option.value} type="button" className={selected ? "interest-ticket is-selected" : "interest-ticket"} aria-pressed={selected} onClick={() => toggleTag(option.value)}>
                <span>{selected ? <Check aria-hidden="true" /> : <Sparkles aria-hidden="true" />}</span>
                {zh ? option.zh : option.en}
              </button>
            );
          })}
        </div>
        <p className="onboarding-hint">{zh ? `可選 1–5 個 · 已選 ${tags.length}` : `Choose 1–5 · ${tags.length} selected`}</p>
      </section>

      <section className="onboarding-sheet">
        <div className="onboarding-sheet-heading">
          <span>02</span>
          <div>
            <p>{zh ? "第一批關注" : "FIRST FOLLOWS"}</p>
            <h2>{zh ? "先把誰放進房間？" : "Who belongs in your room first?"}</h2>
          </div>
        </div>
        <div className="onboarding-character-grid">
          {characters.map((character) => {
            const selected = characterIds.includes(character.id);
            return (
              <button key={character.id} type="button" className={selected ? "onboarding-character is-selected" : "onboarding-character"} aria-pressed={selected} onClick={() => toggleCharacter(character.id)}>
                <span className="onboarding-character-art" role="img" aria-label={character.altText} style={safeBackground(character.imageUrl, character.accentFrom, character.accentTo)} />
                <span className="onboarding-character-copy"><strong>{character.name}</strong><small>{character.title}</small></span>
                <span className="onboarding-character-check">{selected ? <Check aria-hidden="true" /> : <Heart aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>
        <p className="onboarding-hint">{zh ? `可選 1–3 名 · 已選 ${characterIds.length}` : `Choose 1–3 · ${characterIds.length} selected`}</p>
      </section>

      <div className="onboarding-finish">
        <div><p>{zh ? "下一頁會依照這些選擇整理內容。" : "Your next page will be arranged around these picks."}</p>{message ? <strong role="alert">{message}</strong> : null}</div>
        <button type="button" onClick={finish} disabled={isPending}>{isPending ? (zh ? "正在整理房間…" : "Arranging your room…") : (zh ? "完成，去社群看看" : "Finish and visit the clubroom")}</button>
      </div>
    </div>
  );
}
