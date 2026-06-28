import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  useCallback,
  forwardRef,
  type ReactNode,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";

type Renderable<S> = ReactNode | ((state: S) => ReactNode);

function render<S>(children: Renderable<S> | undefined, state: S): ReactNode {
  return typeof children === "function" ? children(state) : children;
}

interface OptionData {
  value: string;
  textValue: string;
}

interface SelectContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  activeValue: string | null;
  setActiveValue: (value: string | null) => void;
  triggerId: string;
  listboxId: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  listboxRef: RefObject<HTMLDivElement | null>;
  getOptionId: (value: string) => string;
  getOrderedOptions: () => OptionData[];
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(component: string): SelectContextValue {
  const ctx = useContext(SelectContext);
  if (!ctx) {
    throw new Error(`<Select.${component}> must be rendered inside <Select>`);
  }
  return ctx;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

const Root = ({ value, onValueChange, children }: SelectProps) => {
  const [open, setOpenState] = useState(false);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);

  const reactId = useId();
  const triggerId = `${reactId}trigger`;
  const listboxId = `${reactId}listbox`;
  const optionIdPrefix = `${reactId}option-`;

  const getOptionId = useCallback(
    (v: string) => optionIdPrefix + v.replace(/[^a-zA-Z0-9_-]/g, "_"),
    [optionIdPrefix]
  );

  const getOrderedOptions = useCallback((): OptionData[] => {
    const root = listboxRef.current;
    if (!root) return [];
    const nodes = root.querySelectorAll<HTMLElement>('[role="option"]');
    return Array.from(nodes).map((node) => ({
      value: node.dataset.value ?? "",
      textValue: node.dataset.textValue ?? node.textContent ?? "",
    }));
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) setActiveValue(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !listboxRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen]);

  const ctxValue = useMemo<SelectContextValue>(
    () => ({
      open,
      setOpen,
      value,
      onValueChange,
      activeValue,
      setActiveValue,
      triggerId,
      listboxId,
      triggerRef,
      listboxRef,
      getOptionId,
      getOrderedOptions,
    }),
    [
      open,
      setOpen,
      value,
      onValueChange,
      activeValue,
      triggerId,
      listboxId,
      getOptionId,
      getOrderedOptions,
    ]
  );

  return <SelectContext.Provider value={ctxValue}>{children}</SelectContext.Provider>;
};

interface TriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: Renderable<{ open: boolean; value: string }>;
}

const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(function Trigger(
  { children, onClick, onKeyDown, ...rest },
  forwardedRef
) {
  const ctx = useSelectContext("Trigger");

  const setRefs = (node: HTMLButtonElement | null) => {
    ctx.triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    ctx.setOpen(!ctx.open);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      ctx.setOpen(true);
    }
  };

  return (
    <button
      ref={setRefs}
      type="button"
      id={ctx.triggerId}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      aria-controls={ctx.listboxId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {render(children, { open: ctx.open, value: ctx.value })}
    </button>
  );
});

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const TYPEAHEAD_TIMEOUT_MS = 500;

const Content = ({ children, onKeyDown, ...rest }: ContentProps) => {
  const ctx = useSelectContext("Content");
  const typeaheadRef = useRef({ buffer: "", lastTime: 0 });

  useEffect(() => {
    if (!ctx.open) return;
    const options = ctx.getOrderedOptions();
    if (options.length === 0) {
      ctx.listboxRef.current?.focus();
      return;
    }
    const initial = options.find((o) => o.value === ctx.value)?.value ?? options[0]!.value;
    ctx.setActiveValue(initial);
    ctx.listboxRef.current?.focus();
    // only re-run on open transition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.open]);

  if (!ctx.open) return null;

  const moveActive = (delta: 1 | -1 | "first" | "last") => {
    const options = ctx.getOrderedOptions();
    if (options.length === 0) return;
    const currentIdx = options.findIndex((o) => o.value === ctx.activeValue);
    let nextIdx: number;
    if (delta === "first") nextIdx = 0;
    else if (delta === "last") nextIdx = options.length - 1;
    else if (currentIdx === -1) nextIdx = delta === 1 ? 0 : options.length - 1;
    else nextIdx = Math.min(options.length - 1, Math.max(0, currentIdx + delta));
    ctx.setActiveValue(options[nextIdx]!.value);
  };

  const typeahead = (char: string) => {
    const now = Date.now();
    const reset = now - typeaheadRef.current.lastTime > TYPEAHEAD_TIMEOUT_MS;
    const buffer = (reset ? "" : typeaheadRef.current.buffer) + char.toLowerCase();
    typeaheadRef.current = { buffer, lastTime: now };
    const options = ctx.getOrderedOptions();
    const match = options.find((o) => o.textValue.toLowerCase().startsWith(buffer));
    if (match) ctx.setActiveValue(match.value);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        return;
      case "Home":
        e.preventDefault();
        moveActive("first");
        return;
      case "End":
        e.preventDefault();
        moveActive("last");
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (ctx.activeValue !== null) {
          ctx.onValueChange(ctx.activeValue);
          ctx.setOpen(false);
          ctx.triggerRef.current?.focus();
        }
        return;
      case "Escape":
        e.preventDefault();
        ctx.setOpen(false);
        ctx.triggerRef.current?.focus();
        return;
      case "Tab":
        ctx.setOpen(false);
        return;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          typeahead(e.key);
        }
    }
  };

  return (
    <div
      ref={(node) => {
        ctx.listboxRef.current = node;
      }}
      id={ctx.listboxId}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={ctx.triggerId}
      aria-activedescendant={
        ctx.activeValue !== null ? ctx.getOptionId(ctx.activeValue) : undefined
      }
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
};

interface OptionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  value: string;
  textValue?: string;
  children?: Renderable<{ selected: boolean; active: boolean }>;
}

const Option = ({ value, textValue, children, onMouseEnter, onClick, ...rest }: OptionProps) => {
  const ctx = useSelectContext("Option");
  const selected = ctx.value === value;
  const active = ctx.activeValue === value;

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    ctx.onValueChange(value);
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
  };

  const handleMouseEnter = (e: ReactMouseEvent<HTMLDivElement>) => {
    onMouseEnter?.(e);
    if (e.defaultPrevented) return;
    ctx.setActiveValue(value);
  };

  return (
    <div
      id={ctx.getOptionId(value)}
      role="option"
      aria-selected={selected}
      data-value={value}
      data-text-value={textValue}
      data-active={active || undefined}
      data-selected={selected || undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      {...rest}
    >
      {render(children, { selected, active })}
    </div>
  );
};

export const Select = Object.assign(Root, {
  Trigger,
  Content,
  Option,
});

export type { SelectProps, TriggerProps, ContentProps, OptionProps };
