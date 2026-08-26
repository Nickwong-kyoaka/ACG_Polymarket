import { pick, type PublicLocale } from "@/components/acg-locale";

export function SeasonTicker({ locale }: { locale: PublicLocale }) {
  const signals = [
    pick(locale, "SUMMER 2026 CATALOG IS OPEN", "2026 夏季場刊已翻開"),
    pick(locale, "DAILY CHECK-IN +100 SUP", "每日簽到 +100 SUP"),
    pick(locale, "A VOICE NOTE FROM EVERY CHARACTER", "每名角色都有一張語音便條"),
    pick(locale, "COMFORT ROOMS GLOWING TONIGHT", "今晚的角色安慰室亮著燈"),
    pick(locale, "NEW OUTFITS IN THE CHARACTER GALLERY", "角色畫廊有新的服裝造型"),
  ];

  return <div className="season-ticker"><div className="season-ticker-track">{[...signals, ...signals].map((item, index) => <span className="season-ticker-item" key={`${item}-${index}`}>{item}</span>)}</div></div>;
}
