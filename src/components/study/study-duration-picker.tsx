import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SPACER_HEIGHT = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

export interface StudyDurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function StudyDurationPicker({
  value,
  onChange,
  min = 15,
  max = 120,
  step = 5,
  className,
}: StudyDurationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | undefined>(undefined);
  const dragRef = useRef<{ startY: number; startScrollTop: number; pointerId: number } | null>(null);
  const values = useMemo(() => {
    const result: number[] = [];
    for (let minutes = min; minutes <= max; minutes += step) result.push(minutes);
    return result;
  }, [min, max, step]);

  const selectedIndex = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const targetTop = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(container.scrollTop - targetTop) > 1) {
      container.scrollTo({ top: targetTop, behavior: "smooth" });
    }
  }, [selectedIndex]);

  useEffect(() => () => {
    if (scrollTimerRef.current !== undefined) window.clearTimeout(scrollTimerRef.current);
  }, []);

  function selectIndex(index: number, behavior: ScrollBehavior = "smooth") {
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    const next = values[clamped];
    if (next !== undefined && next !== value) onChange(next);
    containerRef.current?.scrollTo({ top: clamped * ITEM_HEIGHT, behavior });
  }

  function handleScroll() {
    if (scrollTimerRef.current !== undefined) window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => {
      const index = Math.round((containerRef.current?.scrollTop ?? 0) / ITEM_HEIGHT);
      selectIndex(index);
    }, 90);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    dragRef.current = { startY: event.clientY, startScrollTop: container.scrollTop, pointerId: event.pointerId };
    container.setPointerCapture(event.pointerId);
    container.style.cursor = "grabbing";
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || !container || drag.pointerId !== event.pointerId) return;
    container.scrollTop = drag.startScrollTop - (event.clientY - drag.startY);
  }

  function finishPointerDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || !container || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    container.style.cursor = "";
    const index = Math.round(container.scrollTop / ITEM_HEIGHT);
    selectIndex(index);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let index = selectedIndex;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") index -= 1;
    else if (event.key === "ArrowDown" || event.key === "ArrowRight") index += 1;
    else if (event.key === "PageUp") index -= Math.max(1, Math.round(15 / step));
    else if (event.key === "PageDown") index += Math.max(1, Math.round(15 / step));
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = values.length - 1;
    else return;
    event.preventDefault();
    selectIndex(index);
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border/70 bg-background/35 shadow-inner", className)}>
      <div
        className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-[52px] -translate-y-1/2 rounded-xl border border-primary/50 bg-primary/15 shadow-[inset_0_1px_0_color-mix(in_oklab,white_10%,transparent)]"
        aria-hidden
      />
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Study session duration in minutes"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} minutes`}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onKeyDown={handleKeyDown}
        className="relative z-20 cursor-grab snap-y snap-mandatory overflow-y-auto scroll-smooth overscroll-contain select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height: PICKER_HEIGHT, touchAction: "pan-y" }}
      >
        <div aria-hidden style={{ height: SPACER_HEIGHT }} />
        {values.map((minutes, index) => {
          const distance = Math.abs(index - selectedIndex);
          return (
            <button
              key={minutes}
              type="button"
              className={cn(
                "flex w-full snap-center items-center justify-center tabular-nums transition-all",
                distance === 0
                  ? "text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                  : distance === 1
                    ? "text-xl font-medium text-muted-foreground opacity-55"
                    : "text-lg text-muted-foreground opacity-20",
              )}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => selectIndex(index)}
              aria-label={`${minutes} minutes`}
              tabIndex={-1}
            >
              {minutes} min
            </button>
          );
        })}
        <div aria-hidden style={{ height: SPACER_HEIGHT }} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-12 bg-gradient-to-b from-card/80 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-12 bg-gradient-to-t from-card/80 to-transparent" aria-hidden />
    </div>
  );
}
