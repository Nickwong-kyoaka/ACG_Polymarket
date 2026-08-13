import { prisma } from "@/lib/prisma";

export async function reconcileMarket() {
  const [characters, positions, trades, wallets, ledger] = await Promise.all([
    prisma.character.findMany({ select: { id: true, slug: true, circulatingUnits: true, supporterCount: true, marketVersion: true } }),
    prisma.supportPosition.groupBy({ by: ["characterId"], where: { units: { gt: 0 } }, _sum: { units: true }, _count: { _all: true } }),
    prisma.trade.groupBy({ by: ["characterId", "side"], _sum: { quantity: true }, _max: { marketVersion: true } }),
    prisma.wallet.findMany({ select: { id: true, userId: true, softBalance: true } }),
    prisma.ledgerEntry.groupBy({ by: ["walletId"], where: { currencyType: "SOFT" }, _sum: { delta: true } }),
  ]);
  const positionsByCharacter = new Map(positions.map((row) => [row.characterId, { units: row._sum.units ?? 0, supporters: row._count._all }]));
  const tradesByCharacter = new Map<string, { buy: number; sell: number; version: number }>();
  for (const row of trades) {
    const current = tradesByCharacter.get(row.characterId) ?? { buy: 0, sell: 0, version: 0 };
    if (row.side === "BUY") current.buy = row._sum.quantity ?? 0;
    else current.sell = row._sum.quantity ?? 0;
    current.version = Math.max(current.version, row._max.marketVersion ?? 0);
    tradesByCharacter.set(row.characterId, current);
  }
  const issues: Array<{ scope: "CHARACTER" | "WALLET"; id: string; message: string }> = [];
  for (const character of characters) {
    const position = positionsByCharacter.get(character.id) ?? { units: 0, supporters: 0 };
    const trade = tradesByCharacter.get(character.id) ?? { buy: 0, sell: 0, version: 0 };
    const netTrades = trade.buy - trade.sell;
    if (character.circulatingUnits !== position.units) issues.push({ scope: "CHARACTER", id: character.slug, message: `Supply ${character.circulatingUnits} != positions ${position.units}` });
    if (character.circulatingUnits !== netTrades) issues.push({ scope: "CHARACTER", id: character.slug, message: `Supply ${character.circulatingUnits} != net trades ${netTrades}` });
    if (character.supporterCount !== position.supporters) issues.push({ scope: "CHARACTER", id: character.slug, message: `Supporters ${character.supporterCount} != positive positions ${position.supporters}` });
    if (character.marketVersion !== trade.version) issues.push({ scope: "CHARACTER", id: character.slug, message: `Market version ${character.marketVersion} != latest trade ${trade.version}` });
  }
  const ledgerByWallet = new Map(ledger.map((row) => [row.walletId, row._sum.delta ?? 0]));
  for (const wallet of wallets) {
    const ledgerBalance = ledgerByWallet.get(wallet.id) ?? 0;
    if (wallet.softBalance !== ledgerBalance) issues.push({ scope: "WALLET", id: wallet.userId, message: `Wallet ${wallet.softBalance} != ledger sum ${ledgerBalance}` });
  }
  return { ok: issues.length === 0, checkedAt: new Date().toISOString(), summary: { characters: characters.length, wallets: wallets.length, positions: positions.reduce((sum, row) => sum + row._count._all, 0), trades: trades.reduce((sum, row) => sum + (row._sum.quantity ?? 0), 0) }, issues };
}
