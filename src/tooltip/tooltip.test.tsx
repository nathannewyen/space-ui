import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Tooltip } from "./tooltip";

const DELAY = 50;
const SKIP_DELAY = 100;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function Single({ delayDuration = DELAY }: { delayDuration?: number }) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <Tooltip.Trigger>
        <button>Save</button>
      </Tooltip.Trigger>
      <Tooltip.Content>Save changes</Tooltip.Content>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("renders trigger and no tooltip initially", () => {
    render(<Single />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on hover after delay and closes on mouseleave", async () => {
    render(<Single />);
    const btn = screen.getByRole("button", { name: "Save" });

    fireEvent.mouseEnter(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Save changes");
    });

    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("does not open if mouseleave happens before delay elapses", async () => {
    render(<Single delayDuration={200} />);
    const btn = screen.getByRole("button", { name: "Save" });

    fireEvent.mouseEnter(btn);
    await sleep(50);
    fireEvent.mouseLeave(btn);
    await sleep(250);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens immediately on focus and closes on blur", () => {
    render(<Single />);
    const btn = screen.getByRole("button", { name: "Save" });

    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes on Escape while open", () => {
    render(<Single />);
    const btn = screen.getByRole("button", { name: "Save" });

    fireEvent.focus(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(btn, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("wires aria-describedby only while open", () => {
    render(<Single />);
    const btn = screen.getByRole("button", { name: "Save" });

    expect(btn).not.toHaveAttribute("aria-describedby");

    fireEvent.focus(btn);
    const tooltip = screen.getByRole("tooltip");
    expect(btn).toHaveAttribute("aria-describedby", tooltip.id);

    fireEvent.blur(btn);
    expect(btn).not.toHaveAttribute("aria-describedby");
  });

  it("preserves existing aria-describedby on the trigger child", () => {
    render(
      <Tooltip delayDuration={DELAY}>
        <Tooltip.Trigger>
          <button aria-describedby="external-id">Save</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Save changes</Tooltip.Content>
      </Tooltip>
    );

    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("aria-describedby", "external-id");

    fireEvent.focus(btn);
    const tooltip = screen.getByRole("tooltip");
    expect(btn.getAttribute("aria-describedby")).toBe(`external-id ${tooltip.id}`);
  });

  it("Provider skip-delay opens the next tooltip immediately within window", async () => {
    render(
      <Tooltip.Provider delayDuration={200} skipDelayDuration={SKIP_DELAY}>
        <Tooltip>
          <Tooltip.Trigger>
            <button>Save</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Save changes</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>
            <button>Delete</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Delete item</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>
    );

    const saveBtn = screen.getByRole("button", { name: "Save" });
    const deleteBtn = screen.getByRole("button", { name: "Delete" });

    fireEvent.mouseEnter(saveBtn);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Save changes");
    });

    fireEvent.mouseLeave(saveBtn);
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(deleteBtn);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete item");
  });

  it("Provider skip-delay does not apply after window elapses", async () => {
    render(
      <Tooltip.Provider delayDuration={150} skipDelayDuration={SKIP_DELAY}>
        <Tooltip>
          <Tooltip.Trigger>
            <button>Save</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Save changes</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>
            <button>Delete</button>
          </Tooltip.Trigger>
          <Tooltip.Content>Delete item</Tooltip.Content>
        </Tooltip>
      </Tooltip.Provider>
    );

    const saveBtn = screen.getByRole("button", { name: "Save" });
    const deleteBtn = screen.getByRole("button", { name: "Delete" });

    fireEvent.mouseEnter(saveBtn);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Save changes");
    });
    fireEvent.mouseLeave(saveBtn);

    await sleep(SKIP_DELAY + 50);

    fireEvent.mouseEnter(deleteBtn);
    expect(screen.queryByRole("tooltip")).toBeNull();

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Delete item");
    });
  });
});
