export function dailyCoverIndex(dayKey: string, itemCount: number) {
  if (!Number.isInteger(itemCount) || itemCount <= 0) return -1;

  let hash = 2166136261;
  for (const character of dayKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % itemCount;
}

export function selectDailyCover<T>(items: readonly T[], dayKey: string) {
  const index = dailyCoverIndex(dayKey, items.length);
  return index >= 0 ? items[index] : undefined;
}
