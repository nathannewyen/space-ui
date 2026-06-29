import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

const DEFAULT_DELAY_MS = 700;
const DEFAULT_SKIP_DELAY_MS = 300;

interface ProviderContextValue {
  delayDuration: number;
  skipDelayDuration: number;
  isInSkipWindow: () => boolean;
  noteClose: () => void;
}

const ProviderContext = createContext<ProviderContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
}

const Provider = ({
  children,
  delayDuration = DEFAULT_DELAY_MS,
  skipDelayDuration = DEFAULT_SKIP_DELAY_MS,
}: ProviderProps) => {
  const lastCloseAt = useRef(0);

  const isInSkipWindow = useCallback(
    () => Date.now() - lastCloseAt.current < skipDelayDuration,
    [skipDelayDuration]
  );

  const noteClose = useCallback(() => {
    lastCloseAt.current = Date.now();
  }, []);

  const value = useMemo<ProviderContextValue>(
    () => ({ delayDuration, skipDelayDuration, isInSkipWindow, noteClose }),
    [delayDuration, skipDelayDuration, isInSkipWindow, noteClose]
  );

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
};

interface TooltipContextValue {
  open: boolean;
  contentId: string;
  triggerProps: {
    onMouseEnter: (e: ReactMouseEvent<HTMLElement>) => void;
    onMouseLeave: (e: ReactMouseEvent<HTMLElement>) => void;
    onFocus: (e: ReactFocusEvent<HTMLElement>) => void;
    onBlur: (e: ReactFocusEvent<HTMLElement>) => void;
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
    "aria-describedby"?: string;
  };
  setTriggerRef: (node: HTMLElement | null) => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error(`<Tooltip.${component}> must be rendered inside <Tooltip>`);
  }
  return ctx;
}

interface RootProps {
  children: ReactNode;
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Root = ({
  children,
  delayDuration,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: RootProps) => {
  const provider = useContext(ProviderContext);
  const effectiveDelay = delayDuration ?? provider?.delayDuration ?? DEFAULT_DELAY_MS;

  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const reactId = useId();
  const contentId = `${reactId}content`;

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
      if (!next) provider?.noteClose();
    },
    [isControlled, onOpenChange, provider]
  );

  const scheduleOpen = useCallback(() => {
    clearOpenTimer();
    if (provider?.isInSkipWindow()) {
      setOpen(true);
      return;
    }
    openTimerRef.current = setTimeout(() => {
      setOpen(true);
      openTimerRef.current = null;
    }, effectiveDelay);
  }, [clearOpenTimer, effectiveDelay, provider, setOpen]);

  const closeImmediately = useCallback(() => {
    clearOpenTimer();
    setOpen(false);
  }, [clearOpenTimer, setOpen]);

  useEffect(() => clearOpenTimer, [clearOpenTimer]);

  const setTriggerRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const triggerProps = useMemo<TooltipContextValue["triggerProps"]>(
    () => ({
      onMouseEnter: () => scheduleOpen(),
      onMouseLeave: () => closeImmediately(),
      onFocus: () => {
        clearOpenTimer();
        setOpen(true);
      },
      onBlur: () => closeImmediately(),
      onKeyDown: (e) => {
        if (e.key === "Escape" && open) {
          closeImmediately();
        }
      },
      "aria-describedby": open ? contentId : undefined,
    }),
    [scheduleOpen, closeImmediately, clearOpenTimer, setOpen, open, contentId]
  );

  const value = useMemo<TooltipContextValue>(
    () => ({ open, contentId, triggerProps, setTriggerRef }),
    [open, contentId, triggerProps, setTriggerRef]
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
};

type SlottableProps = HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>;
  "aria-describedby"?: string;
};

interface TriggerProps {
  children: ReactElement<SlottableProps>;
}

function composeRef<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as { current: T | null }).current = node;
    }
  };
}

function composeHandler<E>(...handlers: Array<((e: E) => void) | undefined>) {
  return (e: E) => {
    for (const handler of handlers) {
      handler?.(e);
      if (
        typeof (e as unknown as { defaultPrevented?: boolean }).defaultPrevented === "boolean" &&
        (e as unknown as { defaultPrevented: boolean }).defaultPrevented
      ) {
        return;
      }
    }
  };
}

const Trigger = ({ children }: TriggerProps) => {
  const ctx = useTooltipContext("Trigger");

  if (!isValidElement(children)) {
    throw new Error("<Tooltip.Trigger> expects a single React element child.");
  }

  const child = children as ReactElement<SlottableProps>;
  const childProps = child.props;
  const childRef = (child as ReactElement<SlottableProps> & { ref?: Ref<HTMLElement> }).ref;

  const merged: SlottableProps = {
    ...childProps,
    onMouseEnter: composeHandler<ReactMouseEvent<HTMLElement>>(
      childProps.onMouseEnter,
      ctx.triggerProps.onMouseEnter
    ),
    onMouseLeave: composeHandler<ReactMouseEvent<HTMLElement>>(
      childProps.onMouseLeave,
      ctx.triggerProps.onMouseLeave
    ),
    onFocus: composeHandler<ReactFocusEvent<HTMLElement>>(
      childProps.onFocus,
      ctx.triggerProps.onFocus
    ),
    onBlur: composeHandler<ReactFocusEvent<HTMLElement>>(
      childProps.onBlur,
      ctx.triggerProps.onBlur
    ),
    onKeyDown: composeHandler<ReactKeyboardEvent<HTMLElement>>(
      childProps.onKeyDown,
      ctx.triggerProps.onKeyDown
    ),
    "aria-describedby":
      [childProps["aria-describedby"], ctx.triggerProps["aria-describedby"]]
        .filter(Boolean)
        .join(" ") || undefined,
    ref: composeRef(childRef, ctx.setTriggerRef),
  };

  return cloneElement(child, merged);
};

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  forceMount?: boolean;
}

const Content = ({ children, forceMount, id, ...rest }: ContentProps) => {
  const ctx = useTooltipContext("Content");

  if (!ctx.open && !forceMount) return null;

  return (
    <div
      id={id ?? ctx.contentId}
      role="tooltip"
      data-state={ctx.open ? "open" : "closed"}
      {...rest}
    >
      {children}
    </div>
  );
};

export const Tooltip = Object.assign(Root, {
  Provider,
  Trigger,
  Content,
});

export type {
  ProviderProps as TooltipProviderProps,
  RootProps as TooltipProps,
  TriggerProps as TooltipTriggerProps,
  ContentProps as TooltipContentProps,
};
