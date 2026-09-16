export interface HardwarePart {
  id: string;
  /** Marker position as percentages of the diagram box. */
  x: number;
  y: number;
  name: string;
  whatItIs: string;
  whatItDoes: string;
  gaylNote: string;
}

export interface HardwareComponent {
  id: string;
  name: string;
  tagline: string;
  parts: HardwarePart[];
}

export const hardwareComponents: HardwareComponent[] = [
  {
    id: "motherboard",
    name: "Motherboard",
    tagline: "The main circuit board every other part plugs into.",
    parts: [
      {
        id: "cpu-socket",
        x: 30,
        y: 34,
        name: "CPU socket",
        whatItIs:
          "The square seat in the middle-left of the board where the processor (CPU) is installed. A lever or bracket locks the chip in place.",
        whatItDoes:
          "It connects the processor's hundreds of tiny contacts to the rest of the board so the CPU can talk to memory, storage and everything else.",
        gaylNote:
          "Sockets come in specific types, like AM5 or LGA1700. A CPU only fits the socket it was designed for, which is a classic exam question.",
      },
      {
        id: "ram-slots",
        x: 52,
        y: 22,
        name: "RAM slots (DIMM)",
        whatItIs:
          "The long thin slots beside the CPU socket. Memory sticks (RAM) click into these with small latches at each end.",
        whatItDoes:
          "They hold the system's short-term memory. Whatever programs are running right now live here because RAM is far faster than storage.",
        gaylNote:
          "Most boards run RAM fastest in matched pairs. The manual tells you which two slots to fill first, usually the second and fourth.",
      },
      {
        id: "pcie-slots",
        x: 38,
        y: 66,
        name: "PCIe expansion slots",
        whatItIs:
          "The horizontal slots lower on the board. The longest one (x16) is for the graphics card, the shorter ones for extras like network or sound cards.",
        whatItDoes:
          "They give add-in cards a high-speed connection to the CPU and memory. PCIe generations (3.0, 4.0, 5.0) double the speed each step.",
        gaylNote:
          "A GPU goes in the top x16 slot because it is wired with the most lanes straight to the CPU. That is why it sits closest to the processor.",
      },
      {
        id: "chipset",
        x: 62,
        y: 55,
        name: "Chipset (under heatsink)",
        whatItIs:
          "A flat metal-covered square below the CPU socket. Under that cover sits the chipset, the board's traffic controller.",
        whatItDoes:
          "It manages the slower connections the CPU doesn't handle directly: USB ports, SATA drives, audio and networking.",
        gaylNote:
          "On modern boards the chipset decides which features you get, like how many USB ports and whether overclocking is allowed.",
      },
      {
        id: "cmos-battery",
        x: 55,
        y: 78,
        name: "CMOS battery",
        whatItIs:
          "A small silver coin-cell battery, the same kind used in watches, clipped into a round holder on the board.",
        whatItDoes:
          "It keeps the real-time clock running and holds BIOS/UEFI settings when the computer is unplugged.",
        gaylNote:
          "If a PC keeps forgetting the time or its BIOS settings, this battery is the first suspect. Pulling it for a minute also resets BIOS to defaults.",
      },
      {
        id: "sata-ports",
        x: 82,
        y: 62,
        name: "SATA ports",
        whatItIs:
          "The small L-shaped connectors along the right edge, usually grouped in pairs or fours.",
        whatItDoes:
          "They connect 2.5-inch and 3.5-inch drives (SSDs and hard drives) using a SATA data cable. Each drive also needs power from the PSU.",
        gaylNote:
          "SATA tops out around 550 MB/s. That is fine for older drives, but NVMe drives on M.2 slots are many times faster.",
      },
      {
        id: "m2-slot",
        x: 47,
        y: 55,
        name: "M.2 slot",
        whatItIs:
          "A small horizontal slot, often hidden under a flat metal heatspreader, between the CPU and the PCIe slots.",
        whatItDoes:
          "It holds NVMe solid-state drives, which are small sticks of storage that plug straight into the board with no cables.",
        gaylNote:
          "Because NVMe drives connect over PCIe lanes instead of SATA, they can reach several gigabytes per second. The metal cover keeps them cool.",
      },
      {
        id: "atx-power",
        x: 92,
        y: 30,
        name: "24-pin ATX power",
        whatItIs:
          "The tall white block on the right edge of the board, the largest power connector in the case.",
        whatItDoes:
          "It is the main power feed from the power supply to the motherboard, delivering 3.3V, 5V and 12V lines.",
        gaylNote:
          "When a PC is completely dead with no lights at all, checking this connector is seated is step one in troubleshooting.",
      },
      {
        id: "cpu-power",
        x: 16,
        y: 8,
        name: "CPU power (EPS)",
        whatItIs:
          "A 4-pin or 8-pin connector at the top-left corner of the board, close to the CPU socket.",
        whatItDoes:
          "It feeds dedicated 12V power straight to the processor, which needs far more current than the main connector alone can deliver.",
        gaylNote:
          "A classic build mistake: the board lights up but won't boot because this second cable was forgotten. Worth memorizing.",
      },
      {
        id: "rear-io",
        x: 4,
        y: 34,
        name: "Rear I/O panel",
        whatItIs:
          "The row of ports on the left edge that poke out the back of the case: USB, Ethernet, audio jacks, and often video outputs.",
        whatItDoes:
          "This is how you plug in keyboards, mice, monitors, network cables and speakers without opening the case.",
        gaylNote:
          "The video ports here only work if the CPU has built-in graphics. With a dedicated graphics card, the monitor plugs into the card instead.",
      },
    ],
  },
  {
    id: "ram",
    name: "Memory (RAM)",
    tagline: "Fast short-term memory the CPU works from.",
    parts: [
      {
        id: "dram-chips",
        x: 50,
        y: 42,
        name: "Memory chips",
        whatItIs:
          "The black squares lined up on the stick. Each one is a DRAM chip that stores data while the power is on.",
        whatItDoes:
          "They hold whatever the computer is actively working on: open programs, loaded files, the operating system's running parts. More chips and denser chips mean more capacity.",
        gaylNote:
          "RAM is volatile, meaning everything in it vanishes when the power cuts. That is why unsaved work is lost in a crash.",
      },
      {
        id: "heat-spreader",
        x: 50,
        y: 32,
        name: "Heat spreader",
        whatItIs:
          "The metal shell covering the stick, usually aluminum. Plain sticks skip it, but gaming and high-speed RAM almost always has one.",
        whatItDoes:
          "It pulls heat off the memory chips and spreads it out so the stick can run at high speeds without overheating.",
        gaylNote:
          "Under the spreader it is just a green or black circuit board with chips, exactly like the plain sticks.",
      },
      {
        id: "gold-contacts",
        x: 60,
        y: 74,
        name: "Gold contact edge",
        whatItIs:
          "The row of gold-colored fingers along the bottom edge that slides into the motherboard slot.",
        whatItDoes:
          "Each finger is one electrical connection carrying data, address signals and power between the stick and the board.",
        gaylNote:
          "Gold is used because it does not corrode. If a stick isn't detected, reseating it or gently cleaning these contacts often fixes it.",
      },
      {
        id: "notch",
        x: 34,
        y: 76,
        name: "Alignment notch",
        whatItIs:
          "A gap cut into the contact edge, off-center on purpose.",
        whatItDoes:
          "It lines up with a key in the slot so the stick can only be inserted one way, and only the right generation of RAM fits.",
        gaylNote:
          "The notch position differs between DDR3, DDR4 and DDR5. That is why you cannot physically mix generations, a favorite exam trap.",
      },
      {
        id: "spd-chip",
        x: 88,
        y: 42,
        name: "SPD chip",
        whatItIs:
          "A tiny separate chip, usually near one end of the stick.",
        whatItDoes:
          "It stores the stick's identity: capacity, speed, timings and voltage. The BIOS reads it at boot to configure memory correctly.",
        gaylNote:
          "When you turn on XMP or EXPO in the BIOS, you are telling the board to use the faster profile stored on this chip.",
      },
    ],
  },
  {
    id: "gpu",
    name: "Graphics card (GPU)",
    tagline: "A dedicated processor for drawing everything on screen.",
    parts: [
      {
        id: "gpu-fans",
        x: 42,
        y: 40,
        name: "Cooling fans",
        whatItIs:
          "The two or three large fans on the face of the card, sitting on top of a metal heatsink.",
        whatItDoes:
          "They push air across the heatsink fins to carry heat away from the graphics chip, which can draw more power than the CPU under load.",
        gaylNote:
          "Many cards stop their fans completely at idle and only spin them up in games. Silent fans on the desktop are normal, not broken.",
      },
      {
        id: "gpu-die",
        x: 38,
        y: 55,
        name: "Graphics chip (under cooler)",
        whatItIs:
          "The actual processor of the card, hidden under the heatsink between the fans. It contains thousands of small processing cores.",
        whatItDoes:
          "It renders images, video and 3D scenes, and its parallel cores also accelerate things like video editing and AI workloads.",
        gaylNote:
          "A GPU is a specialist: terrible at general tasks, unmatched at doing thousands of simple calculations at the same time.",
      },
      {
        id: "vram",
        x: 62,
        y: 55,
        name: "Video memory (VRAM)",
        whatItIs:
          "The memory chips soldered around the graphics chip, under the same cooler.",
        whatItDoes:
          "They store textures, frame buffers and other data the GPU needs instantly, the same way RAM serves the CPU.",
        gaylNote:
          "Running out of VRAM forces the card to borrow slow system RAM, which shows up as stuttering. That is why VRAM size matters for high settings.",
      },
      {
        id: "pcie-connector",
        x: 45,
        y: 71,
        name: "PCIe connector",
        whatItIs:
          "The long gold edge at the bottom of the card that slots into the motherboard's x16 PCIe slot.",
        whatItDoes:
          "It carries data between the card and the CPU, and also delivers up to 75 watts of power.",
        gaylNote:
          "The small retention clip at the end of the slot must be pressed to release the card. Forgetting it is a common way to damage a board.",
      },
      {
        id: "gpu-power",
        x: 79,
        y: 20,
        name: "Power connectors",
        whatItIs:
          "One or two 6-pin or 8-pin sockets along the top edge of the card.",
        whatItDoes:
          "They pull extra power straight from the power supply, on top of what the slot provides. Bigger cards need more plugs.",
        gaylNote:
          "These are PCIe power cables, not the CPU EPS cable. They look similar but are wired differently and are not interchangeable.",
      },
      {
        id: "display-outputs",
        x: 8,
        y: 55,
        name: "Display outputs",
        whatItIs:
          "The HDMI and DisplayPort sockets on the metal bracket at the end of the card.",
        whatItDoes:
          "They send the finished image to your monitor. DisplayPort usually supports the highest refresh rates.",
        gaylNote:
          "With a graphics card installed, plug the monitor here, not into the motherboard, or you'll bypass the card entirely.",
      },
    ],
  },
  {
    id: "nvme",
    name: "NVMe SSD (M.2)",
    tagline: "Modern storage on a stick, no cables needed.",
    parts: [
      {
        id: "nand",
        x: 62,
        y: 45,
        name: "NAND flash chips",
        whatItIs:
          "The larger black chips on the stick. This is where your data actually lives.",
        whatItDoes:
          "They store data with no moving parts and, unlike RAM, keep everything when the power is off. Files, programs and the operating system all sit here.",
        gaylNote:
          "Flash cells wear out slowly with writes. Drives track this and spread writes evenly, a technique called wear leveling.",
      },
      {
        id: "controller",
        x: 28,
        y: 45,
        name: "Controller chip",
        whatItIs:
          "The smaller chip near the connector end of the stick. It is the drive's own little processor.",
        whatItDoes:
          "It manages where data is written, handles error correction, wear leveling and encryption, and talks to the computer over PCIe lanes.",
        gaylNote:
          "Two SSDs with the same memory chips can perform very differently because the controller makes that much difference.",
      },
      {
        id: "dram-cache",
        x: 45,
        y: 45,
        name: "DRAM cache",
        whatItIs:
          "A small memory chip found on faster drives, sitting between the controller and the NAND chips.",
        whatItDoes:
          "It holds the drive's map of where every file is stored, so lookups happen at memory speed instead of searching the flash.",
        gaylNote:
          "Budget drives skip this chip and borrow system RAM instead. Fine for everyday use, slower under heavy sustained writes.",
      },
      {
        id: "m2-connector",
        x: 8,
        y: 55,
        name: "M.2 connector",
        whatItIs:
          "The gold-fingered edge that plugs straight into the M.2 slot on the motherboard.",
        whatItDoes:
          "It carries PCIe data lanes and power in one connector, which is why NVMe drives need no cables at all.",
        gaylNote:
          "M.2 is just the shape of the slot. Some M.2 drives still speak slow SATA, so check for NVMe on the label when buying.",
      },
      {
        id: "screw-notch",
        x: 94,
        y: 45,
        name: "Mounting notch",
        whatItIs:
          "The half-circle cutout at the far end of the stick.",
        whatItDoes:
          "A tiny screw or plastic latch on the motherboard holds the drive flat against the board through this notch.",
        gaylNote:
          "The screw is easy to lose and often ships screwed into the board already. Check the board before hunting the box for it.",
      },
    ],
  },
];
