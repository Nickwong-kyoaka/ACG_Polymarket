"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Coins, Eye, PackageCheck, ShoppingBag } from "lucide-react";
import type { AssetKind, CharacterAsset, ShopItem } from "@/lib/types";
import {
  AdminField,
  AdminNoticeBar,
  AdminSectionCard,
  AdminSubmitButton,
  adminInputClass,
  type AdminNotice,
  postAdmin,
} from "@/components/admin/admin-ui";
import { currencyLabel } from "@/lib/utils";

type ShopKind = Extract<
  AssetKind,
  "WALLPAPER" | "AVATAR_FRAME" | "PROFILE_THEME" | "VOICE" | "ASMR" | "COMIC"
>;

function ShopItemEditor({ assets, items }: { assets: CharacterAsset[]; items: ShopItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<AdminNotice>(null);
  const [kind, setKind] = useState<ShopKind>("WALLPAPER");
  const collectionIds = [...new Set(items.map((item) => item.collectionId))].sort();
  const eligibleAssets = useMemo(
    () => assets.filter((asset) => asset.kind === kind && asset.workflowStatus === "PUBLISHED"),
    [assets, kind],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setNotice(null);
    setPending(true);

    try {
      const result = await postAdmin<{ item: ShopItem }>("/api/admin/shop-items", {
        collectionId: String(data.get("collectionId")),
        title: String(data.get("title")),
        description: String(data.get("description")),
        kind,
        currencyType: String(data.get("currencyType")),
        price: Number(data.get("price")),
        previewLabel: String(data.get("previewLabel")),
        assetId: String(data.get("assetId")),
      });
      form.reset();
      setKind("WALLPAPER");
      setNotice({ tone: "success", message: `${result.item.title} is now available in the shop.` });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Shop item creation failed." });
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminSectionCard
      title="Publish a cosmetic unlock"
      description="Attach a published wallpaper, avatar frame, or profile theme to a soft-token shop listing. The storefront receives the item immediately."
      accent="gold"
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Collection ID" hint="Existing relation" required>
            <input name="collectionId" list="shop-collection-ids" className={adminInputClass} required />
          </AdminField>
          <datalist id="shop-collection-ids">{collectionIds.map((id) => <option key={id} value={id} />)}</datalist>
          <AdminField label="Cosmetic type" required>
            <select value={kind} onChange={(event) => setKind(event.target.value as ShopKind)} className={adminInputClass}>
              <option value="WALLPAPER">Wallpaper</option>
              <option value="AVATAR_FRAME">Avatar frame</option>
              <option value="PROFILE_THEME">Profile theme</option>
              <option value="VOICE">Voice pack</option>
              <option value="ASMR">ASMR pack</option>
              <option value="COMIC">Comic pack</option>
            </select>
          </AdminField>
          <AdminField label="Published asset" hint={`${eligibleAssets.length} eligible`} required>
            <select name="assetId" className={adminInputClass} required defaultValue="">
              <option value="" disabled>Select a {kind.toLowerCase().replaceAll("_", " ")}</option>
              {eligibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}
            </select>
          </AdminField>
          <AdminField label="Currency" required>
            <select name="currencyType" className={adminInputClass} defaultValue="SOFT">
              <option value="SOFT">SUP soft token</option>
              <option value="PREMIUM">Premium token</option>
            </select>
          </AdminField>
          <AdminField label="Price" required>
            <input name="price" type="number" min={1} defaultValue={120} className={adminInputClass} required />
          </AdminField>
          <AdminField label="Preview label" required>
            <input name="previewLabel" className={adminInputClass} placeholder="Preview in your room" minLength={2} required />
          </AdminField>
        </div>
        <AdminField label="Item title" required>
          <input name="title" className={adminInputClass} minLength={2} required />
        </AdminField>
        <AdminField label="Store description" hint="Minimum 10 characters" required>
          <textarea name="description" rows={4} className={adminInputClass} minLength={10} required />
        </AdminField>
        {eligibleAssets.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            Publish a {kind.toLowerCase().replaceAll("_", " ")} asset through the asset workflow before creating this listing.
          </div>
        ) : null}
        <AdminNoticeBar notice={notice} />
        <AdminSubmitButton pending={pending} disabled={eligibleAssets.length === 0}>Publish shop item</AdminSubmitButton>
      </form>
    </AdminSectionCard>
  );
}

function ShopInventory({ items }: { items: ShopItem[] }) {
  return (
    <AdminSectionCard
      title="Live cosmetic catalog"
      description="Review the expression layer independently from character support trading. Prices here unlock in-platform cosmetics only."
      accent="pink"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="group relative overflow-hidden rounded-[1.5rem] border border-[#171126]/10 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(23,17,38,0.65)]">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-[#ffe56b]/70 to-[#ff3d7f]/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#fff2c5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#9c4300]">{item.kind.replaceAll("_", " ")}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${item.published ? "bg-emerald-500" : "bg-slate-300"}`} title={item.published ? "Published" : "Draft"} />
              </div>
              <h3 className="mt-4 font-display text-2xl text-[#171126]">{item.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{item.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#171126]/8 pt-4">
                <span className="inline-flex items-center gap-2 font-black text-[#171126]"><Coins className="h-4 w-4 text-[#ff8a3d]" /> {currencyLabel(item.price, item.currencyType === "SOFT" ? "SUP" : "PREM")}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400"><Eye className="h-3.5 w-3.5" /> {item.previewLabel}</span>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 ? (
          <div className="col-span-full rounded-[1.5rem] border border-dashed border-[#171126]/20 bg-white/50 py-14 text-center text-slate-500"><ShoppingBag className="mx-auto mb-3 h-7 w-7" />No shop items published yet.</div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><PackageCheck className="h-4 w-4" /> {items.filter((item) => item.published).length} live listing(s) · {items.length} total</div>
    </AdminSectionCard>
  );
}

export function AdminShopConsole({ assets, items }: { assets: CharacterAsset[]; items: ShopItem[] }) {
  return <div className="grid gap-7"><ShopItemEditor assets={assets} items={items} /><ShopInventory items={items} /></div>;
}
