"use client";

import { useEffect, useEffectEvent, useId, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ActionDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

const layers: HTMLElement[] = [];
const inertBefore = new Map<HTMLElement, string | null>();
let unlockBody: (() => void) | undefined;
let observer: MutationObserver | undefined;

function updateInert() {
  const active = layers.at(-1);
  for (const node of Array.from(document.body.children)) {
    if (!(node instanceof HTMLElement)) continue;
    if (!inertBefore.has(node)) inertBefore.set(node, node.getAttribute("inert"));
    if (node === active) node.removeAttribute("inert");
    else node.setAttribute("inert", "");
  }
}

function acquireLayer(root: HTMLElement) {
  if (!layers.length) {
    const styles = ["overflow", "overscroll-behavior"] as const;
    const before = styles.map((name) => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)]);
    document.body.style.setProperty("overflow", "hidden");
    document.body.style.setProperty("overscroll-behavior", "contain");
    unlockBody = () => before.forEach(([name, value, priority]) => {
      if (value) document.body.style.setProperty(name, value, priority);
      else document.body.style.removeProperty(name);
    });
    observer = new MutationObserver(updateInert);
    observer.observe(document.body, { childList: true });
  }
  layers.push(root);
  updateInert();
  return () => {
    const index = layers.indexOf(root);
    if (index !== -1) layers.splice(index, 1);
    if (layers.length) updateInert();
    else {
      observer?.disconnect();
      observer = undefined;
      inertBefore.forEach((value, node) => {
        if (value === null) node.removeAttribute("inert");
        else node.setAttribute("inert", value);
      });
      inertBefore.clear();
      unlockBody?.();
      unlockBody = undefined;
    }
  };
}

function focusableElements(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex], summary, audio[controls], video[controls], [contenteditable=true]"))
    .filter((element) => {
      if (element.tabIndex < 0 || element.matches(":disabled") || element.closest("[hidden], [inert]")) return false;
      for (let node: HTMLElement | null = element; node && node !== dialog; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (node instanceof HTMLDetailsElement && !node.open && !node.querySelector(":scope > summary")?.contains(element)) return false;
      }
      return true;
    });
}

function DrawerSurface({ onClose, title, children, closeLabel, returnFocusRef }: Omit<ActionDrawerProps, "open">) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const requestClose = useEffectEvent(onClose);

  useEffect(() => {
    const root = rootRef.current!;
    const dialog = dialogRef.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnTarget = returnFocusRef?.current ?? previous;
    const release = acquireLayer(root);
    closeRef.current?.focus({ preventScroll: true });
    const isTop = () => layers.at(-1) === root;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }
      if (event.key !== "Tab") return;
      const items = focusableElements(dialog);
      const first = items[0] ?? dialog;
      const last = items.at(-1) ?? dialog;
      const current = document.activeElement;
      if (!dialog.contains(current) || current === dialog || (event.shiftKey ? current === first : current === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (isTop() && !dialog.contains(event.target as Node)) closeRef.current?.focus({ preventScroll: true });
    };
    // Follow the visible viewport when a mobile keyboard reduces the available space.
    const viewport = window.visualViewport;
    const resize = () => {
      root.style.height = viewport ? `${viewport.height}px` : "100dvh";
      root.style.top = viewport ? `${viewport.offsetTop}px` : "0px";
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocus);
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      const wasTop = isTop();
      release();
      const target = returnTarget;
      if (wasTop && target?.isConnected && !target.closest("[inert]")) target.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);

  return <div ref={rootRef} className="action-drawer-root fixed inset-x-0 top-0 z-[100] flex items-end justify-center [padding-top:env(safe-area-inset-top)] sm:items-center sm:p-6">
    <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 cursor-default bg-slate-950/40" onClick={onClose} />
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="action-drawer relative flex max-h-full w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white text-slate-900 shadow-xl sm:max-w-xl sm:rounded-2xl">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
        <h2 id={titleId} className="font-display text-xl">{title}</h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-sm text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">{children}</div>
    </div>
  </div>;
}

const subscribe = () => () => {};
export function ActionDrawer({ open, ...props }: ActionDrawerProps) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return open && hydrated ? createPortal(<DrawerSurface {...props} />, document.body) : null;
}
