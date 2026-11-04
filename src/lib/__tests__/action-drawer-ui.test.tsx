import { StrictMode, useRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionDrawer } from "@/components/ui/action-drawer";

afterEach(() => { cleanup(); document.body.removeAttribute("style"); vi.unstubAllGlobals(); });

function Harness({ explicit = false }: { explicit?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <><button ref={trigger} onClick={() => setOpen(true)}>Support</button><button>Outside</button>
    <ActionDrawer open={open} onClose={() => setOpen(false)} title="Support character" closeLabel="Close support" returnFocusRef={explicit ? trigger : undefined}>
      <input aria-label="Quantity" /><button>Confirm</button><button disabled>Disabled</button><button hidden>Hidden</button>
      <details><summary>More</summary><button>Closed detail</button></details>
    </ActionDrawer></>;
}

describe("shared ActionDrawer", () => {
  it("portals to body, focuses close, traps both Tab directions, and restores the explicit trigger", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness explicit />);
    const trigger = screen.getByRole("button", { name: "Support" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Support character" });
    expect(container).not.toContainElement(dialog);
    const close = within(dialog).getByRole("button", { name: "Close support" });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByText("More")).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole("textbox", { name: "Quantity" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("contains programmatic focus and restores previously focused elements without a ref", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Support" });
    const outside = screen.getByRole("button", { name: "Outside" });
    await user.click(trigger);
    outside.focus();
    expect(screen.getByRole("button", { name: "Close support" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Close support" }));
    expect(trigger).toHaveFocus();
  });

  it("restores existing inert attributes and body styles on close and unmount, including StrictMode", async () => {
    document.body.style.setProperty("overflow", "scroll", "important");
    document.body.style.setProperty("overscroll-behavior", "none");
    const background = document.createElement("aside");
    background.setAttribute("inert", "already-inert");
    document.body.append(background);
    const { unmount, container } = render(<StrictMode><Harness /></StrictMode>);
    await userEvent.click(screen.getByRole("button", { name: "Support" }));
    expect(container).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");
    const late = document.createElement("aside");
    document.body.append(late);
    await waitFor(() => expect(late).toHaveAttribute("inert"));
    unmount();
    expect(container).not.toHaveAttribute("inert");
    expect(background).toHaveAttribute("inert", "already-inert");
    expect(late).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.getPropertyPriority("overflow")).toBe("important");
    expect(document.body.style.getPropertyValue("overscroll-behavior")).toBe("none");
    background.remove(); late.remove();
  });

  it("keeps outer drawers inert and locked until the last drawer closes", async () => {
    function Nested() {
      const [outer, setOuter] = useState(true);
      const [inner, setInner] = useState(false);
      return <ActionDrawer open={outer} onClose={() => setOuter(false)} title="Outer" closeLabel="Close outer">
        <button onClick={() => setInner(true)}>Open nested</button>
        <ActionDrawer open={inner} onClose={() => setInner(false)} title="Inner" closeLabel="Close inner"><button>Inside</button></ActionDrawer>
      </ActionDrawer>;
    }
    render(<Nested />);
    const outer = screen.getByRole("dialog", { name: "Outer" });
    const opener = screen.getByRole("button", { name: "Open nested" });
    await userEvent.click(opener);
    expect(outer.parentElement).toHaveAttribute("inert");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Inner" })).not.toBeInTheDocument();
    expect(outer.parentElement).not.toHaveAttribute("inert");
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("tracks the soft-keyboard viewport and removes its listeners", () => {
    const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number };
    viewport.height = 420; viewport.offsetTop = 20;
    vi.stubGlobal("visualViewport", viewport);
    const remove = vi.spyOn(viewport, "removeEventListener");
    const { unmount } = render(<ActionDrawer open onClose={() => {}} title="Keyboard" closeLabel="Close"><input /></ActionDrawer>);
    const root = screen.getByRole("dialog").parentElement!;
    expect(root.style.height).toBe("420px");
    expect(root.style.top).toBe("20px");
    act(() => { viewport.height = 300; viewport.dispatchEvent(new Event("resize")); });
    expect(root.style.height).toBe("300px");
    unmount();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("uses the latest onClose without reinitializing focus and ignores composing Escape", () => {
    const first = vi.fn(); const second = vi.fn();
    const { rerender } = render(<ActionDrawer open onClose={first} title="Stable" closeLabel="Close"><input aria-label="Edit" /></ActionDrawer>);
    const input = screen.getByRole("textbox", { name: "Edit" });
    input.focus();
    rerender(<ActionDrawer open onClose={second} title="Stable" closeLabel="Close"><input aria-label="Edit" /></ActionDrawer>);
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Escape", isComposing: true });
    expect(second).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });
});
