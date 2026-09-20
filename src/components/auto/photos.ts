import engineBay from "@/assets/auto/engine-bay.jpg";
import engineCutaway from "@/assets/auto/engine-cutaway.jpg";
import alternator from "@/assets/auto/alternator.jpg";
import starter from "@/assets/auto/starter.jpg";
import radiator from "@/assets/auto/radiator.jpg";
import battery from "@/assets/auto/battery.jpg";
import brakes from "@/assets/auto/brakes.jpg";
import sparkPlug from "@/assets/auto/spark-plug.jpg";

export interface AutoPhoto {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const autoPhotos: Record<string, AutoPhoto> = {
  "engine-bay": {
    src: engineBay,
    width: 1280,
    height: 960,
    alt: "Overhead photo of an open four-cylinder engine bay showing the engine cover, coolant reservoir, battery, air filter housing, brake fluid reservoir and radiator.",
  },
  "engine-cutaway": {
    src: engineCutaway,
    width: 1280,
    height: 960,
    alt: "Sectioned four-cylinder engine showing the camshaft, valves, pistons, connecting rods, crankshaft, timing chain and oil pan.",
  },
  alternator: {
    src: alternator,
    width: 1280,
    height: 960,
    alt: "Car alternator showing the ribbed drive pulley, vented housing over the stator windings, rear regulator cover, output stud and mounting ears.",
  },
  starter: {
    src: starter,
    width: 1280,
    height: 960,
    alt: "Starter motor showing the solenoid with its terminal studs, the motor body, the drive end housing and the pinion gear.",
  },
  radiator: {
    src: radiator,
    width: 1280,
    height: 960,
    alt: "Aluminium radiator showing the fin core, upper and lower tanks, pressure cap, hose necks, overflow nipple and mounting brackets.",
  },
  battery: {
    src: battery,
    width: 1280,
    height: 960,
    alt: "Twelve volt lead-acid car battery showing the positive and negative terminal posts, vent caps, carry handle and case.",
  },
  brakes: {
    src: brakes,
    width: 1280,
    height: 960,
    alt: "Disc brake assembly showing the vented rotor, hub and wheel studs, caliper, brake pads, bleeder screw and flexible brake hose.",
  },
  "spark-plug": {
    src: sparkPlug,
    width: 1536,
    height: 640,
    alt: "Close-up of an iridium spark plug showing the terminal nut, ribbed ceramic insulator, hex, sealing washer, threads and electrodes.",
  },
};
