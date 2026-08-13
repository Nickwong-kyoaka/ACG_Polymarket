"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getExchangeCopy, type PublicLocale } from "@/components/acg-locale";
import { SupportTradePanel, type SupportTradePanelProps } from "@/components/support-trade-panel";
import { currencyLabel } from "@/lib/utils";

type TradeDrawerProps = Omit<SupportTradePanelProps, "locale"> & { locale: PublicLocale };

export function CharacterTradeDrawer(props: TradeDrawerProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const copy = getExchangeCopy(props.locale);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <div className="hidden lg:block"><SupportTradePanel {...props} /></div>
      <div className="mobile-trade-dock lg:hidden">
        <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/45">{copy.trade.buyQuote}</p><p className="mt-1 font-black">{currencyLabel(props.quote)}</p></div>
        <button type="button" onClick={() => setOpen(true)} className="exchange-button-primary px-4 py-2.5">{copy.trade.buy}</button>
      </div>
      {open ? (
        <>
          <button className="trade-drawer-backdrop lg:hidden" type="button" aria-label="Close trade panel" onClick={() => setOpen(false)} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={copy.trade.title} tabIndex={-1} className="trade-drawer lg:hidden">
            <button type="button" onClick={() => setOpen(false)} className="mb-3 ml-auto grid h-10 w-10 place-items-center rounded-full bg-[#111827] text-white" aria-label="Close trade panel"><X className="h-5 w-5" /></button>
            <SupportTradePanel {...props} />
          </div>
        </>
      ) : null}
    </>
  );
}
