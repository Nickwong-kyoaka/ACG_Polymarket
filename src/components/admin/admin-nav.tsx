"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, FileHeart, FlagTriangleRight, Images, LayoutDashboard, ShieldAlert, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Command center", short: "Overview", icon: LayoutDashboard },
  { href: "/admin/content", label: "Characters & comfort", short: "Content", icon: FileHeart },
  { href: "/admin/imports", label: "Bangumi imports", short: "Imports", icon: Database },
  { href: "/admin/assets", label: "Asset workflow", short: "Assets", icon: Images },
  { href: "/admin/shop", label: "Shop catalog", short: "Shop", icon: ShoppingBag },
  { href: "/admin/campaigns", label: "Campaign control", short: "Campaigns", icon: FlagTriangleRight },
  { href: "/admin/takedowns", label: "Takedown queue", short: "Safety", icon: ShieldAlert },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[#171126]/10 bg-[#171126] text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        <div className="mr-3 hidden shrink-0 items-center gap-2 lg:flex">
          <span className="rounded-full bg-[#ff3d7f] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
            Studio OS
          </span>
          <span className="text-xs font-bold text-white/55">ACG publishing utility</span>
        </div>
        {adminLinks.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition sm:text-sm",
                active ? "bg-white text-[#171126]" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
