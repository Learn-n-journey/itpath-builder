/**
 * Virtual OBD-II scan tool data.
 *
 * Each scenario is one vehicle with one underlying fault. Everything the tool
 * shows — stored codes, freeze frame, live readings — is derived from the
 * scenario, so the readings always agree with each other and with the fault.
 * Values are typical published ranges for generic OBD-II parameters; nothing
 * here is a manufacturer specification for a particular vehicle.
 */

export interface LivePid {
  id: string;
  label: string;
  unit: string;
  /** Value at idle. */
  idle: number;
  /** Value at around 2500 rpm. */
  cruise: number;
  /** How much the reading wanders, to make the stream look live. */
  jitter: number;
  /** Shown when the reading is outside what a healthy engine returns. */
  note?: string;
  healthy: boolean;
}

export interface DiagnosticCode {
  code: string;
  status: "stored" | "pending";
  title: string;
  meaning: string;
  commonCauses: string[];
  nextChecks: string[];
}

export interface ObdScenario {
  id: string;
  vehicle: string;
  complaint: string;
  /** What is actually wrong. Revealed only when the learner asks. */
  rootCause: string;
  milOn: boolean;
  readinessIncomplete: string[];
  codes: DiagnosticCode[];
  freezeFrame: Array<[string, string]>;
  pids: LivePid[];
  teaching: string;
}

const basePids = (over: Partial<Record<string, Partial<LivePid>>> = {}): LivePid[] =>
  [
    { id: "rpm", label: "Engine speed", unit: "rpm", idle: 750, cruise: 2500, jitter: 25, healthy: true },
    { id: "load", label: "Calculated load", unit: "%", idle: 18, cruise: 32, jitter: 2, healthy: true },
    { id: "ect", label: "Coolant temperature", unit: "\u00b0C", idle: 89, cruise: 91, jitter: 1, healthy: true },
    { id: "stft", label: "Short term fuel trim", unit: "%", idle: 1, cruise: 1, jitter: 2, healthy: true },
    { id: "ltft", label: "Long term fuel trim", unit: "%", idle: 2, cruise: 2, jitter: 1, healthy: true },
    { id: "map", label: "Intake manifold pressure", unit: "kPa", idle: 33, cruise: 45, jitter: 1, healthy: true },
    { id: "o2", label: "Upstream oxygen sensor", unit: "V", idle: 0.45, cruise: 0.45, jitter: 0.35, healthy: true },
    { id: "misfire", label: "Misfire count, cyl 1-4", unit: "counts", idle: 0, cruise: 0, jitter: 0, healthy: true },
  ].map((pid) => ({ ...pid, ...(over[pid.id] ?? {}) }));

