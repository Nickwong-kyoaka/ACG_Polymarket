import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\//, (route) => {
    const hostname = new URL(route.request().url()).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost" ? route.continue() : route.abort();
  });
});

test("bilingual lobby and mobile layout", async ({ page }, testInfo) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" && /hydration|did not match/i.test(message.text())) hydrationErrors.push(message.text()); });
  for (const locale of ["en", "zh-Hant"]) {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toBeVisible();
    const cards = page.locator(".social-note-grid > article");
    await expect(cards.nth(1)).toBeVisible();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (width === 390) {
        const first = await cards.nth(0).boundingBox();
        const second = await cards.nth(1).boundingBox();
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        expect(Math.abs(first!.y - second!.y)).toBeLessThan(4);
        expect(first!.y + 100).toBeLessThan(744);
      }
      await testInfo.attach(`${locale}-${width}`, { body: await page.screenshot(), contentType: "image/png" });
    }
  }
  expect(hydrationErrors).toEqual([]);
});

test("sign in, persist a draft, edit and submit for review", async ({ page }) => {
  await page.goto("/en/onboarding");
  await page.getByRole("button", { name: "Enter demo" }).click();
  await page.waitForURL(/step=interests|\/en\/me|\/en\/community/);
  const title = `Browser draft ${Date.now()}`;
  await page.goto("/en/create");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Note", { exact: true }).fill("A small source-free text note saved in the creator desk.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved" }).first()).toBeVisible();
  await page.goto("/en/me/posts");
  const draft = page.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(draft).toContainText("Draft");
  await draft.getByRole("link", { name: "Continue editing" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(title);
  await page.getByRole("button", { name: "Submit note", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Submitted, awaiting review|Published/ }).first()).toBeVisible();
});

test("language switch retains filters and support drawer restores keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/market?search=Akari&sort=quote");
  await page.getByRole("link", { name: "繁", exact: true }).click();
  await expect(page).toHaveURL(/\/zh-Hant\/market\?search=Akari&sort=quote/);
  await expect(page.getByRole("searchbox")).toHaveValue("Akari");
  await page.goto("/en/character/akari-hoshino");
  const trigger = page.getByRole("button", { name: "Open support ticket", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close support panel" })).toBeFocused();
  for (let index = 0; index < 15; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole("tab", { name: "Gallery", exact: true }).click();
  await expect(page).toHaveURL(/tab=gallery#gallery/);
  await page.getByRole("link", { name: "繁", exact: true }).click();
  await expect(page).toHaveURL(/\/zh-Hant\/character\/akari-hoshino\?tab=gallery#gallery/);
  await expect(page.getByRole("tab", { name: "畫廊", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("work starts using the canonical contract and survives reload", async ({ page, request }) => {
  const start = await request.post("/api/jobs/start", { headers: { "Idempotency-Key": `e2e-work-${Date.now()}` }, data: { kind: "SHIFT_30M" } });
  expect([200, 409]).toContain(start.status());
  await page.goto("/en/work");
  await expect(page.getByText(/Shift active|in progress|ready to claim|remaining/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Shift active|in progress|ready to claim|remaining/i).first()).toBeVisible();
});

test("earned SUP, signed support trades, replay, comments, and cosmetics persist", async ({ page, request }) => {
  const key = `e2e-${Date.now()}`;
  const reward = await request.post("/api/rewards/check-in", { headers: { "Idempotency-Key": `${key}-daily` } });
  expect([200, 409]).toContain(reward.status());
  const quoteResponse = await request.post("/api/characters/char-akari/quote", { data: { side: "BUY", quantity: 1 } });
  expect(quoteResponse.ok()).toBe(true);
  const quote = await quoteResponse.json();
  const order = { headers: { "Idempotency-Key": `${key}-buy` }, data: { quantity: 1, quoteToken: quote.quoteToken } };
  const buy = await request.post("/api/characters/char-akari/buy", order);
  expect(buy.ok()).toBe(true);
  const receipt = await buy.json();
  const replay = await request.post("/api/characters/char-akari/buy", order);
  expect(replay.ok()).toBe(true);
  expect((await replay.json()).trade.id).toBe(receipt.trade.id);
  const sellQuote = await request.post("/api/characters/char-akari/quote", { data: { side: "SELL", quantity: 1 } });
  expect(sellQuote.ok()).toBe(true);
  const sell = await request.post("/api/characters/char-akari/sell", { headers: { "Idempotency-Key": `${key}-sell` }, data: { quantity: 1, quoteToken: (await sellQuote.json()).quoteToken } });
  expect(sell.ok()).toBe(true);
  expect((await request.post("/api/watchlist", { data: { characterId: "char-akari" } })).ok()).toBe(true);
  expect((await request.post("/api/comments", { data: { characterId: "char-akari", content: `A lovely stage detail, saved from ${key}.` } })).ok()).toBe(true);
  const items = await (await request.get("/api/shop/items")).json();
  const item = items.items[0];
  expect(item).toBeTruthy();
  const purchase = await request.post("/api/shop/purchase", { headers: { "Idempotency-Key": `${key}-shop` }, data: { itemId: item.id, equip: true } });
  expect(purchase.ok()).toBe(true);
  await page.goto("/en/character/akari-hoshino");
  await page.getByRole("tab", { name: "Notes", exact: true }).click();
  await expect(page.getByText(`A lovely stage detail, saved from ${key}.`, { exact: true })).toBeVisible();
});
