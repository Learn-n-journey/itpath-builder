/**
 * Hand-drawn schematic SVG diagrams for the Hardware Explorer.
 * Coordinates use a 400 x 300 viewBox; hotspot markers are overlaid
 * by the page using percentage positions from hardware-explorer data.
 */

const board = "fill-muted/40 stroke-border";
const part = "fill-muted/70 stroke-border";
const accent = "fill-primary/15 stroke-primary/60";
const gold = "fill-amber-400/50 stroke-amber-500/60";
const trace = "stroke-border/70";

export function MotherboardDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Schematic of a motherboard">
      {/* PCB */}
      <rect x="8" y="8" width="384" height="284" rx="6" className={board} strokeWidth="1.5" />
      {/* decorative traces */}
      <g className={trace} strokeWidth="1" fill="none">
        <path d="M120 60 H180 M120 70 H165 M120 80 H190" />
        <path d="M70 200 V260 M82 200 V240 M94 200 V268" />
        <path d="M250 180 H330 M250 192 H310 M250 204 H340" />
      </g>
      {/* rear I/O */}
      <g>
        <rect x="10" y="70" width="14" height="120" rx="2" className={part} />
        <rect x="12" y="78" width="10" height="16" className="fill-background stroke-border" />
        <rect x="12" y="100" width="10" height="10" className="fill-background stroke-border" />
        <rect x="12" y="116" width="10" height="10" className="fill-background stroke-border" />
        <rect x="12" y="132" width="10" height="20" className="fill-background stroke-border" />
        <rect x="12" y="158" width="10" height="24" className="fill-background stroke-border" />
      </g>
      {/* CPU power */}
      <rect x="48" y="14" width="34" height="14" className={part} />
      {/* CPU socket */}
      <g>
        <rect x="88" y="60" width="72" height="72" rx="3" className={accent} strokeWidth="1.5" />
        <rect x="100" y="72" width="48" height="48" className="fill-background/60 stroke-border" />
        <rect x="160" y="66" width="4" height="60" className="fill-border" />
      </g>
      {/* RAM slots */}
      <g>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={196 + i * 14} y="26" width="8" height="110" rx="1" className={part} />
        ))}
      </g>
      {/* 24-pin ATX power */}
      <rect x="356" y="60" width="26" height="60" className={part} />
      {/* M.2 slot */}
      <rect x="96" y="152" width="90" height="8" rx="1" className={accent} />
      {/* PCIe slots */}
      <g>
        <rect x="60" y="176" width="220" height="10" rx="1" className={accent} strokeWidth="1.5" />
        <rect x="60" y="200" width="120" height="8" rx="1" className={part} />
        <rect x="60" y="220" width="220" height="10" rx="1" className={part} />
      </g>
      {/* chipset heatsink */}
      <rect x="230" y="140" width="44" height="44" rx="3" className={part} strokeWidth="1.5" />
      <path d="M238 148 H266 M238 156 H266 M238 164 H266 M238 172 H266" className={trace} strokeWidth="1.5" />
      {/* CMOS battery */}
      <circle cx="222" cy="238" r="12" className="fill-muted stroke-border" strokeWidth="1.5" />
      <circle cx="222" cy="238" r="8" className="fill-background/50 stroke-border" />
      {/* SATA ports */}
      <g>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="316" y={150 + i * 18} width="22" height="12" rx="1" className={part} />
        ))}
      </g>
      {/* front panel header */}
      <rect x="300" y="272" width="70" height="10" className={part} />
    </svg>
  );
}

