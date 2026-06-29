import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox aria-label="x" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
  });

  it("respects defaultChecked", () => {
    render(<Checkbox aria-label="x" defaultChecked />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  it("supports indeterminate (aria-checked=mixed)", () => {
    render(<Checkbox aria-label="x" checked="indeterminate" />);
    const cb = screen.getByRole("checkbox");
    expect(cb).toHaveAttribute("aria-checked", "mixed");
    expect(cb).toHaveAttribute("data-state", "indeterminate");
  });

  it("indeterminate toggles to true on click", () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="x" defaultChecked="indeterminate" onCheckedChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles on click in uncontrolled mode", () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="x" onCheckedChange={onChange} />);
    const cb = screen.getByRole("checkbox");

    fireEvent.click(cb);
    expect(cb).toHaveAttribute("aria-checked", "true");
    expect(onChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(cb);
    expect(cb).toHaveAttribute("aria-checked", "false");
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("Space toggles, Enter does not", () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="x" onCheckedChange={onChange} />);
    const cb = screen.getByRole("checkbox");

    fireEvent.keyDown(cb, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(cb, { key: " " });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle when disabled", () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="x" disabled onCheckedChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes aria-required when required", () => {
    render(<Checkbox aria-label="x" required />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-required", "true");
  });
});
