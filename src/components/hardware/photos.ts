import motherboard from "@/assets/hardware/motherboard.jpg";
import ram from "@/assets/hardware/ram.jpg";
import gpu from "@/assets/hardware/gpu.jpg";
import nvme from "@/assets/hardware/nvme.jpg";

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
};
