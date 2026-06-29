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
  type RefObject,
} from "react";

interface RadioGroupContextValue {
  value: string | null;
  onValueChange: (next: string) => void;
  name: string;
  disabled: boolean;
  orientation: "horizontal" | "vertical";
  groupRef: RefObject<HTMLDivElement | null>;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext(component: string): RadioGroupContextValue {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <RadioGroup>`);
  }
  return ctx;
}

interface RadioGroupRootProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
}

const Root = forwardRef<HTMLDivElement, RadioGroupRootProps>(function RadioGroup(
  {
    value: controlled,
    defaultValue,
    onValueChange,
    name,
    disabled = false,
    orientation = "vertical",
    children,
    ...rest
  },
  forwardedRef
) {
  const isControlled = controlled !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue ?? null);
  const value = isControlled ? (controlled ?? null) : uncontrolled;
  const reactId = useId();
  const generatedName = name ?? `${reactId}name`;
  const groupRef = useRef<HTMLDivElement | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    groupRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const setValue = useCallback(
    (next: string) => {
      if (disabled) return;
      if (!isControlled) setUncontrolled(next);
      onValueChange?.(next);
    },
    [disabled, isControlled, onValueChange]
  );

  // Roving tabindex: exactly one item is tabbable.
  // If a value is selected, that item. Otherwise, the first non-disabled item.
  useEffect(() => {
    const root = groupRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const tabbable =
      value !== null
        ? items.find((el) => el.getAttribute("data-value") === value && !el.disabled)
        : items.find((el) => !el.disabled);
    items.forEach((el) => {
      el.tabIndex = el === tabbable ? 0 : -1;
    });
  });

  const ctx = useMemo<RadioGroupContextValue>(
    () => ({
      value,
      onValueChange: setValue,
      name: generatedName,
      disabled,
      orientation,
      groupRef,
    }),
    [value, setValue, generatedName, disabled, orientation]
  );

  return (
    <RadioGroupContext.Provider value={ctx}>
      <div
        ref={setRefs}
        role="radiogroup"
        aria-orientation={orientation}
        aria-disabled={disabled || undefined}
        data-disabled={disabled || undefined}
        {...rest}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
});

interface ItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
  disabled?: boolean;
}

const Item = forwardRef<HTMLButtonElement, ItemProps>(function RadioGroupItem(
  { value, disabled: itemDisabled, onClick, onKeyDown, ...rest },
  ref
) {
  const ctx = useRadioGroupContext("RadioGroup.Item");
  const disabled = ctx.disabled || !!itemDisabled;
  const checked = ctx.value === value;

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || disabled) return;
    ctx.onValueChange(value);
  };

  const move = (direction: 1 | -1) => {
    const root = ctx.groupRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="radio"]')).filter(
      (el) => !el.disabled
    );
    if (items.length === 0) return;
    const idx = items.findIndex((el) => el === document.activeElement);
    const nextIdx = (idx + direction + items.length) % items.length;
    const next = items[nextIdx];
    if (!next) return;
    next.focus();
    const nextValue = next.getAttribute("data-value");
    if (nextValue) ctx.onValueChange(nextValue);
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
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      name={ctx.name}
      value={value}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      tabIndex={-1}
      data-value={value}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
});

export const RadioGroup = Object.assign(Root, { Item });

export type { RadioGroupRootProps as RadioGroupProps, ItemProps as RadioGroupItemProps };
