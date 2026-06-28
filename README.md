# @spacing-ui/core

Headless, accessible React UI primitives.

## Install

```bash
pnpm add @spacing-ui/core
```

`react` and `react-dom` 18 or 19 are peer dependencies.

## Components

### `Select`

A fully accessible, unstyled listbox. Bring your own styles.

```tsx
import { Select } from "@spacing-ui/core";

function Example() {
  const [value, setValue] = useState("apple");

  return (
    <Select value={value} onValueChange={setValue}>
      <Select.Trigger>
        {({ open }) => (
          <>
            <span>{value}</span>
            <ChevronIcon className={open ? "rotate-180" : ""} />
          </>
        )}
      </Select.Trigger>
      <Select.Content>
        <Select.Option value="apple" textValue="Apple">
          {({ selected, active }) => (
            <div data-active={active} data-selected={selected}>
              Apple
            </div>
          )}
        </Select.Option>
        <Select.Option value="banana" textValue="Banana">
          Banana
        </Select.Option>
      </Select.Content>
    </Select>
  );
}
```

Keyboard:

- `Space` / `Enter` / `↓` / `↑` on trigger: open
- `↑` / `↓`: move highlight
- `Home` / `End`: jump to first / last
- typing letters: jump to matching option
- `Enter` / `Space`: select highlighted
- `Esc`: close, return focus to trigger
- `Tab`: close, move focus on

## License

MIT
