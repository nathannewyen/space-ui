import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  contentId: string;
  titleId: string;
  descriptionId: string;
  hasTitle: boolean;
  setHasTitle: (v: boolean) => void;
  hasDescription: boolean;
  setHasDescription: (v: boolean) => void;
  modal: boolean;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error(`<Dialog.${component}> must be rendered inside <Dialog>`);
  }
  return ctx;
}

interface RootProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

const Root = ({
  children,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  modal = true,
}: RootProps) => {
  const isControlled = controlled !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = isControlled ? controlled : uncontrolled;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [hasTitle, setHasTitle] = useState(false);
  const [hasDescription, setHasDescription] = useState(false);

  const reactId = useId();
  const contentId = `${reactId}content`;
  const titleId = `${reactId}title`;
  const descriptionId = `${reactId}description`;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const ctx = useMemo<DialogContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      contentId,
      titleId,
      descriptionId,
      hasTitle,
      setHasTitle,
      hasDescription,
      setHasDescription,
      modal,
    }),
    [open, setOpen, contentId, titleId, descriptionId, hasTitle, hasDescription, modal]
  );

  return <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>;
};

type TriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(function DialogTrigger(
  { onClick, ...rest },
  forwardedRef
) {
  const ctx = useDialogContext("Trigger");

  const setRefs = (node: HTMLButtonElement | null) => {
    ctx.triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    ctx.setOpen(true);
  };

  return (
    <button
      ref={setRefs}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={ctx.open}
      aria-controls={ctx.open ? ctx.contentId : undefined}
      data-state={ctx.open ? "open" : "closed"}
      onClick={handleClick}
      {...rest}
    />
  );
});

interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

const Overlay = forwardRef<HTMLDivElement, OverlayProps>(function DialogOverlay(
  { forceMount, onClick, ...rest },
  ref
) {
  const ctx = useDialogContext("Overlay");

  if (!ctx.open && !forceMount) return null;

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !ctx.modal) return;
    // Click on the overlay itself (not on bubbled content) closes
    if (e.target === e.currentTarget) {
      ctx.setOpen(false);
    }
  };

  return (
    <div ref={ref} data-state={ctx.open ? "open" : "closed"} onClick={handleClick} {...rest} />
  );
});

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
}

const Content = forwardRef<HTMLDivElement, ContentProps>(function DialogContent(
  { forceMount, onEscapeKeyDown, onKeyDown, children, ...rest },
  forwardedRef
) {
  const ctx = useDialogContext("Content");

  const setRefs = (node: HTMLDivElement | null) => {
    ctx.contentRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  // Focus management: on open, save previous focus, move focus into the dialog.
  // On close, restore focus to the trigger (or previously-focused element).
  useEffect(() => {
    if (!ctx.open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => {
      const root = ctx.contentRef.current;
      if (!root) return;
      const focusables = getFocusables(root);
      const target = focusables[0] ?? root;
      target.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      const trigger = ctx.triggerRef.current;
      (trigger ?? previouslyFocused)?.focus?.();
    };
  }, [ctx.open, ctx.contentRef, ctx.triggerRef]);

  // Body scroll lock when modal
  useEffect(() => {
    if (!ctx.open || !ctx.modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [ctx.open, ctx.modal]);

  // Escape closes (use document listener since focus may be on inner elements)
  const { open: ctxOpen, setOpen: ctxSetOpen } = ctx;
  useEffect(() => {
    if (!ctxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onEscapeKeyDown?.(e);
      if (e.defaultPrevented) return;
      ctxSetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ctxOpen, ctxSetOpen, onEscapeKeyDown]);

  if (!ctx.open && !forceMount) return null;

  // Focus trap: if Tab would leave the dialog, wrap.
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key !== "Tab" || !ctx.modal) return;
    const focusables = getFocusables(ctx.contentRef.current);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !ctx.contentRef.current?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={setRefs}
      role="dialog"
      aria-modal={ctx.modal || undefined}
      id={ctx.contentId}
      aria-labelledby={ctx.hasTitle ? ctx.titleId : undefined}
      aria-describedby={ctx.hasDescription ? ctx.descriptionId : undefined}
      tabIndex={-1}
      data-state={ctx.open ? "open" : "closed"}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
});

type TitleProps = HTMLAttributes<HTMLHeadingElement>;

const Title = forwardRef<HTMLHeadingElement, TitleProps>(function DialogTitle(props, ref) {
  const ctx = useDialogContext("Title");
  useEffect(() => {
    ctx.setHasTitle(true);
    return () => ctx.setHasTitle(false);
  }, [ctx]);
  return <h2 ref={ref} id={ctx.titleId} {...props} />;
});

type DescriptionProps = HTMLAttributes<HTMLParagraphElement>;

const Description = forwardRef<HTMLParagraphElement, DescriptionProps>(
  function DialogDescription(props, ref) {
    const ctx = useDialogContext("Description");
    useEffect(() => {
      ctx.setHasDescription(true);
      return () => ctx.setHasDescription(false);
    }, [ctx]);
    return <p ref={ref} id={ctx.descriptionId} {...props} />;
  }
);

type CloseProps = ButtonHTMLAttributes<HTMLButtonElement>;

const Close = forwardRef<HTMLButtonElement, CloseProps>(function DialogClose(
  { onClick, ...rest },
  ref
) {
  const ctx = useDialogContext("Close");
  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    ctx.setOpen(false);
  };
  return <button ref={ref} type="button" onClick={handleClick} {...rest} />;
});

export const Dialog = Object.assign(Root, {
  Trigger,
  Overlay,
  Content,
  Title,
  Description,
  Close,
});

export type {
  RootProps as DialogProps,
  TriggerProps as DialogTriggerProps,
  OverlayProps as DialogOverlayProps,
  ContentProps as DialogContentProps,
  TitleProps as DialogTitleProps,
  DescriptionProps as DialogDescriptionProps,
  CloseProps as DialogCloseProps,
};
