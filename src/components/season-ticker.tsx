import { pick, type PublicLocale } from "@/components/acg-locale";

export function SeasonTicker({ locale }: { locale: PublicLocale }) {
  const signals = [
    pick(locale, "SUMMER 2026 SIGNALS OPEN", "2026 夏季訊號已開放"),
    pick(locale, "DAILY CHECK-IN +100 SUP", "每日簽到 +100 SUP"),
    pick(locale, "NO SHORTING · NO FAN WARS", "不做空 · 不引戰"),
    pick(locale, "COMFORT ROOMS ONLINE", "角色安慰室在線"),
    pick(locale, "ORIGINAL ART · SOURCE-TRACKED METADATA", "原創立繪 · 資料來源可追蹤"),
  ];

  return <div className="season-ticker"><div className="season-ticker-track">{[...signals, ...signals].map((item, index) => <span className="season-ticker-item" key={`${item}-${index}`}>{item}</span>)}</div></div>;
}
