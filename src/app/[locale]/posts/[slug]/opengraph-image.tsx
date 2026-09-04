import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function PostOpenGraphImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const zh = locale === "zh-Hant";
  const post = await prisma.post.findFirst({ where: { slug, status: "PUBLISHED" }, select: { title: true, kind: true, author: { select: { name: true, profile: { select: { displayName: true } } } }, primaryCharacter: { select: { name: true, accentFrom: true } } } }).catch(() => null);
  const title = post?.title ?? (zh ? "ACG 社群筆記" : "ACG Clubroom Note");
  const author = post?.author.profile?.displayName ?? post?.author.name ?? "ACG Exchange Desk";
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", background: "#fff8ed", color: "#2c2724", border: "24px solid #2c2724", position: "relative" }}><div style={{ width: 350, padding: 42, display: "flex", flexDirection: "column", justifyContent: "space-between", background: post?.primaryCharacter?.accentFrom ?? "#c85d5a", color: "white" }}><span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>{post?.kind.replaceAll("_", " ") ?? "NOTE"}</span><span style={{ fontFamily: "serif", fontSize: 150, fontWeight: 700, opacity: .8 }}>{post?.primaryCharacter?.name.charAt(0) ?? "推"}</span><span style={{ fontSize: 20, fontWeight: 700 }}>{post?.primaryCharacter?.name ?? "ACG EXCHANGE"}</span></div><div style={{ flex: 1, padding: 58, display: "flex", flexDirection: "column", justifyContent: "space-between" }}><span style={{ color: "#a34745", fontSize: 22, fontWeight: 800 }}>CLUBROOM JOURNAL / SHARE CARD</span><div style={{ fontFamily: "serif", fontSize: title.length > 38 ? 52 : 66, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div><div style={{ display: "flex", justifyContent: "space-between", borderTop: "3px solid #2c2724", paddingTop: 18, fontSize: 22, fontWeight: 700 }}><span>{author}</span><span>ACG EXCHANGE</span></div></div></div>, size);
}
