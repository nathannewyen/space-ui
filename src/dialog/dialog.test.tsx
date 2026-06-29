import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dialog } from "./dialog";

function Harness({
  defaultOpen,
  open,
  onOpenChange,
  modal,
  withTitle = true,
  withDescription = true,
}: {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  withTitle?: boolean;
  withDescription?: boolean;
}) {
  return (
    <Dialog defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange} modal={modal}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Overlay data-testid="overlay" />
      <Dialog.Content>
        {withTitle && <Dialog.Title>Title</Dialog.Title>}
        {withDescription && <Dialog.Description>Description</Dialog.Description>}
        <button>First</button>
        <button>Second</button>
        <Dialog.Close>Close</Dialog.Close>
      </Dialog.Content>
    </Dialog>
  );
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("Dialog", () => {
  it("is closed by default and opens on trigger click", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Close button click and returns focus to trigger", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes on Escape", () => {
    const onChange = vi.fn();
    render(<Harness defaultOpen onOpenChange={onChange} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("modal click on overlay closes the dialog", () => {
    const onChange = vi.fn();
    render(<Harness open onOpenChange={onChange} />);
    fireEvent.click(screen.getByTestId("overlay"));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("non-modal click on overlay does not close", () => {
    const onChange = vi.fn();
    render(<Harness open modal={false} onOpenChange={onChange} />);
    fireEvent.click(screen.getByTestId("overlay"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("wires aria-labelledby / aria-describedby from Title and Description", () => {
    render(<Harness defaultOpen />);
    const dialog = screen.getByRole("dialog");
    const title = screen.getByText("Title");
    const desc = screen.getByText("Description");
    expect(dialog).toHaveAttribute("aria-labelledby", title.id);
    expect(dialog).toHaveAttribute("aria-describedby", desc.id);
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("omits aria-labelledby / aria-describedby when Title / Description not present", () => {
    render(<Harness defaultOpen withTitle={false} withDescription={false} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });

  it("locks body scroll while modal dialog open; restores on close", () => {
    const { rerender } = render(<Harness open />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Harness open={false} />);
    expect(document.body.style.overflow).toBe("");
  });

  it("does not lock body scroll when modal={false}", () => {
    render(<Harness defaultOpen modal={false} />);
    expect(document.body.style.overflow).toBe("");
  });

  it("focus trap: Tab from last focusable wraps to first", () => {
    render(<Harness defaultOpen />);
    const first = screen.getByRole("button", { name: "First" });
    const close = screen.getByRole("button", { name: "Close" });
    const dialog = screen.getByRole("dialog");

    close.focus();
    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("focus trap: Shift+Tab from first wraps to last", () => {
    render(<Harness defaultOpen />);
    const first = screen.getByRole("button", { name: "First" });
    const close = screen.getByRole("button", { name: "Close" });
    const dialog = screen.getByRole("dialog");

    first.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();
  });
});
