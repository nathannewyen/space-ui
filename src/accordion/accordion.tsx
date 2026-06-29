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
  type ReactNode,
  type RefObject,
} from "react";

type AccordionType = "single" | "multiple";

interface AccordionContextValue {
  type: AccordionType;
  values: string[];
  toggle: (value: string) => void;
  collapsible: boolean;
  disabled: boolean;
  idPrefix: string;
  rootRef: RefObject<HTMLDivElement | null>;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext(component: string): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error(`<Accordion.${component}> must be rendered inside <Accordion>`);
  }
  return ctx;
}

interface ItemContextValue {
  value: string;
  open: boolean;
  disabled: boolean;
  triggerId: string;
  contentId: string;
}

const ItemContext = createContext<ItemContextValue | null>(null);

function useItemContext(component: string): ItemContextValue {
  const ctx = useContext(ItemContext);
  if (!ctx) {
    throw new Error(`<Accordion.${component}> must be rendered inside <Accordion.Item>`);
  }
  return ctx;
}

type RootProps =
  | (HTMLAttributes<HTMLDivElement> & {
      type: "single";
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
      collapsible?: boolean;
      disabled?: boolean;
    })
  | (HTMLAttributes<HTMLDivElement> & {
      type: "multiple";
      value?: string[];
      defaultValue?: string[];
      onValueChange?: (value: string[]) => void;
      disabled?: boolean;
    });

const Root = forwardRef<HTMLDivElement, RootProps>(function Accordion(props, forwardedRef) {
  const {
    type,
    disabled = false,
    children,
    // strip controlled-state props so they don't leak onto the DOM
    value: _v,
    defaultValue: _dv,
    onValueChange: _ovc,
    collapsible: _col,
    ...rest
  } = props as RootProps & {
    children?: ReactNode;
    value?: unknown;
    defaultValue?: unknown;
    onValueChange?: unknown;
    collapsible?: unknown;
  };
  void _v;
  void _dv;
  void _ovc;
  void _col;

  // Normalize controlled / uncontrolled value handling
  const isMultiple = type === "multiple";
  const controlled =
    "value" in props
      ? isMultiple
        ? (props.value as string[] | undefined)
        : (props.value as string | undefined)
      : undefined;
  const isControlled = controlled !== undefined;
  const defaultValue =
    "defaultValue" in props
      ? isMultiple
        ? ((props.defaultValue as string[] | undefined) ?? [])
        : ((props.defaultValue as string | undefined) ?? null)
      : isMultiple
        ? []
        : null;

  const [uncontrolledArr, setUncontrolledArr] = useState<string[]>(
    isMultiple ? ((defaultValue as string[]) ?? []) : []
  );
  const [uncontrolledStr, setUncontrolledStr] = useState<string | null>(
    isMultiple ? null : ((defaultValue as string | null) ?? null)
  );

  const values = useMemo<string[]>(() => {
    if (isMultiple) {
      return isControlled ? ((controlled as string[]) ?? []) : uncontrolledArr;
    }
    return isControlled
      ? controlled
        ? [controlled as string]
        : []
      : uncontrolledStr
        ? [uncontrolledStr]
        : [];
  }, [isMultiple, isControlled, controlled, uncontrolledArr, uncontrolledStr]);

  const collapsible = !isMultiple && "collapsible" in props ? !!props.collapsible : isMultiple;

  const reactId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const toggle = useCallback(
    (value: string) => {
      if (disabled) return;
      if (isMultiple) {
        const arr = isControlled ? ((controlled as string[]) ?? []) : uncontrolledArr;
        const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
        if (!isControlled) setUncontrolledArr(next);
        (props as { onValueChange?: (v: string[]) => void }).onValueChange?.(next);
      } else {
        const current = isControlled ? (controlled as string | undefined) : uncontrolledStr;
        const allowEmpty = "collapsible" in props ? !!props.collapsible : false;
        let next: string;
        if (current === value) {
          if (!allowEmpty) return;
          next = "";
        } else {
          next = value;
        }
        if (!isControlled) setUncontrolledStr(next || null);
        (props as { onValueChange?: (v: string) => void }).onValueChange?.(next);
      }
    },
    [disabled, isMultiple, isControlled, controlled, uncontrolledArr, uncontrolledStr, props]
  );

  const ctx = useMemo<AccordionContextValue>(
    () => ({
      type,
      values,
      toggle,
      collapsible,
      disabled,
      idPrefix: reactId,
      rootRef,
    }),
    [type, values, toggle, collapsible, disabled, reactId]
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div ref={setRefs} data-disabled={disabled || undefined} {...rest}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

interface ItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const Item = forwardRef<HTMLDivElement, ItemProps>(function AccordionItem(
  { value, disabled: itemDisabled, children, ...rest },
  ref
) {
  const ctx = useAccordionContext("Item");
  const open = ctx.values.includes(value);
  const disabled = ctx.disabled || !!itemDisabled;

  const safeValue = value.replace(/[^a-zA-Z0-9_-]/g, "_");
  const triggerId = `${ctx.idPrefix}trigger-${safeValue}`;
  const contentId = `${ctx.idPrefix}content-${safeValue}`;

  const itemCtx = useMemo<ItemContextValue>(
    () => ({ value, open, disabled, triggerId, contentId }),
    [value, open, disabled, triggerId, contentId]
  );

  return (
    <ItemContext.Provider value={itemCtx}>
      <div
        ref={ref}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled || undefined}
        {...rest}
      >
        {children}
      </div>
    </ItemContext.Provider>
  );
});

type TriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(function AccordionTrigger(
  { onClick, onKeyDown, ...rest },
  ref
) {
  const ctx = useAccordionContext("Trigger");
  const item = useItemContext("Trigger");

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || item.disabled) return;
    ctx.toggle(item.value);
  };

  const move = (direction: 1 | -1 | "first" | "last") => {
    const root = ctx.rootRef.current;
    if (!root) return;
    const triggers = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger="true"]')
    ).filter((el) => !el.disabled);
    if (triggers.length === 0) return;

    let nextIdx: number;
    if (direction === "first") nextIdx = 0;
    else if (direction === "last") nextIdx = triggers.length - 1;
    else {
      const idx = triggers.findIndex((el) => el === document.activeElement);
      const candidate = idx + direction;
      nextIdx = (candidate + triggers.length) % triggers.length;
    }
    triggers[nextIdx]?.focus();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
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
      id={item.triggerId}
      aria-expanded={item.open}
      aria-controls={item.contentId}
      aria-disabled={item.disabled || undefined}
      disabled={item.disabled}
      data-state={item.open ? "open" : "closed"}
      data-disabled={item.disabled || undefined}
      data-accordion-trigger="true"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
});

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

const Content = forwardRef<HTMLDivElement, ContentProps>(function AccordionContent(
  { forceMount, hidden, children, ...rest },
  ref
) {
  const item = useItemContext("Content");

  if (!item.open && !forceMount) return null;

  return (
    <div
      ref={ref}
      role="region"
      id={item.contentId}
      aria-labelledby={item.triggerId}
      data-state={item.open ? "open" : "closed"}
      hidden={hidden ?? !item.open}
      {...rest}
    >
      {children}
    </div>
  );
});

export const Accordion = Object.assign(Root, { Item, Trigger, Content });

export type {
  RootProps as AccordionProps,
  ItemProps as AccordionItemProps,
  TriggerProps as AccordionTriggerProps,
  ContentProps as AccordionContentProps,
};