export const obdScenarios: ObdScenario[] = [
  {
    id: "healthy",
    vehicle: "2016 sedan, 2.0 L four cylinder",
    complaint: "No complaint. Baseline vehicle, used to learn what normal looks like.",
    rootCause: "Nothing is wrong. Every reading sits inside the normal band.",
    milOn: false,
    readinessIncomplete: [],
    codes: [],
    freezeFrame: [],
    pids: basePids(),
    teaching:
      "Start here. Learn the shape of a healthy stream: fuel trims near zero, the upstream oxygen sensor swinging across 0.45 V, load rising with throttle and no misfire counts.",
  },
  {
    id: "vacuum-leak",
    vehicle: "2014 hatchback, 1.8 L four cylinder",
    complaint: "Rough, high idle. Check engine light on. Runs fine once moving.",
    rootCause: "Cracked intake hose downstream of the mass air flow sensor. Unmetered air enters at idle.",
    milOn: true,
    readinessIncomplete: ["Evaporative system"],
    codes: [
      {
        code: "P0171",
        status: "stored",
        title: "System too lean, bank 1",
        meaning:
          "The control module added as much fuel as it is allowed to and the oxygen sensor still reports lean, so the mixture is leaner than the module can correct.",
        commonCauses: [
          "Unmetered air entering after the air flow sensor",
          "Low fuel pressure or a restricted filter",
          "Contaminated or failing mass air flow sensor",
          "Exhaust leak ahead of the upstream oxygen sensor",
        ],
        nextChecks: [
          "Compare fuel trims at idle against 2500 rpm",
          "Smoke test the intake tract for leaks",
          "Check fuel pressure against the service manual figure",
          "Inspect the air flow sensor element for contamination",
        ],
      },
    ],
    freezeFrame: [
      ["Engine speed", "1180 rpm"],
      ["Calculated load", "16 %"],
      ["Coolant temperature", "90 \u00b0C"],
      ["Short term fuel trim", "+18 %"],
      ["Long term fuel trim", "+22 %"],
      ["Vehicle speed", "0 km/h"],
    ],
    pids: basePids({
      rpm: { idle: 1150, jitter: 60 },
      stft: { idle: 18, cruise: 5, jitter: 3, healthy: false, note: "Large positive trim at idle only points at unmetered air." },
      ltft: { idle: 22, cruise: 6, jitter: 1, healthy: false, note: "The module has learned a big fuel addition." },
      map: { idle: 44, cruise: 47, jitter: 1, healthy: false, note: "Manifold pressure is higher than a sealed engine at idle." },
      o2: { idle: 0.18, cruise: 0.42, jitter: 0.08, healthy: false, note: "Sensor sits lean at idle instead of swinging." },
    }),
    teaching:
      "A lean code that shrinks as engine speed rises is the classic vacuum leak pattern: the leak is a fixed amount of air, so it matters much less once the throttle opens.",
  },
  {
    id: "misfire-coil",
    vehicle: "2018 crossover, 2.5 L four cylinder",
    complaint: "Flashing check engine light, shaking at idle, smell of fuel.",
    rootCause: "Failed ignition coil on cylinder 3. Unburned fuel reaches the converter, so the light flashes.",
    milOn: true,
    readinessIncomplete: ["Catalyst", "Oxygen sensor"],
    codes: [
      {
        code: "P0303",
        status: "stored",
        title: "Cylinder 3 misfire detected",
        meaning:
          "The module measured crankshaft speed dropping in the part of the cycle belonging to cylinder 3, so that cylinder is not producing its share of power.",
        commonCauses: [
          "Failed ignition coil or spark plug",
          "Fuel injector not opening",
          "Low compression on that cylinder",
          "Broken valve spring or worn camshaft lobe",
        ],
        nextChecks: [
          "Swap the coil with a neighbouring cylinder and see if the misfire follows",
          "Inspect the spark plug for wear, fouling or cracked insulator",
          "Check injector operation on that cylinder",
          "Run a compression or cylinder leakage test if the misfire stays put",
        ],
      },
      {
        code: "P0300",
        status: "pending",
        title: "Random or multiple cylinder misfire",
        meaning: "Misfire counts were high enough across the engine for the module to set a general misfire code as well.",
        commonCauses: ["One cylinder misfiring badly enough to trip the general counter"],
        nextChecks: ["Fix the cylinder specific code first, clear codes and drive the vehicle again"],
      },
    ],
    freezeFrame: [
      ["Engine speed", "790 rpm"],
      ["Calculated load", "24 %"],
      ["Coolant temperature", "88 \u00b0C"],
      ["Short term fuel trim", "-4 %"],
      ["Misfire count, cyl 3", "412"],
      ["Vehicle speed", "0 km/h"],
    ],
    pids: basePids({
      rpm: { idle: 720, jitter: 90, healthy: false, note: "Idle speed is unsteady because one cylinder is dropping out." },
      load: { idle: 24, cruise: 38, jitter: 3 },
      misfire: { idle: 412, cruise: 260, jitter: 12, healthy: false, note: "Counts are concentrated on cylinder 3." },
      o2: { idle: 0.72, cruise: 0.64, jitter: 0.1, healthy: false, note: "Unburned oxygen and fuel upset the sensor reading." },
    }),
    teaching:
      "A flashing light means the misfire is bad enough to damage the catalytic converter. Stop driving, find the missing cylinder, and confirm whether the fault follows the coil when you swap it.",
  },
  {
    id: "thermostat",
    vehicle: "2015 pickup, 3.5 L six cylinder",
    complaint: "Heater blows cool on short trips. Light came on after a week.",
    rootCause: "Thermostat stuck open, so the engine never reaches operating temperature.",
    milOn: true,
    readinessIncomplete: ["Catalyst"],
    codes: [
      {
        code: "P0128",
        status: "stored",
        title: "Coolant temperature below thermostat regulating temperature",
        meaning:
          "After enough run time the module expected the coolant to reach its regulating temperature and it did not, so it flags the cooling system rather than the sensor.",
        commonCauses: [
          "Thermostat stuck open",
          "Wrong temperature thermostat fitted",
          "Faulty coolant temperature sensor reading low",
          "Cooling fan running constantly",
        ],
        nextChecks: [
          "Watch coolant temperature climb on the live stream from a cold start",
          "Compare the sensor reading with an infrared thermometer on the housing",
          "Feel for an upper hose that gets warm far too early",
        ],
      },
    ],
    freezeFrame: [
      ["Engine speed", "1980 rpm"],
      ["Calculated load", "29 %"],
      ["Coolant temperature", "64 \u00b0C"],
      ["Intake air temperature", "11 \u00b0C"],
      ["Run time since start", "18 min"],
      ["Vehicle speed", "72 km/h"],
    ],
    pids: basePids({
      ect: { idle: 64, cruise: 62, jitter: 1, healthy: false, note: "Temperature never climbs into the normal band." },
      ltft: { idle: 6, cruise: 5, jitter: 1, healthy: false, note: "A cold engine runs richer, so trims drift." },
    }),
    teaching:
      "This code is about the cooling system, not the sensor. Read the temperature rise over time from a cold start before condemning any part.",
  },
  {
    id: "evap",
    vehicle: "2017 sedan, 1.5 L turbo",
    complaint: "Light came on after refuelling. Vehicle drives normally.",
    rootCause: "Fuel cap not tightened, leaving a large leak in the evaporative emission system.",
    milOn: true,
    readinessIncomplete: ["Evaporative system"],
    codes: [
      {
        code: "P0455",
        status: "stored",
        title: "Evaporative emission system leak detected, large leak",
        meaning:
          "The module could not build or hold the expected pressure or vacuum in the fuel vapour system, so vapour is escaping to the atmosphere.",
        commonCauses: [
          "Loose, damaged or missing fuel cap",
          "Cracked vapour hose",
          "Purge or vent valve stuck open",
          "Damaged fuel filler neck seal",
        ],
        nextChecks: [
          "Check the cap seal and tighten until it clicks",
          "Inspect vapour lines along the tank and filler neck",
          "Command the purge valve with a scan tool and listen for it seating",
          "Clear the code and complete a drive cycle so the monitor runs again",
        ],
      },
    ],
    freezeFrame: [
      ["Engine speed", "1450 rpm"],
      ["Calculated load", "22 %"],
      ["Coolant temperature", "92 \u00b0C"],
      ["Fuel level", "86 %"],
      ["Vehicle speed", "48 km/h"],
    ],
    pids: basePids(),
    teaching:
      "Evaporative codes rarely change how the vehicle drives. The monitor only runs under set conditions, so after a repair the vehicle has to be driven before readiness returns to complete.",
  },
];

export function scenarioById(id: string): ObdScenario {
  return obdScenarios.find((scenario) => scenario.id === id) ?? obdScenarios[0]!;
}
