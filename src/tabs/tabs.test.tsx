import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tabs } from "./tabs";

function Harness({
  defaultValue = "one",
  activationMode,
  orientation,
  onChange,
}: {
  defaultValue?: string;
  activationMode?: "automatic" | "manual";
  orientation?: "horizontal" | "vertical";
  onChange?: (v: string) => void;
}) {
  return (
    <Tabs
      defaultValue={defaultValue}
      activationMode={activationMode}
      orientation={orientation}
      onValueChange={onChange}
    >
      <Tabs.List aria-label="t">
        <Tabs.Trigger value="one">One</Tabs.Trigger>
        <Tabs.Trigger value="two">Two</Tabs.Trigger>
        <Tabs.Trigger value="three">Three</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="one">Panel One</Tabs.Content>
      <Tabs.Content value="two">Panel Two</Tabs.Content>
      <Tabs.Content value="three">Panel Three</Tabs.Content>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders tablist, tabs, and only the active panel", () => {
    render(<Harness />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel One");
  });

  it("selects on click and switches the panel", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "Two" }));
    expect(onChange).toHaveBeenCalledWith("two");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel Two");
  });

  it("only the selected trigger is tabbable (roving tabindex)", () => {
    render(<Harness defaultValue="two" />);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("tabindex", "0");
  });

  it("ArrowRight moves focus and activates (automatic)", () => {
    render(<Harness />);
    const one = screen.getByRole("tab", { name: "One" });
    const two = screen.getByRole("tab", { name: "Two" });
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight" });
    expect(two).toHaveFocus();
    expect(two).toHaveAttribute("aria-selected", "true");
  });

  it("manual mode: arrow moves focus but does not activate", () => {
    render(<Harness activationMode="manual" />);
    const one = screen.getByRole("tab", { name: "One" });
    const two = screen.getByRole("tab", { name: "Two" });
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight" });
    expect(two).toHaveFocus();
    expect(one).toHaveAttribute("aria-selected", "true");
    expect(two).toHaveAttribute("aria-selected", "false");
  });

  it("ArrowLeft wraps from first to last", () => {
    render(<Harness />);
    const one = screen.getByRole("tab", { name: "One" });
    const three = screen.getByRole("tab", { name: "Three" });
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowLeft" });
    expect(three).toHaveFocus();
  });

  it("Home / End jump to first / last", () => {
    render(<Harness defaultValue="two" />);
    const two = screen.getByRole("tab", { name: "Two" });
    const one = screen.getByRole("tab", { name: "One" });
    const three = screen.getByRole("tab", { name: "Three" });
    two.focus();

    fireEvent.keyDown(two, { key: "End" });
    expect(three).toHaveFocus();

    fireEvent.keyDown(three, { key: "Home" });
    expect(one).toHaveFocus();
  });

  it("vertical orientation uses up/down", () => {
    render(<Harness orientation="vertical" />);
    const one = screen.getByRole("tab", { name: "One" });
    const two = screen.getByRole("tab", { name: "Two" });
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowDown" });
    expect(two).toHaveFocus();
  });

  it("links trigger and content via aria-controls / aria-labelledby", () => {
    render(<Harness />);
    const trigger = screen.getByRole("tab", { name: "One" });
    const panel = screen.getByRole("tabpanel");
    expect(trigger).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", trigger.id);
  });
});
