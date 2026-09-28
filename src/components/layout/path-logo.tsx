import { cn } from "@/lib/utils";
import { domain } from "@/domain/active";

export function PathLogo({ className }: { className?: string }) {
  const auto = domain.id === "auto-repair";
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] border bg-[#06111d] shadow-sm",
        auto ? "border-path-auto/80 shadow-path-auto/20" : "border-white/10 shadow-path-it/20",
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
        <svg viewBox="0 0 64 64" className="h-full w-full p-[8%]" fill="none">
          <defs>
            <linearGradient id="itPathBrandGradient" x1="9" y1="52" x2="55" y2="12" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#00c8ff"/>
              <stop offset=".38" stopColor="#2787ff"/>
              <stop offset=".68" stopColor="#9a45ff"/>
              <stop offset="1" stopColor="#ff4565"/>
            </linearGradient>
          </defs>
          <path d="M14 49 31 39 22 32 39 22 31 15 48 7" stroke="url(#itPathBrandGradient)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 49 31 39 22 32 39 22 31 15 48 7" stroke="white" strokeOpacity=".16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}
