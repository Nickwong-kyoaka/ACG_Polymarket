import { AdminShopConsole } from "@/components/admin/admin-shop-console";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const snapshot = await getAdminSnapshot();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <SectionHeading eyebrow="Convention booth" title="Turn approved artwork into expressive unlocks" description="Publish cosmetic listings linked to rights-checked assets, while keeping the soft-token shop separate from character support pricing." />
      <AdminShopConsole assets={snapshot.assets} items={snapshot.shopItems} />
    </div>
  );
}
