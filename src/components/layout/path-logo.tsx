import { cn } from "@/lib/utils";

export function PathLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] border border-white/10 bg-[#06111d] shadow-sm shadow-path-it/20",
        className,
      )}
      aria-hidden
    >
      <img
        src="/ChatGPT%20Image%20Sep%2027%2C%202026%2C%2010_52_55%20PM.png"
        alt=""
        className="h-full w-full object-contain"
      />
    </span>
  );
}
