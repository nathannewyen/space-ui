import {
  forwardRef,
  useCallback,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

type CheckedState = boolean | "indeterminate";

interface CheckboxProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "defaultChecked"
> {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  disabled?: boolean;
  required?: boolean;
}

const isChecked = (s: CheckedState) => s === true;
const isIndeterminate = (s: CheckedState) => s === "indeterminate";

const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  {
    checked: controlled,
    defaultChecked = false,
    onCheckedChange,
    disabled,
    required,
    onClick,
    onKeyDown,
    ...rest
  },
  ref
) {
  const isControlled = controlled !== undefined;
  const [uncontrolled, setUncontrolled] = useState<CheckedState>(defaultChecked);
  const value: CheckedState = isControlled ? controlled : uncontrolled;

  const toggle = useCallback(() => {
    if (disabled) return;
    // indeterminate becomes true; true becomes false; false becomes true
    const next: CheckedState = isChecked(value) ? false : true;
    if (!isControlled) setUncontrolled(next);
    onCheckedChange?.(next);
  }, [disabled, isControlled, onCheckedChange, value]);

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    toggle();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    // Enter should NOT toggle a native checkbox; Space does.
    if (e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const ariaChecked: "true" | "false" | "mixed" = isIndeterminate(value)
    ? "mixed"
    : isChecked(value)
      ? "true"
      : "false";

  const dataState = isIndeterminate(value)
    ? "indeterminate"
    : isChecked(value)
      ? "checked"
      : "unchecked";

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={ariaChecked}
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      data-state={dataState}
      data-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
});

export { Checkbox };
export type { CheckboxProps, CheckedState };
