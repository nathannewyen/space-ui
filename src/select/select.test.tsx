import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

interface HarnessProps {
  initial?: string;
  onChange?: (v: string) => void;
}

function Harness({ initial = "", onChange }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <Select
        value={value}
        onValueChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
      >
        <Select.Trigger aria-label="Fruit">
          {({ open }) => (
            <span data-testid="trigger-content" data-open={open}>
              {value || "Choose…"}
            </span>
          )}
        </Select.Trigger>
        <Select.Content aria-label="Fruit options">
          {fruits.map((f) => (
            <Select.Option key={f.value} value={f.value} textValue={f.label}>
              {f.label}
            </Select.Option>
          ))}
        </Select.Content>
      </Select>
      <button>after</button>
    </div>
  );
}

describe("Select", () => {
  it("renders trigger and keeps listbox hidden initially", () => {
    render(<Harness />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens on trigger click and shows options", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("selects an option by clicking it", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Banana" }));

    expect(onChange).toHaveBeenCalledWith("banana");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByTestId("trigger-content")).toHaveTextContent("banana");
  });

  it("closes on Escape and returns focus to trigger", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("combobox");

    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("ArrowDown on trigger opens with first option active", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("combobox");
    trigger.focus();

    await user.keyboard("{ArrowDown}");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Apple" }).id
    );
  });

  it("ArrowDown / ArrowUp move active option", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    const banana = screen.getByRole("option", { name: "Banana" });
    const cherry = screen.getByRole("option", { name: "Cherry" });

    await user.keyboard("{ArrowDown}");
    expect(listbox).toHaveAttribute("aria-activedescendant", banana.id);

    await user.keyboard("{ArrowDown}");
    expect(listbox).toHaveAttribute("aria-activedescendant", cherry.id);

    await user.keyboard("{ArrowUp}");
    expect(listbox).toHaveAttribute("aria-activedescendant", banana.id);
  });

  it("Home / End jump to first / last", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");

    await user.keyboard("{End}");
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Cherry" }).id
    );

    await user.keyboard("{Home}");
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Apple" }).id
    );
  });

  it("Enter selects the active option", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("banana");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("type-ahead jumps to matching option", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");

    await user.keyboard("c");
    expect(listbox).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Cherry" }).id
    );
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "after" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("marks the selected option with aria-selected", async () => {
    const user = userEvent.setup();
    render(<Harness initial="banana" />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "Apple" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("opens with the current value highlighted", async () => {
    const user = userEvent.setup();
    render(<Harness initial="cherry" />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("listbox")).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Cherry" }).id
    );
  });

  it("wires aria-controls and aria-labelledby", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("combobox");

    await user.click(trigger);
    const listbox = screen.getByRole("listbox");

    expect(trigger).toHaveAttribute("aria-controls", listbox.id);
    expect(listbox).toHaveAttribute("aria-labelledby", trigger.id);
  });
});
