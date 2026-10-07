"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon } from "@/components/icons";
import {
  ETHIOPIAN_MONTHS,
  type EthiopianDate,
  formatEthiopianDate,
  gregorianToEthiopian,
  isEthiopianLeapYear,
  isValidEthiopianDate,
  parseEthiopianDateString,
  ethiopianToGregorian,
} from "@/lib/ethiopian-calendar";

function daysInMonth(year: number, month: number): number {
  if (month < 13) return 30;
  return isEthiopianLeapYear(year) ? 6 : 5;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function EthiopianDatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const todayEC = gregorianToEthiopian(new Date());
  const parsed = parseEthiopianDateString(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.year ?? todayEC.year);
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? todayEC.month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectDay(day: number) {
    const ed: EthiopianDate = { year: viewYear, month: viewMonth, day };
    if (!isValidEthiopianDate(ed)) return;
    onChange(formatEthiopianDate(ed));
    setOpen(false);
  }

  function navigateMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 13;
      y -= 1;
    } else if (m > 13) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  // Weekday of the 1st, via Gregorian conversion
  const firstWeekday = ethiopianToGregorian({ year: viewYear, month: viewMonth, day: 1 }).getUTCDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const selected = parsed;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-l-md border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            const p = parseEthiopianDateString(value);
            setViewYear(p?.year ?? todayEC.year);
            setViewMonth(p?.month ?? todayEC.month);
            setOpen((o) => !o);
          }}
          className="rounded-r-md border border-l-0 px-3 text-sm hover:bg-gray-50"
          aria-label="Open Ethiopian calendar"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded-lg border bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigateMonth(-1)} className="rounded px-2 py-1 hover:bg-gray-100">
              ‹
            </button>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <span>{ETHIOPIAN_MONTHS[viewMonth - 1]}</span>
              <div className="flex items-center">
                <button type="button" onClick={() => setViewYear((y) => y - 1)} className="rounded px-1 hover:bg-gray-100">
                  −
                </button>
                <span className="px-1">{viewYear}</span>
                <button type="button" onClick={() => setViewYear((y) => y + 1)} className="rounded px-1 hover:bg-gray-100">
                  +
                </button>
              </div>
            </div>
            <button type="button" onClick={() => navigateMonth(1)} className="rounded px-2 py-1 hover:bg-gray-100">
              ›
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isSelected =
                selected?.day === day && selected?.month === viewMonth && selected?.year === viewYear;
              const isToday =
                todayEC.day === day && todayEC.month === viewMonth && todayEC.year === viewYear;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`rounded py-1 text-sm ${
                    isSelected
                      ? "bg-amber-600 font-semibold text-white"
                      : isToday
                        ? "border border-amber-400 text-amber-700"
                        : "hover:bg-amber-50"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(formatEthiopianDate(todayEC));
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            Today ({formatEthiopianDate(todayEC)})
          </button>
        </div>
      )}
    </div>
  );
}
