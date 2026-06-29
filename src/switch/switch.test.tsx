import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders unchecked by default", () => {
    render(<Switch aria-label="airplane" />);
    const sw = screen.getByRole("switch", { name: "airplane" });
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("respects defaultChecked (uncontrolled)", () => {
    render(<Switch aria-label="x" defaultChecked />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on click in uncontrolled mode and fires onCheckedChange", () => {
    const onChange = vi.fn();
    render(<Switch aria-label="x" onCheckedChange={onChange} />);
    const sw = screen.getByRole("switch");

    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("respects controlled value and never sets state internally", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Switch aria-label="x" checked={false} onCheckedChange={onChange} />
    );
    const sw = screen.getByRole("switch");

    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(sw).toHaveAttribute("aria-checked", "false");

    rerender(<Switch aria-label="x" checked onCheckedChange={onChange} />);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on Space and Enter", () => {
    const onChange = vi.fn();
    render(<Switch aria-label="x" onCheckedChange={onChange} />);
    const sw = screen.getByRole("switch");

    fireEvent.keyDown(sw, { key: " " });
    expect(onChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(sw, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("ignores interaction when disabled", () => {
    const onChange = vi.fn();
    render(<Switch aria-label="x" disabled onCheckedChange={onChange} />);
    const sw = screen.getByRole("switch");

    fireEvent.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes data-state for styling", () => {
    render(<Switch aria-label="x" defaultChecked />);
    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked");
  });
});
