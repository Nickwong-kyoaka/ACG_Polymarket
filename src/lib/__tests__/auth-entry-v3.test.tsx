import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));

import { AuthEntry } from "@/components/auth-entry";

describe("localized auth entry", () => {
  beforeEach(() => mocks.signIn.mockReset().mockResolvedValue(undefined));

  it("starts Google directly instead of returning to the custom sign-in page", async () => {
    render(<AuthEntry locale="en" googleEnabled demoEnabled={false} redirectTo="/en/onboarding?step=interests" />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith("google", { redirectTo: "/en/onboarding?step=interests" }));
  });

  it("keeps credentials limited to the explicit development demo control", async () => {
    render(<AuthEntry locale="zh-Hant" googleEnabled={false} demoEnabled redirectTo="/zh-Hant/community" />);
    fireEvent.change(screen.getByLabelText("本機 Demo 名稱"), { target: { value: "mira-fan" } });
    fireEvent.click(screen.getByRole("button", { name: "進入 Demo" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith("credentials", { handle: "mira-fan", redirectTo: "/zh-Hant/community" }));
  });
});
