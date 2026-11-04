import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SocialNoteImage } from "@/components/social-note-image";
import { socialNoteKind } from "@/components/social-note-types";

afterEach(cleanup);

describe("community visual states", () => {
  it("uses lazy real images and replaces broken media with a readable localized fallback", () => {
    const view = render(<SocialNoteImage url="https://cdn.example.org/look.webp" alt="衣裝細節" locale="zh-Hant" className="aspect-[4/5]" />);
    const image = screen.getByRole("img", { name: "衣裝細節" });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("width", "800");
    expect(view.container.firstChild).toHaveClass("aspect-[4/5]");
    fireEvent.error(image);
    expect(screen.getByRole("img", { name: "衣裝細節: 圖片暫時無法載入" })).toBeVisible();
    view.rerender(<SocialNoteImage url="https://cdn.example.org/new.webp" alt="New look" locale="en" priority />);
    expect(screen.getByRole("img", { name: "New look" })).toHaveAttribute("loading", "eager");
  });
  it("does not request unsafe sources and labels text-only notes", () => {
    const { container } = render(<SocialNoteImage url="javascript:alert(1)" alt="Note" locale="en" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Text note")).toBeVisible();
  });
  it("localizes community kinds instead of displaying enum values", () => {
    expect(socialNoteKind("PREDICTION_TAKE", "zh-Hant")).toBe("預測分析");
    expect(socialNoteKind("PREDICTION_TAKE", "en")).toBe("Prediction analysis");
    expect(socialNoteKind("unknown", "zh-Hant")).toBe("筆記");
  });
});
