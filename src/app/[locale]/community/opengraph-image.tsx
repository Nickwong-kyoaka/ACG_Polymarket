import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function CommunityOpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale === "zh-Hant";
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", background: "#fff8ed", color: "#2c2724", border: "24px solid #2c2724", padding: 54, position: "relative" }}><div style={{ width: "72%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 16 }}><span style={{ padding: "10px 16px", border: "3px solid #2c2724", background: "#f0c860", fontSize: 22, fontWeight: 800 }}>CLUBROOM / 01</span><span style={{ color: "#a34745", fontSize: 22, fontWeight: 800 }}>ACG EXCHANGE</span></div><div><div style={{ fontFamily: "serif", fontSize: 78, fontWeight: 700, lineHeight: .95, letterSpacing: -4 }}>{zh ? "今天的社群手帳" : "Today in the clubroom"}</div><div style={{ marginTop: 24, maxWidth: 750, color: "#6c625a", fontSize: 28, lineHeight: 1.35 }}>{zh ? "角色衣裝、季番觀後感、安慰片段與預測筆記。" : "Character outfits, seasonal impressions, comfort moments, and prediction notes."}</div></div></div><div style={{ position: "absolute", right: 54, top: 54, bottom: 54, width: 270, display: "flex", alignItems: "center", justifyContent: "center", background: "#27373a", color: "#ed7862", fontFamily: "serif", fontSize: 190, fontWeight: 700 }}>推</div></div>, size);
}
