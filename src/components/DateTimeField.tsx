import { useContext, useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DatePickerStateContext,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
  TimeField,
} from "react-aria-components";
import type { DateValue } from "react-aria-components";
import {
  CalendarDateTime,
  parseDate,
  parseDateTime,
  Time,
} from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import "./date-time-field.css";

function parse(value: string, withTime: boolean): DateValue | null {
  if (!value) return null;
  try {
    return withTime ? parseDateTime(value) : parseDate(value);
  } catch {
    return null;
  }
}

/** Values stay as civil dates/times; the editor applies the workspace timezone on save. */
export function DateTimeField({
  label,
  value,
  onChange,
  withTime = false,
  required = false,
  disabled = false,
  min,
  today,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  today: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [owner, setOwner] = useState<string>();
  const [inputVersion, setInputVersion] = useState(0);
  useLayoutEffect(() => {
    setOwner(
      ref.current
        ?.closest("[data-one-dialog]")
        ?.getAttribute("data-one-dialog") || undefined,
    );
  }, []);
  const reference = parseDate(today);
  const placeholder = withTime
    ? new CalendarDateTime(reference.year, reference.month, reference.day, 0, 0)
    : reference;
  const minimum = min ? parse(min, withTime) || undefined : undefined;
  return (
    <I18nProvider locale="en-GB">
      <DatePicker
        ref={ref}
        className="one-date-field"
        data-date-label={label}
        data-date-required={required || undefined}
        value={parse(value, withTime)}
        onChange={(next) =>
          onChange(next ? next.toString().slice(0, withTime ? 16 : 10) : "")
        }
        granularity={withTime ? "minute" : "day"}
        hourCycle={24}
        shouldForceLeadingZeros
        placeholderValue={placeholder}
        minValue={minimum}
        isRequired={required}
        isDisabled={disabled}
        validationBehavior="aria"
        shouldCloseOnSelect={!withTime}
      >
        <Label className="one-date-label">{label}</Label>
        <Group className="one-date-group">
          <DateInput key={inputVersion} className="one-date-input">
            {(segment) => (
              <DateSegment className="one-date-segment" segment={segment} />
            )}
          </DateInput>
          <Button
            className="one-date-trigger"
            aria-label={`Choose ${label.toLowerCase()}`}
          >
            <CalendarDays size={16} strokeWidth={1.6} />
          </Button>
        </Group>
        <Popover
          className="one-date-popover"
          placement="bottom start"
          offset={8}
          data-one-date-owner={owner}
        >
          <Dialog className="one-date-dialog" aria-label={`${label} picker`}>
            <Calendar className="one-calendar" firstDayOfWeek="mon">
              <header className="one-calendar-heading">
                <Heading />
                <div>
                  <Button slot="previous" aria-label="Previous month">
                    <ChevronLeft size={16} />
                  </Button>
                  <Button slot="next" aria-label="Next month">
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </header>
              <CalendarGrid className="one-calendar-grid" weekdayStyle="short">
                <CalendarGridHeader>
                  {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell date={date} className="one-calendar-day" />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
            <PickerActions
              withTime={withTime}
              required={required}
              today={reference}
              min={minimum}
              label={label}
              onClear={() => {
                onChange("");
                // Reset partial segments even when the canonical value is already null.
                setInputVersion((version) => version + 1);
              }}
            />
          </Dialog>
        </Popover>
      </DatePicker>
    </I18nProvider>
  );
}

function PickerActions({
  withTime,
  required,
  today,
  label,
  min,
  onClear,
}: {
  withTime: boolean;
  required: boolean;
  today: DateValue;
  label: string;
  min?: DateValue;
  onClear: () => void;
}) {
  const state = useContext(DatePickerStateContext)!;
  const timeRef = useRef<HTMLDivElement>(null);
  const [timeError, setTimeError] = useState(false);
  function finish() {
    const missing =
      timeRef.current?.querySelector<HTMLElement>("[data-placeholder]");
    if (missing) {
      setTimeError(true);
      missing.focus();
      return;
    }
    state.close();
  }
  return (
    <>
      {withTime && (
        <TimeField
          ref={timeRef}
          className="one-picker-time"
          hourCycle={24}
          granularity="minute"
          shouldForceLeadingZeros
          value={state.timeValue}
          onChange={(time) => {
            if (time) {
              state.setTimeValue(time);
              setTimeError(false);
            }
          }}
          placeholderValue={new Time(0, 0)}
          validationBehavior="aria"
        >
          <Label className="one-picker-time-label">
            <Clock3 size={14} />
            Time <span>24-hour</span>
          </Label>
          <DateInput className="one-time-input" aria-label={`${label} time`}>
            {(segment) => (
              <DateSegment className="one-date-segment" segment={segment} />
            )}
          </DateInput>
        </TimeField>
      )}
      {timeError && (
        <p className="one-picker-error" role="alert">
          Complete the hour and minute.
        </p>
      )}
      <div className="one-picker-footer">
        <Button
          isDisabled={!!min && today.compare(min) < 0}
          onPress={() => state.setDateValue(today)}
        >
          Today
        </Button>
        {!required && (
          <Button
            onPress={() => {
              state.setValue(null);
              onClear();
              state.close();
            }}
          >
            Clear
          </Button>
        )}
        <Button className="one-picker-done" onPress={finish}>
          Done
        </Button>
      </div>
    </>
  );
}

/** Catch incomplete segment edits as well as required and out-of-range dates. */
export function invalidDateField(
  form: HTMLFormElement,
): { field: HTMLElement; message: string } | undefined {
  for (const field of form.querySelectorAll<HTMLElement>(".one-date-field")) {
    const segments = [
      ...field.querySelectorAll<HTMLElement>(
        '.one-date-input [data-type]:not([data-type="literal"])',
      ),
    ];
    const placeholders = segments.filter((segment) =>
      segment.hasAttribute("data-placeholder"),
    );
    const incomplete =
      placeholders.length > 0 &&
      (placeholders.length < segments.length ||
        field.hasAttribute("data-date-required"));
    if (
      incomplete ||
      field.hasAttribute("data-invalid") ||
      field.querySelector(".one-date-input[data-invalid]")
    ) {
      return {
        field,
        message: `Choose a complete, valid date${segments.some((s) => s.dataset.type === "hour") ? " and time" : ""} for “${field.dataset.dateLabel}”.`,
      };
    }
  }
}
