import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/market", label: "Market" },
  { href: "/comfort", label: "Comfort" },
  { href: "/me", label: "Me" },
  { href: "/admin", label: "Admin" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fff8ef]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-display text-2xl tracking-wide text-slate-950 transition hover:text-[#db5d35]"
          >
            ACG Support Market
          </Link>
          <Badge tone="warm">Demo MVP</Badge>
        </div>
        <nav className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 transition hover:bg-black/5 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
