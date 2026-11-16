// Opening rhythm adapted from useLayouts smooth-dropdown (MIT). See docs/licenses/uselayouts.txt.
import { useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import { Check, ChevronDown } from "lucide-react";
import "./select-field.css";
export type SelectOption = { value: string; label: string; disabled?: boolean };
type Common = {
  label: string;
  options: SelectOption[];
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
  placeholder?: string;
};
export function SelectField(
  props: Common & { value: string; onChange: (value: string) => void },
) {
  return (
    <SelectControl
      {...props}
      values={[props.value]}
      onValues={(values) => props.onChange(values[0] ?? "")}
    />
  );
}
export function MultiSelectField(
  props: Common & { value: string[]; onChange: (value: string[]) => void },
) {
  return (
    <SelectControl
      {...props}
      multiple
      values={props.value}
      onValues={props.onChange}
    />
  );
}
function SelectControl({
  label,
  options,
  disabled,
  hideLabel,
  className = "",
  placeholder = "Select an option",
  multiple = false,
  values,
  onValues,
}: Common & {
  multiple?: boolean;
  values: string[];
  onValues: (values: string[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [owner, setOwner] = useState<string>();
  useLayoutEffect(() => {
    setOwner(
      ref.current
        ?.closest("[data-one-dialog]")
        ?.getAttribute("data-one-dialog") || undefined,
    );
  }, []);
  const keys = values.map((value) => "v:" + value);
  return (
    <Select
      ref={ref}
      className={`one-select ${className}`}
      selectionMode={multiple ? "multiple" : "single"}
      value={multiple ? keys : (keys[0] ?? null)}
      onChange={(value) =>
        onValues(
          (Array.isArray(value) ? value : value === null ? [] : [value]).map(
            (key) => String(key).slice(2),
          ),
        )
      }
      isDisabled={disabled}
      disabledKeys={options
        .filter((option) => option.disabled)
        .map((option) => "v:" + option.value)}
      placeholder={placeholder}
      validationBehavior="aria"
    >
      <Label
        className={
          hideLabel
            ? "one-select-label one-visually-hidden"
            : "one-select-label"
        }
      >
        {label}
      </Label>
      <Button className="one-select-trigger">
        <SelectValue className="one-select-value">
          {({ selectedText, isPlaceholder }) =>
            isPlaceholder ? placeholder : selectedText
          }
        </SelectValue>
        <ChevronDown
          size={15}
          className="one-select-chevron"
          aria-hidden="true"
        />
      </Button>
      <Popover
        className="one-select-popover"
        placement="bottom start"
        offset={6}
        data-one-dialog-owner={owner}
      >
        <ListBox
          className="one-select-options"
          items={options.map((option) => ({
            ...option,
            id: "v:" + option.value,
          }))}
        >
          {(option) => (
            <ListBoxItem
              id={option.id}
              textValue={option.label}
              className="one-select-option"
            >
              {({ isSelected }) => (
                <>
                  <span>{option.label}</span>
                  <Check
                    size={14}
                    aria-hidden="true"
                    className={isSelected ? "" : "unselected"}
                  />
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
        {multiple && (
          <div className="one-select-hint">
            Select all that apply · Escape to close
          </div>
        )}
      </Popover>
    </Select>
  );
}
