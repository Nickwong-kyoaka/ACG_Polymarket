import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PostComposer } from "@/components/post-composer";

afterEach(cleanup);

it("keeps the note input name stable and its character count descriptive", () => {
  render(<PostComposer locale="en" characters={[]} topics={[]} />);
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveAccessibleDescription("0/10000");
});
