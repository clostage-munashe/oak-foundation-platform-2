'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = { value: string; label: string; disabled?: boolean };

/** Shared styled select; the native control retains FormData and required validation. */
export function Dropdown({
  onValueChange,
  name,
  label,
  options,
  defaultValue = '',
  required = false,
}: {
  onValueChange?: (value: string) => void;
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string;
  required?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(
    Math.max(
      0,
      options.findIndex((o) => o.value === defaultValue),
    ),
  );
  const [invalid, setInvalid] = useState(false);
  const search = useRef({ text: '', time: 0 });

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => {
    if (open)
      document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  function choose(index: number) {
    if (options[index]?.disabled) return;
    setValue(options[index].value);
    onValueChange?.(options[index].value);
    setInvalid(false);
    setOpen(false);
    trigger.current?.focus();
  }

  function move(direction: number) {
    let next = active;
    for (let i = 0; i < options.length; i++) {
      next = (next + direction + options.length) % options.length;
      if (!options[next].disabled) {
        setActive(next);
        return;
      }
    }
  }

  return (
    <div
      ref={root}
      className="dropdown"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <select
        className="dropdown-native"
        name={name}
        value={value}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          setValue(event.target.value);
          setInvalid(false);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          trigger.current?.focus();
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        className="dropdown-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => {
          setActive(
            Math.max(
              0,
              options.findIndex((o) => o.value === value),
            ),
          );
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (event.key === 'Tab') setOpen(false);
          else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              setActive(
                Math.max(
                  0,
                  options.findIndex((o) => o.value === value),
                ),
              );
            } else move(event.key === 'ArrowDown' ? 1 : -1);
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            setOpen(true);
            const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
            setActive(event.key === 'Home' ? enabled[0] : enabled[enabled.length - 1]);
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (open) choose(active);
            else setOpen(true);
          } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            const now = Date.now();
            search.current = {
              text: now - search.current.time < 600 ? search.current.text + event.key : event.key,
              time: now,
            };
            const index = options.findIndex(
              (o) =>
                !o.disabled && o.label.toLowerCase().startsWith(search.current.text.toLowerCase()),
            );
            if (index >= 0) {
              setActive(index);
              setOpen(true);
            }
          }
        }}
      >
        <span>{options.find((option) => option.value === value)?.label}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div id={`${id}-list`} role="listbox" aria-label={label} className="dropdown-menu">
          {options.map((option, index) => (
            <div
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              key={option.value}
              className={`dropdown-option ${active === index ? 'highlighted' : ''}`}
              onPointerMove={() => {
                if (!option.disabled) setActive(index);
              }}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
      {invalid && (
        <p id={`${id}-error`} className="dropdown-error" role="alert">
          Please select {label.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
