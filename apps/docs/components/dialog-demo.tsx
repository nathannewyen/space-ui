"use client";

import type { CSSProperties } from "react";

import { Dialog } from "@spacing-ui/core";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
};

const contentStyle: CSSProperties = {
  background: "white",
  color: "black",
  padding: "1.5rem",
  borderRadius: "0.5rem",
  minWidth: 320,
  maxWidth: 480,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const buttonStyle: CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: "0.375rem",
  background: "#111",
  color: "white",
  border: "none",
  cursor: "pointer",
};

export function DialogDemo() {
  return (
    <Dialog>
      <Dialog.Trigger style={buttonStyle}>Open dialog</Dialog.Trigger>
      <Dialog.Overlay style={overlayStyle}>
        <Dialog.Content style={contentStyle}>
          <Dialog.Title style={{ marginTop: 0 }}>Confirm action</Dialog.Title>
          <Dialog.Description>
            This dialog handles focus trap, escape-to-close, and body scroll lock for you.
          </Dialog.Description>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <Dialog.Close style={{ ...buttonStyle, background: "#eee", color: "#111" }}>
              Cancel
            </Dialog.Close>
            <Dialog.Close style={buttonStyle}>Confirm</Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
}
