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
        x: 46,
        y: 30,
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
        x: 68,
        y: 29,
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
        x: 37,
        y: 63,
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
        x: 66,
        y: 73,
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
        x: 65,
        y: 89,
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
        y: 61,
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
        x: 44,
        y: 54,
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
        x: 82,
        y: 32,
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
        x: 25,
        y: 6,
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
        x: 14,
        y: 29,
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
        x: 40,
        y: 61,
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
        x: 45,
        y: 30,
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
        x: 20,
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
        x: 49,
        y: 74,
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
        x: 89,
        y: 61,
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
        x: 33,
        y: 44,
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
        x: 50,
        y: 60,
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
        x: 66,
        y: 60,
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
        x: 41,
        y: 79,
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
        x: 84,
        y: 14,
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
        x: 10,
        y: 49,
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
        y: 48,
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
        x: 22,
        y: 48,
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
        x: 42,
        y: 48,
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
        x: 6,
        y: 48,
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
        x: 95,
        y: 52,
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
  {
    id: "psu",
    name: "Power supply (PSU)",
    tagline: "Converts wall power into the voltages every part needs.",
    parts: [
      {
        id: "psu-fan",
        x: 38,
        y: 32,
        name: "Intake fan",
        whatItIs:
          "The large fan behind the circular grille on the face of the unit.",
        whatItDoes:
          "It pulls air through the power supply to cool the components inside, which get hot while converting power.",
        gaylNote:
          "The fan usually faces down toward a vent in the case, or up into the case if there is no vent. Face-down with a dust filter is the cleaner setup.",
      },
      {
        id: "psu-label",
        x: 55,
        y: 62,
        name: "Rating label",
        whatItIs:
          "The specification sticker on the side of the unit. It lists the wattage and how much current each voltage rail can supply.",
        whatItDoes:
          "It tells you the unit's capacity, like 750W, and its efficiency rating. You match this against what your parts draw.",
        gaylNote:
          "The 80 Plus badge (Bronze, Gold, Platinum) is about efficiency, not quality by itself. Higher ratings waste less power as heat.",
      },
      {
        id: "psu-socket",
        x: 24,
        y: 75,
        name: "Power socket and switch",
        whatItIs:
          "The kettle-style socket and small rocker switch on the rear face of the unit.",
        whatItDoes:
          "This is where mains electricity enters. The switch is a hard on/off that cuts power without unplugging the cable.",
        gaylNote:
          "When working inside a PC, switch this off and press the case power button once to drain leftover charge. The 0 and 1 symbols trip people up: 1 is on.",
      },
      {
        id: "psu-vent",
        x: 10,
        y: 50,
        name: "Ventilation grille",
        whatItIs:
          "The honeycomb mesh across the rear face of the unit.",
        whatItDoes:
          "It lets the hot air the fan pushes out escape through the back of the case.",
        gaylNote:
          "A PSU choked with dust runs hotter and dies sooner. This grille is worth a blast of compressed air during cleaning.",
      },
      {
        id: "psu-cables",
        x: 85,
        y: 45,
        name: "Cable bundle",
        whatItIs:
          "The thick sleeved cables coming out of the unit, ending in connectors like the big 24-pin plug and the smaller 8-pin plugs.",
        whatItDoes:
          "They carry power to every component: the 24-pin to the motherboard, 8-pin EPS to the CPU, PCIe plugs to the graphics card, and SATA plugs to drives.",
        gaylNote:
          "Modular units let you attach only the cables you need, which keeps the case tidy and airflow clear. On this unit they are permanently attached.",
      },
    ],
  },
  {
    id: "cooler",
    name: "CPU cooler",
    tagline: "Pulls heat off the processor so it can run at full speed.",
    parts: [
      {
        id: "cooler-fins",
        x: 25,
        y: 45,
        name: "Fin stack",
        whatItIs:
          "The tall tower of thin aluminum plates making up most of the cooler's body.",
        whatItDoes:
          "The fins create a huge surface area so heat can pass from the metal into the air moving through them.",
        gaylNote:
          "More surface area means more cooling, which is why performance coolers are big. Case clearance is a real spec to check before buying.",
      },
      {
        id: "cooler-pipes",
        x: 35,
        y: 14,
        name: "Heat pipes",
        whatItIs:
          "The copper tubes poking out of the top and curving down into the base.",
        whatItDoes:
          "Each pipe contains a fluid that evaporates at the hot end and condenses at the cool end, moving heat from the CPU up into the fins extremely fast.",
        gaylNote:
          "Copper shows up here because it conducts heat about twice as well as aluminum. The fins are aluminum because it is lighter and cheaper.",
      },
      {
        id: "cooler-fan",
        x: 68,
        y: 48,
        name: "Cooling fan",
        whatItIs:
          "The 120mm fan clipped to the face of the fin stack.",
        whatItDoes:
          "It pushes air through the fins constantly, carrying the heat away and out of the case. Without it the fins would just soak up heat and saturate.",
        gaylNote:
          "Fan speed follows CPU temperature through a BIOS fan curve. A fan that suddenly ramps up is often the first sign of dust or a dried-out thermal paste job.",
      },
      {
        id: "cooler-base",
        x: 62,
        y: 87,
        name: "Base plate",
        whatItIs:
          "The flat metal block at the bottom where the heat pipes meet.",
        whatItDoes:
          "It sits directly on the CPU's metal lid with a thin layer of thermal paste between them, collecting the heat the pipes then carry away.",
        gaylNote:
          "Thermal paste fills microscopic gaps between the two metal surfaces. Too much is messy, too little leaves air pockets, and air is a terrible conductor.",
      },
    ],
  },
  {
    id: "hdd",
    name: "Hard drive (HDD)",
    tagline: "Cheap, roomy storage built on spinning magnetic platters.",
    parts: [
      {
        id: "hdd-platter",
        x: 66,
        y: 47,
        name: "Platter hub",
        whatItIs:
          "The round bump in the middle of the cover. Underneath it sit the spinning magnetic disks, called platters, that store your data.",
        whatItDoes:
          "Data is written as magnetic patterns on the platter surfaces. A moving arm with a read/write head skims just above them while they spin, typically at 5400 or 7200 RPM.",
        gaylNote:
          "Moving parts are why hard drives click, hum and eventually fail. The classic sign of a dying drive is repetitive clicking, the so-called click of death.",
      },
      {
        id: "hdd-label",
        x: 45,
        y: 40,
        name: "Capacity label",
        whatItIs:
          "The white sticker listing the model, capacity, speed and serial number.",
        whatItDoes:
          "It tells you what the drive is: this one is a 1TB desktop drive at 7200 RPM with a 64MB cache.",
        gaylNote:
          "Cache on a hard drive is a small pool of fast memory holding frequently used data, a preview of the same idea you saw in the SSD's DRAM chip.",
      },
      {
        id: "hdd-sata",
        x: 72,
        y: 94,
        name: "SATA data and power connectors",
        whatItIs:
          "The two L-shaped plugs on the bottom edge: a small one for data, a longer one for power.",
        whatItDoes:
          "The data plug connects to a SATA port on the motherboard, and the power plug takes a SATA power cable straight from the power supply.",
        gaylNote:
          "Unlike an M.2 drive, every SATA drive needs two cables. A drive that shows no sign of life usually has one of them loose.",
      },
      {
        id: "hdd-pcb",
        x: 86,
        y: 93,
        name: "Controller board",
        whatItIs:
          "The green circuit board peeking out at the connector end.",
        whatItDoes:
          "It runs the drive's motor, positions the read head and translates SATA commands into magnetic writes.",
        gaylNote:
          "This board is matched to the exact drive at the factory. Swapping boards between drives to rescue data rarely works, which surprises people.",
      },
    ],
  },
  {
    id: "sata-ssd",
    name: "SATA SSD (2.5-inch)",
    tagline: "Solid-state speed in the classic laptop drive shape.",
    parts: [
      {
        id: "ssd-sata",
        x: 21,
        y: 51,
        name: "SATA data and power connectors",
        whatItIs:
          "The gold-fingered plugs on the left edge: data and power side by side, the same layout as a hard drive.",
        whatItDoes:
          "They connect the drive to a motherboard SATA port and a power cable from the PSU, so it drops straight into any system built for 2.5-inch drives.",
        gaylNote:
          "This is the upgrade path for older machines: same cables, same bays, but several times faster than the hard drive it replaces.",
      },
      {
        id: "ssd-nand",
        x: 90,
        y: 68,
        name: "NAND flash chips",
        whatItIs:
          "The black chips visible where the case is cut away. The same kind of flash memory as the M.2 drive uses.",
        whatItDoes:
          "They store all your data with no moving parts, which makes the drive silent, shock-resistant and far quicker than a spinning disk.",
        gaylNote:
          "Same memory, different road: these chips are limited by the SATA cable to around 550 MB/s, while an M.2 NVMe drive talks straight over PCIe.",
      },
      {
        id: "ssd-label",
        x: 52,
        y: 45,
        name: "Model label",
        whatItIs:
          "The sticker on the case naming the model, capacity and interface.",
        whatItDoes:
          "It tells you this is a 1TB drive on SATA III at 6Gb/s, the fastest version of SATA.",
        gaylNote:
          "SATA I, II and III are 1.5, 3 and 6 gigabits per second. Drives are backward compatible, so a SATA III drive works in an old port, just slower.",
      },
      {
        id: "ssd-case",
        x: 29,
        y: 84,
        name: "Metal case",
        whatItIs:
          "The slim aluminum shell, exactly the size of a laptop hard drive.",
        whatItDoes:
          "It protects the small circuit board inside and lets the drive mount in any standard 2.5-inch bay or bracket.",
        gaylNote:
          "Inside, the actual board often fills less than half the case. The shell exists to fit the old drive standard, not because the electronics need the room.",
      },
    ],
  },
  {
    id: "case",
    name: "PC case",
    tagline: "The chassis that holds, cools and protects everything.",
    parts: [
      {
        id: "case-tray",
        x: 45,
        y: 38,
        name: "Motherboard tray",
        whatItIs:
          "The big flat panel filling most of the interior. The motherboard screws onto it using pre-fitted standoffs.",
        whatItDoes:
          "It holds the motherboard slightly off the case wall so nothing shorts against the metal, and its cutouts let cables and the CPU cooler's backplate pass behind.",
        gaylNote:
          "The big rectangular window behind the CPU area is there so you can swap cooler backplates without removing the motherboard.",
      },
      {
        id: "case-exhaust",
        x: 24,
        y: 27,
        name: "Rear exhaust fan",
        whatItIs:
          "The fan mounted at the upper-left rear corner.",
        whatItDoes:
          "It pushes hot air out the back of the case. Paired with front intake fans, it sets up a steady front-to-back airflow over the components.",
        gaylNote:
          "Hot air rises, so exhaust up high and intake down low works with physics instead of against it.",
      },
      {
        id: "case-bays",
        x: 81,
        y: 82,
        name: "Drive bays",
        whatItIs:
          "The metal cages at the bottom front of the case.",
        whatItDoes:
          "They hold 2.5-inch and 3.5-inch drives. Each drive then gets a SATA data cable to the motherboard and a power cable from the PSU.",
        gaylNote:
          "Keep spinning hard drives screwed in firmly here. Their vibration travels through loose mounts and makes the whole case hum.",
      },
      {
        id: "case-shroud",
        x: 45,
        y: 82,
        name: "PSU shroud",
        whatItIs:
          "The covered compartment running along the bottom of the case.",
        whatItDoes:
          "The power supply mounts underneath it, hidden away with its cables, so the main chamber stays tidy and airflow stays smooth.",
        gaylNote:
          "The PSU fan faces down through a filtered vent in the case floor, pulling cool air from outside rather than hot air from the graphics card.",
      },
      {
        id: "case-cutouts",
        x: 72,
        y: 33,
        name: "Cable routing cutouts",
        whatItIs:
          "The tall openings along the right side of the motherboard tray, usually edged with rubber grommets.",
        whatItDoes:
          "They let you run cables behind the tray and bring them out exactly where each plug is needed, keeping the main chamber clear.",
        gaylNote:
          "Good cable routing is not just for looks. A clear chamber means air moves freely and temperatures drop.",
      },
      {
        id: "case-intake",
        x: 97,
        y: 45,
        name: "Front intake mounts",
        whatItIs:
          "The fan mounts behind the front panel on the right edge of the case.",
        whatItDoes:
          "Intake fans here pull cool outside air in across the drives and toward the CPU and graphics card.",
        gaylNote:
          "A common beginner setup is two fans in front pulling in, one at the rear pushing out. That slight positive pressure also keeps dust out.",
      },
    ],
  },
];
