import motherboard from "@/assets/hardware/motherboard.jpg";
import ram from "@/assets/hardware/ram.jpg";
import gpu from "@/assets/hardware/gpu.jpg";
import nvme from "@/assets/hardware/nvme.jpg";
import psu from "@/assets/hardware/psu.jpg";
import cooler from "@/assets/hardware/cooler.jpg";
import hdd from "@/assets/hardware/hdd.jpg";
import sataSsd from "@/assets/hardware/sata-ssd.jpg";
import pcCase from "@/assets/hardware/case.jpg";

export interface HardwarePhoto {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const hardwarePhotos: Record<string, HardwarePhoto> = {
  motherboard: {
    src: motherboard,
    width: 1280,
    height: 1024,
    alt: "Overhead photo of a desktop motherboard showing the CPU socket, memory slots, expansion slots, chipset heatsink and ports.",
  },
  ram: {
    src: ram,
    width: 1536,
    height: 640,
    alt: "Photo of a desktop memory stick showing the heat spreader, memory chips, gold contact edge and alignment notch.",
  },
  gpu: {
    src: gpu,
    width: 1280,
    height: 768,
    alt: "Photo of a dual-fan graphics card showing the cooling fans, power sockets, display outputs and gold PCIe edge connector.",
  },
  nvme: {
    src: nvme,
    width: 1536,
    height: 640,
    alt: "Photo of an M.2 NVMe solid state drive showing the gold connector, controller chip, cache chip and flash memory chips.",
  },
  psu: {
    src: psu,
    width: 1280,
    height: 960,
    alt: "Photo of a PC power supply showing the intake fan grille, rating label, power socket, ventilation grille and cable bundle.",
  },
  cooler: {
    src: cooler,
    width: 1280,
    height: 960,
    alt: "Photo of a tower CPU air cooler showing the aluminum fin stack, copper heat pipes, cooling fan and base plate.",
  },
  hdd: {
    src: hdd,
    width: 1280,
    height: 768,
    alt: "Photo of a 3.5-inch hard drive showing the metal cover, platter hub, capacity label and SATA connectors.",
  },
  "sata-ssd": {
    src: sataSsd,
    width: 1280,
    height: 768,
    alt: "Photo of a 2.5-inch SATA solid state drive showing the SATA connectors, model label and internal flash memory chips.",
  },
  case: {
    src: pcCase,
    width: 1280,
    height: 960,
    alt: "Photo of an open mid-tower PC case showing the motherboard tray, rear exhaust fan, drive bays, power supply shroud and cable cutouts.",
  },
};
