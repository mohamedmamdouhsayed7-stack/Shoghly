import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("Arabic foundation page", () => {
  it("renders the Arabic-first introduction and primary navigation", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: /وقتك له قيمة/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "التنقل الرئيسي" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "انتقل إلى المحتوى الرئيسي" }),
    ).toHaveAttribute("href", "#main");
  });
});
