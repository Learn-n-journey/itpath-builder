import { cn } from "@/lib/utils";
import { domain } from "@/domain/active";

export function PathLogo({ className }: { className?: string }) {
  const auto = domain.id === "auto-repair";
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] border bg-[#06111d] shadow-sm", auto ? "border-path-auto/80 shadow-path-auto/20" : "border-white/10 shadow-path-it/20", className)} aria-hidden>
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
        <svg viewBox="0 0 64 64" className="h-full w-full p-[5%]" fill="none">
          <defs>
            <linearGradient id="ribbonA" x1="10" y1="8" x2="52" y2="53" gradientUnits="userSpaceOnUse"><stop stopColor="#00C8FF"/><stop offset=".42" stopColor="#2787FF"/><stop offset=".72" stopColor="#9A45FF"/><stop offset="1" stopColor="#FF4565"/></linearGradient>
            <linearGradient id="ribbonB" x1="13" y1="54" x2="50" y2="16" gradientUnits="userSpaceOnUse"><stop stopColor="#168BFF"/><stop offset=".5" stopColor="#704DFF"/><stop offset="1" stopColor="#FF3F6C"/></linearGradient>
          </defs>
          <path d="M12 53V31L35 17 27 12 12 22V11L27 2 52 17 28 32 36 38 52 28V40L36 51 24 43V58L12 53Z" fill="url(#ribbonA)"/>
          <path d="M12 31 28 22 36 27 28 32 36 38 52 28V40L36 51 24 43V58L12 53V31Z" fill="url(#ribbonB)" fillOpacity=".92"/>
          <path d="m12 22 15-10 8 5-23 14V22Z" fill="#26B9FF" fillOpacity=".88"/>
          <path d="m36 27 16-10v11L36 38l-8-6 8-5Z" fill="#FF4565" fillOpacity=".86"/>
        </svg>
      )}
    </span>
  );
}
