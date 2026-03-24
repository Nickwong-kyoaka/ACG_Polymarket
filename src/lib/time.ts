import { DEFAULT_TIME_ZONE } from "@/lib/constants";

export function getHongKongDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
