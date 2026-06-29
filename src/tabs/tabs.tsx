import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";

type Orientation = "horizontal" | "vertical";
type ActivationMode = "automatic" | "manual";

interface TabsContextValue {
  value: string | null;
  onValueChange: (next: string) => void;
  activationMode: ActivationMode;
  orientation: Orientation;
  idPrefix: string;
  listRef: RefObject<HTMLDivElement | null>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<Tabs.${component}> must be rendered inside <Tabs>`);
  }
  return ctx;
}

const triggerId = (prefix: string, value: string) =>
  `${prefix}trigger-${value.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
const contentId = (prefix: string, value: string) =>
  `${prefix}content-${value.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

interface RootProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: Orientation;
  activationMode?: ActivationMode;
}

const Root = forwardRef<HTMLDivElement, RootProps>(function Tabs(
  {
    value: controlled,
    defaultValue,
    onValueChange,
    orientation = "horizontal",
    activationMode = "automatic",
    children,
    ...rest
  },
  ref
) {
  const isControlled = controlled !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue ?? null);
  const value = isControlled ? (controlled ?? null) : uncontrolled;

  const reactId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  const ctx = useMemo<TabsContextValue>(
    () => ({
      value,
      onValueChange: setValue,
      activationMode,
      orientation,
      idPrefix: reactId,
      listRef,
    }),
    [value, setValue, activationMode, orientation, reactId]
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div ref={ref} data-orientation={orientation} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});

interface ListProps extends HTMLAttributes<HTMLDivElement> {
  loop?: boolean;
}

const List = forwardRef<HTMLDivElement, ListProps>(function TabsList(
  { loop = true, children, ...rest },
  forwardedRef
) {
  const ctx = useTabsContext("List");

  const setRefs = (node: HTMLDivElement | null) => {
    ctx.listRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  return (
    <div
      ref={setRefs}
      role="tablist"
      aria-orientation={ctx.orientation}
      data-orientation={ctx.orientation}
      data-loop={loop || undefined}
      {...rest}
    >
      {children}
    </div>
  );
});

interface TriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(function TabsTrigger(
  { value, disabled, onClick, onKeyDown, onFocus, ...rest },
  ref
) {
  const ctx = useTabsContext("Trigger");
  const selected = ctx.value === value;

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || disabled) return;
    ctx.onValueChange(value);
  };

  const move = (direction: 1 | -1 | "first" | "last") => {
    const root = ctx.listRef.current;
    if (!root) return;
    const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
      (el) => !el.disabled
    );
    if (triggers.length === 0) return;

    let nextIdx: number;
    if (direction === "first") nextIdx = 0;
    else if (direction === "last") nextIdx = triggers.length - 1;
    else {
      const idx = triggers.findIndex((el) => el === document.activeElement);
      const loopList = (root.getAttribute("data-loop") ?? "true") !== "false";
      const candidate = idx + direction;
      if (candidate < 0) nextIdx = loopList ? triggers.length - 1 : 0;
      else if (candidate >= triggers.length) nextIdx = loopList ? 0 : triggers.length - 1;
      else nextIdx = candidate;
    }

    const target = triggers[nextIdx];
    if (!target) return;
    target.focus();
    if (ctx.activationMode === "automatic") {
      const v = target.getAttribute("data-value");
      if (v) ctx.onValueChange(v);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || disabled) return;
    const nextKey = ctx.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const prevKey = ctx.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";

    if (e.key === nextKey) {
      e.preventDefault();
      move(1);
    } else if (e.key === prevKey) {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move("first");
    } else if (e.key === "End") {
      e.preventDefault();
      move("last");
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={triggerId(ctx.idPrefix, value)}
      aria-selected={selected}
      aria-controls={contentId(ctx.idPrefix, value)}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      data-state={selected ? "active" : "inactive"}
      data-disabled={disabled || undefined}
      data-orientation={ctx.orientation}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      {...rest}
    />
  );
});

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

const Content = forwardRef<HTMLDivElement, ContentProps>(function TabsContent(
  { value, forceMount, hidden, ...rest },
  ref
) {
  const ctx = useTabsContext("Content");
  const selected = ctx.value === value;

  if (!selected && !forceMount) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      id={contentId(ctx.idPrefix, value)}
      aria-labelledby={triggerId(ctx.idPrefix, value)}
      data-state={selected ? "active" : "inactive"}
      data-orientation={ctx.orientation}
      hidden={hidden ?? !selected}
      tabIndex={0}
      {...rest}
    />
  );
});

export const Tabs = Object.assign(Root, { List, Trigger, Content });

export type {
  RootProps as TabsProps,
  ListProps as TabsListProps,
  TriggerProps as TabsTriggerProps,
  ContentProps as TabsContentProps,
};
