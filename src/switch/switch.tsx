import {
  forwardRef,
  useCallback,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "defaultChecked"
> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked: controlledChecked,
    defaultChecked = false,
    onCheckedChange,
    disabled,
    onClick,
    onKeyDown,
    ...rest
  },
  ref
) {
  const isControlled = controlledChecked !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = isControlled ? controlledChecked : uncontrolled;

  const toggle = useCallback(() => {
    if (disabled) return;
    const next = !checked;
    if (!isControlled) setUncontrolled(next);
    onCheckedChange?.(next);
  }, [checked, disabled, isControlled, onCheckedChange]);

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    toggle();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
});

export { Switch };
export type { SwitchProps };
