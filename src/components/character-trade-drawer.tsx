"use client";

import { useRef, useState } from "react";
import { getExchangeCopy, type PublicLocale } from "@/components/acg-locale";
import { SupportTradePanel, type SupportTradePanelProps } from "@/components/support-trade-panel";
import { ActionDrawer } from "@/components/ui/action-drawer";
import { currencyLabel } from "@/lib/utils";

type TradeDrawerProps = Omit<SupportTradePanelProps, "locale"> & { locale: PublicLocale };

export function CharacterTradeDrawer(props: TradeDrawerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copy = getExchangeCopy(props.locale);

  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={(event) => { triggerRef.current = event.currentTarget; setOpen(true); }} className="exchange-button-primary min-h-11 text-sm">{copy.trade.buy} · {currencyLabel(props.quote)}</button>
      <div className="mobile-trade-dock fixed inset-x-3 z-30 flex items-center justify-between gap-3 p-3 lg:hidden">
        <p>{props.locale === "zh-Hant" ? "每份應援" : "Per support unit"}<strong className="ml-2 tabular-nums">{currencyLabel(props.quote)}</strong></p>
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={(event) => { triggerRef.current = event.currentTarget; setOpen(true); }} className="exchange-button-primary min-h-11 text-sm">{props.locale === "zh-Hant" ? "開啟應援面板" : "Open support ticket"}</button>
      </div>
      <ActionDrawer open={open} onClose={() => setOpen(false)} title={copy.trade.title} closeLabel={props.locale === "zh-Hant" ? "關閉應援面板" : "Close support panel"} returnFocusRef={triggerRef}>
        <SupportTradePanel {...props} />
      </ActionDrawer>
    </>
  );
}
