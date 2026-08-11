import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { currencyLabel } from "@/lib/utils";
import { getShopItems } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const items = await getShopItems();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <SectionHeading
        eyebrow="Admin shop"
        title="Cosmetic economy inventory"
        description="Soft-token shop items are separate from trading. Avatar frames, profile themes, and wallpapers are the monetizable expression layer."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item) => (
          <Surface key={item.id} className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
              {item.kind.replaceAll("_", " ")}
            </p>
            <h2 className="mt-3 font-display text-3xl text-slate-950">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            <p className="mt-4 text-lg font-semibold text-slate-950">
              {currencyLabel(item.price)}
            </p>
          </Surface>
        ))}
      </div>
    </div>
  );
}
