import Link from "next/link";
import { CharacterVoicePlayer } from "@/components/character-voice-player";
import { localePath, pick, type PublicLocale } from "@/components/acg-locale";

export function CharacterComfortSection({ locale, characterSlug, characterName }: { locale: PublicLocale; characterSlug: string; characterName: string }) {
  return <section aria-labelledby="comfort-title" className="grid gap-5">
    <div><h2 id="comfort-title" className="font-display text-2xl">{pick(locale, "Browser speech demo", "瀏覽器合成語音示範")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{pick(locale, "An original comfort script read by your browser's speech synthesizer. This is not the character speaking, an official recording, or the performer's voice. Available voices vary by device.", "原創安慰文字由瀏覽器合成朗讀，並非角色本人發聲、官方錄音或聲優配音。可用聲線依裝置而異。")}</p></div>
    <div className="[&_p]:!text-xs [&_span]:!text-xs [&_button]:!text-sm"><CharacterVoicePlayer locale={locale} characterSlug={characterSlug} characterName={characterName} compact /></div>
    <Link href={localePath(locale, "/comfort")} className="exchange-button-secondary min-h-11 w-fit text-sm">{pick(locale, "Comfort rooms, comics & wallpapers", "安慰房、漫畫與壁紙")}</Link>
  </section>;
}
