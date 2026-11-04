import { safePublicMediaUrl } from "@/lib/public-assets";

export type RoomMedia = { id: string; kind: string; url: string; alt: string; label: string };
export type RoomAppearance = { displayName: string; equippedFrameAsset?: string; equippedThemeAsset?: string };

export function safeRoomMediaUrl(value?: string | null): string | undefined {
  return safePublicMediaUrl(value) ?? undefined;
}

export async function roomRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
  if (!payload) throw new Error("The service returned an unreadable response.");
  return payload as T;
}

