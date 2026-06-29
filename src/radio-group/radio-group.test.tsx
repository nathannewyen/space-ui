import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RadioGroup } from "./radio-group";

function Harness({
  defaultValue,
  onChange,
  orientation,
}: {
  defaultValue?: string;
  onChange?: (v: string) => void;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <RadioGroup defaultValue={defaultValue} onValueChange={onChange} orientation={orientation}>
      <RadioGroup.Item value="a" aria-label="A" />
      <RadioGroup.Item value="b" aria-label="B" />
      <RadioGroup.Item value="c" aria-label="C" />
    </RadioGroup>
  );
}

describe("RadioGroup", () => {
  it("renders a radiogroup with radio items", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("selects on click and fires onValueChange", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "B" }));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute("aria-checked", "false");
  });

  it("only the first item is tabbable when nothing selected", () => {
    render(<Harness />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("tabindex", "0");
    expect(radios[1]).toHaveAttribute("tabindex", "-1");
    expect(radios[2]).toHaveAttribute("tabindex", "-1");
  });

  it("only the selected item is tabbable when a value is set", () => {
    render(<Harness defaultValue="b" />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("tabindex", "-1");
    expect(radios[1]).toHaveAttribute("tabindex", "0");
    expect(radios[2]).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowDown / ArrowUp move focus and select (vertical default)", () => {
    render(<Harness defaultValue="a" />);
    const a = screen.getByRole("radio", { name: "A" });
    const b = screen.getByRole("radio", { name: "B" });

    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(b).toHaveFocus();
    expect(b).toHaveAttribute("aria-checked", "true");

    fireEvent.keyDown(b, { key: "ArrowUp" });
    expect(a).toHaveFocus();
    expect(a).toHaveAttribute("aria-checked", "true");
  });

  it("ArrowDown wraps from last to first", () => {
    render(<Harness defaultValue="c" />);
    const c = screen.getByRole("radio", { name: "C" });
    const a = screen.getByRole("radio", { name: "A" });
    c.focus();
    fireEvent.keyDown(c, { key: "ArrowDown" });
    expect(a).toHaveFocus();
  });

  it("horizontal orientation uses left/right arrows", () => {
    render(<Harness defaultValue="a" orientation="horizontal" />);
    const a = screen.getByRole("radio", { name: "A" });
    const b = screen.getByRole("radio", { name: "B" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(b).toHaveFocus();
  });

  it("disabled group ignores click", () => {
    const onChange = vi.fn();
    render(
      <RadioGroup disabled onValueChange={onChange}>
        <RadioGroup.Item value="a" aria-label="A" />
        <RadioGroup.Item value="b" aria-label="B" />
      </RadioGroup>
    );
    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
