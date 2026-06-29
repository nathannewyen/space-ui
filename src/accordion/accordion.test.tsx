import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Accordion } from "./accordion";

function Single({
  collapsible,
  defaultValue,
  onChange,
}: {
  collapsible?: boolean;
  defaultValue?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <Accordion
      type="single"
      collapsible={collapsible}
      defaultValue={defaultValue}
      onValueChange={onChange}
    >
      <Accordion.Item value="a">
        <Accordion.Trigger>A trigger</Accordion.Trigger>
        <Accordion.Content>A content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Trigger>B trigger</Accordion.Trigger>
        <Accordion.Content>B content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="c">
        <Accordion.Trigger>C trigger</Accordion.Trigger>
        <Accordion.Content>C content</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

function Multi({
  defaultValue,
  onChange,
}: {
  defaultValue?: string[];
  onChange?: (v: string[]) => void;
}) {
  return (
    <Accordion type="multiple" defaultValue={defaultValue} onValueChange={onChange}>
      <Accordion.Item value="a">
        <Accordion.Trigger>A trigger</Accordion.Trigger>
        <Accordion.Content>A content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Trigger>B trigger</Accordion.Trigger>
        <Accordion.Content>B content</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("single mode opens one item at a time", () => {
    const onChange = vi.fn();
    render(<Single onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "A trigger" }));
    expect(screen.getByText("A content")).toBeInTheDocument();
    expect(screen.queryByText("B content")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "B trigger" }));
    expect(screen.queryByText("A content")).toBeNull();
    expect(screen.getByText("B content")).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith("b");
  });

  it("single non-collapsible does not allow closing the only open item", () => {
    render(<Single defaultValue="a" />);
    const aTrigger = screen.getByRole("button", { name: "A trigger" });
    expect(screen.getByText("A content")).toBeInTheDocument();
    fireEvent.click(aTrigger);
    expect(screen.getByText("A content")).toBeInTheDocument();
  });

  it("single collapsible allows closing", () => {
    render(<Single collapsible defaultValue="a" />);
    fireEvent.click(screen.getByRole("button", { name: "A trigger" }));
    expect(screen.queryByText("A content")).toBeNull();
  });

  it("multiple mode opens many items independently", () => {
    const onChange = vi.fn();
    render(<Multi onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "A trigger" }));
    fireEvent.click(screen.getByRole("button", { name: "B trigger" }));
    expect(screen.getByText("A content")).toBeInTheDocument();
    expect(screen.getByText("B content")).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);

    fireEvent.click(screen.getByRole("button", { name: "A trigger" }));
    expect(screen.queryByText("A content")).toBeNull();
    expect(screen.getByText("B content")).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(["b"]);
  });

  it("aria-expanded mirrors open state", () => {
    render(<Single defaultValue="a" />);
    expect(screen.getByRole("button", { name: "A trigger" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "B trigger" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("links trigger and content with aria-controls / aria-labelledby", () => {
    render(<Single defaultValue="a" />);
    const trigger = screen.getByRole("button", { name: "A trigger" });
    const region = screen.getByRole("region");
    expect(trigger).toHaveAttribute("aria-controls", region.id);
    expect(region).toHaveAttribute("aria-labelledby", trigger.id);
  });

  it("ArrowDown / ArrowUp move focus between triggers", () => {
    render(<Single />);
    const a = screen.getByRole("button", { name: "A trigger" });
    const b = screen.getByRole("button", { name: "B trigger" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(b).toHaveFocus();
    fireEvent.keyDown(b, { key: "ArrowUp" });
    expect(a).toHaveFocus();
  });

  it("Home / End jump to first / last trigger", () => {
    render(<Single />);
    const a = screen.getByRole("button", { name: "A trigger" });
    const c = screen.getByRole("button", { name: "C trigger" });
    a.focus();
    fireEvent.keyDown(a, { key: "End" });
    expect(c).toHaveFocus();
    fireEvent.keyDown(c, { key: "Home" });
    expect(a).toHaveFocus();
  });
});