export function RamDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Schematic of a RAM stick">
      {/* heat spreader body */}
      <rect x="20" y="90" width="360" height="120" rx="6" className={board} strokeWidth="1.5" />
      <rect x="20" y="90" width="360" height="34" rx="6" className={accent} />
      {/* ridge lines */}
      <g className={trace} strokeWidth="1.5">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={i} x1={50 + i * 42} y1="96" x2={50 + i * 42} y2="118" />
        ))}
      </g>
      {/* chips hinted under spreader */}
      <g className="fill-muted/60 stroke-border">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={44 + i * 40} y="140" width="30" height="24" rx="2" />
        ))}
      </g>
      {/* SPD chip */}
      <rect x="352" y="140" width="16" height="14" rx="1" className={accent} strokeWidth="1.5" />
      {/* gold contacts with notch */}
      <g className={gold}>
        {[...Array(20)].map((_, i) => {
          const x = 26 + i * 12;
          if (x > 124 && x < 148) return null;
          return <rect key={i} x={x} y="210" width="8" height="26" />;
        })}
        {[...Array(20)].map((_, i) => {
          const x = 148 + i * 12;
          return <rect key={`b${i}`} x={x} y="210" width="8" height="26" />;
        })}
      </g>
    </svg>
  );
}

export function GpuDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Schematic of a graphics card">
      {/* display bracket */}
      <rect x="8" y="70" width="16" height="150" rx="2" className={part} />
      <rect x="10" y="86" width="12" height="22" className="fill-background stroke-border" />
      <rect x="10" y="118" width="12" height="22" className="fill-background stroke-border" />
      <rect x="10" y="150" width="12" height="22" className="fill-background stroke-border" />
      {/* shroud */}
      <rect x="24" y="70" width="330" height="130" rx="8" className={board} strokeWidth="1.5" />
      {/* fans */}
      {[100, 240].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="132" r="46" className={accent} strokeWidth="1.5" />
          <circle cx={cx} cy="132" r="12" className={part} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <path
              key={deg}
              d={`M ${cx} 132 q 18 -8 30 -30`}
              className="stroke-border"
              strokeWidth="4"
              fill="none"
              transform={`rotate(${deg} ${cx} 132)`}
            />
          ))}
        </g>
      ))}
      {/* power connectors */}
      <rect x="286" y="52" width="30" height="16" className={part} />
      <rect x="322" y="52" width="30" height="16" className={part} />
      {/* VRAM hint under cooler */}
      <g className="fill-muted/50 stroke-border">
        <rect x="150" y="176" width="16" height="10" />
        <rect x="172" y="176" width="16" height="10" />
        <rect x="194" y="176" width="16" height="10" />
      </g>
      {/* PCIe connector */}
      <g className={gold}>
        <rect x="60" y="200" width="60" height="18" />
        <rect x="132" y="200" width="160" height="18" />
      </g>
      {/* backplate hint */}
      <rect x="24" y="228" width="330" height="10" rx="3" className={part} />
    </svg>
  );
}

export function NvmeDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Schematic of an NVMe M.2 SSD">
      {/* PCB */}
      <path
        d="M40 110 H360 a10 10 0 0 1 10 10 v60 a10 10 0 0 1 -10 10 H40 Z M370 145 a12 12 0 1 0 0.1 0"
        className={board}
        strokeWidth="1.5"
      />
      {/* controller */}
      <rect x="92" y="128" width="40" height="40" rx="3" className={accent} strokeWidth="1.5" />
      {/* DRAM cache */}
      <rect x="150" y="132" width="30" height="32" rx="2" className={part} />
      {/* NAND chips */}
      {[0, 1].map((i) => (
        <rect key={i} x={200 + i * 62} y="126" width="52" height="44" rx="3" className={part} strokeWidth="1.5" />
      ))}
      {/* label */}
      <rect x="200" y="126" width="52" height="16" className="fill-background/60" />
      {/* gold connector fingers */}
      <g className={gold}>
        {[...Array(6)].map((_, i) => (
          <rect key={i} x={44 + i * 8} y="118" width="5" height="24" />
        ))}
        {[...Array(4)].map((_, i) => (
          <rect key={`g${i}`} x={44 + i * 8} y="158" width="5" height="22" />
        ))}
      </g>
      {/* screw notch */}
      <circle cx="368" cy="145" r="9" className="fill-background stroke-border" strokeWidth="1.5" />
    </svg>
  );
}

export const hardwareDiagrams: Record<string, () => React.ReactElement> = {
  motherboard: MotherboardDiagram,
  ram: RamDiagram,
  gpu: GpuDiagram,
  nvme: NvmeDiagram,
};
