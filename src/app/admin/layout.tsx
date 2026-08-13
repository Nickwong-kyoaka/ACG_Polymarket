import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminSessionUserId } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminSessionUserId().catch(() => redirect("/onboarding?callbackUrl=%2Fadmin"));

  return (
    <div className="min-h-full">
      <AdminNav />
      {children}
    </div>
  );
}
