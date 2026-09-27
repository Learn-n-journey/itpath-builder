import { cn } from "@/lib/utils";
import { domain } from "@/domain/active";

export function PathLogo({ className }: { className?: string }) {
  const auto = domain.id === "auto-repair";
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] border bg-[#06111d] shadow-sm",
        auto ? "border-path-auto/80 shadow-path-auto/20" : "border-path-it/80 shadow-path-it/20",
        className,
      )}
      aria-hidden
    >
      {auto ? (
        <svg viewBox="0 0 64 64" className="h-full w-full p-[9%]" fill="none">
          <path d="M12 38 17 25c1.2-3 3.8-5 7-5h16c3.2 0 5.8 2 7 5l5 13" stroke="currentColor" strokeWidth="3.2" className="text-path-auto"/>
          <path d="M14 37h36c3 0 5 2.2 5 5v8H9v-8c0-2.8 2-5 5-5Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="3" className="text-path-auto"/>
          <path d="M19 30h26l-3-6H22l-3 6Z" fill="currentColor" fillOpacity=".22" className="text-path-auto"/>
          <path d="M14 42h10l-2 5h-8m36-5H40l2 5h8" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" className="text-path-auto"/>
          <path d="M26 44h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-path-auto"/>
          <circle cx="17" cy="50" r="3" fill="currentColor" className="text-path-auto"/><circle cx="47" cy="50" r="3" fill="currentColor" className="text-path-auto"/>
        </svg>
      ) : (
        <svg viewBox="0 0 64 64" className="h-full w-full p-[9%]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <g className="text-path-it">
            <path d="M32 52V14M24 52V32l-9-9M40 52V32l9-9M28 35l-8-8v-9M36 35l8-8v-9"/>
            <circle cx="32" cy="10" r="4"/><circle cx="15" cy="19" r="4"/><circle cx="49" cy="19" r="4"/><circle cx="20" cy="14" r="3"/><circle cx="44" cy="14" r="3"/>
          </g>
        </svg>
      )}
    </span>
  );
}
