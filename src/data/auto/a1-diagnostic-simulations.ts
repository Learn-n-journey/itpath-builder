import { a1PracticalProfileFor } from "@/data/auto/a1-practical";

export interface A1DiagnosticChoice {
  id: string;
  label: string;
  result: string;
  feedback: string;
  value: "best" | "useful" | "low-value";
}

export interface A1DiagnosticTest {
  id: string;
  label: string;
  result: string;
  interpretation: string;
  rulesOut: string;
  choices: A1DiagnosticChoice[];
}

export interface A1DiagnosticSimulation {
  topicId: string;
  complaint: string;
  tests: A1DiagnosticTest[];
  conclusion: string;
}

const RESULTS: Record<string, string[]> = {
  "engine-mechanical-foundations": [
    "Baseline inspection shows no external leak or fluid-level cause for the repeatable mechanical symptom.",
    "One cylinder is materially lower than its companions under the specified compression-test conditions.",
    "Leak-down evidence localizes the sealing loss to the cylinder rather than an external accessory or control issue.",
    "Noise, smoke, fluid condition, and the mechanical measurements support the same internal-engine fault path.",
    "The accumulated evidence is sufficient to choose the repair path without replacing unrelated parts.",
  ],
  "cylinder-head-valve-train": [
    "Inspection finds a repeatable top-end symptom with no obvious external cause.",
    "The relevant head or valve-train dimension is outside the service limit supplied for the exercise.",
    "Valve, seat, guide, spring, follower, or cam inspection supports the measured abnormality.",
    "Cylinder sealing evidence points to the valve/head path rather than the piston-ring path.",
    "The recorded measurements identify which component is reusable, serviceable, or requires machining/replacement.",
  ],
  "engine-block-internal-wear": [
    "The cleaned component is ready for measurement and no debris is distorting the contact surfaces.",
    "Measurements at multiple locations reveal a repeatable dimensional difference rather than a single-point anomaly.",
    "Calculated taper, out-of-round, or running clearance exceeds the supplied service limit.",
    "Wear patterns on the related piston, ring, bearing, or journal agree with the precision measurements.",
    "The measurements support a specific reuse, machining, or replacement decision.",
  ],
  "lubrication-cooling-systems": [
    "Fluid level, condition, and visual inspection do not fully explain the reported pressure or temperature concern.",
    "The measured pressure or temperature behavior is outside the supplied specification under the required operating condition.",
    "Targeted flow, pressure-retention, airflow, pump/regulator, or clearance evidence narrows the fault to one system path.",
    "The remaining alternative does not reproduce the measured behavior.",
    "The evidence identifies the failed condition and any contamination or secondary concern that must be corrected.",
  ],
  "engine-external-performance-assessment": [
    "The complaint is repeatable and the initial inspection identifies a suspicious external condition.",
    "A leak or functional check confirms the condition changes system behavior.",
    "Comparison with service information or a known-good condition separates the external fault from an internal-engine fault.",
    "The evidence is sufficient to repair the confirmed sealing, routing, mounting, or drive condition.",
    "Reinspection after the proposed correction provides a clear verification target.",
  ],
  "advanced-internal-mechanical-diagnosis": [
    "Basic external, ignition, fuel, and control checks do not account for the repeatable symptom.",
    "Cylinder comparison shows a mechanical imbalance requiring localization.",
    "Leak-down evidence identifies the path through which cylinder pressure is being lost.",
    "Supporting vacuum, visual, noise, or fluid evidence agrees with the primary mechanical tests.",
    "Multiple independent signals now localize the internal mechanical fault.",
  ],
  "precision-measurement-and-machining": [
    "The part and measuring surfaces are clean and the selected tool has the required range and resolution.",
    "The measuring tool is referenced correctly and produces repeatable readings.",
    "Measurements taken at the specified locations reveal the dimensional condition of the part.",
    "The calculated clearance, taper, out-of-round, runout, or related value can be compared with the supplied service limit.",
    "The final comparison supports reuse, machining, or replacement without guessing.",
  ],
  "cooling-system-performance-validation": [
    "The cold fluid-level and condition check establishes a safe baseline for further testing.",
    "Pressure testing reveals whether the system and cap retain the supplied test pressure as required.",
    "Temperature data and fan operation show whether thermal control follows the expected warm-up sequence.",
    "Circuit temperature behavior narrows a suspected flow or heat-transfer problem.",
    "The final targeted test separates an external cooling-system fault from combustion entering the cooling system.",
  ],
  "valve-train-synchronization": [
    "The symptom and available correlation/noise evidence justify a mechanical timing inspection.",
    "The engine is positioned according to the supplied service procedure without forcing an interference condition.",
    "Mechanical timing references show whether crankshaft and camshaft positions agree.",
    "Control-system correlation evidence supports the mechanical finding where the vehicle provides it.",
    "A hand-rotation and reference recheck provides the pre-start verification required after timing service.",
  ],
  "fuel-delivery-exhaust-backpressure": [
    "Initial inspection does not reveal a simple disconnected, leaking, or visibly restricted path.",
    "Scan evidence indicates whether fuel control, airflow, or exhaust flow deserves the next targeted test.",
    "The supplied fuel pressure/volume result separates delivery capacity from a control-only suspicion.",
    "The exhaust-flow test confirms or rejects excessive restriction under the specified condition.",
    "The combined evidence separates delivery or breathing restriction from ignition and internal-engine causes.",
  ],
  "engine-block-reconditioning-practices": [
    "Cleaning exposes the sealing surfaces, bores, threads, and passages needed for a valid inspection.",
    "The appropriate inspection method identifies whether cracking or structural damage is present.",
    "Precision measurements establish the condition of deck, bore, and bearing-related dimensions.",
    "Comparison with service limits and available repair sizes determines whether reconditioning is viable.",
    "Post-machining cleaning and remeasurement provide evidence that the block is ready for assembly.",
  ],
  "complete-engine-mechanical-integration": [
    "The recorded measurements and repair decisions are complete enough to begin final assembly.",
    "Critical clearances, timing, sealing surfaces, fluid paths, and fastener procedures are verified during assembly.",
    "Required pre-start priming or preparation is complete.",
    "Initial operation shows whether lubrication, temperature, leakage, noise, and warning indicators are normal.",
    "The final functional test reproduces the original operating condition and provides closure evidence.",
  ],
};

const COMPLAINTS: Record<string, string> = {
  "engine-mechanical-foundations": "The engine has a repeatable mechanical performance concern and the cause has not yet been localized.",
  "cylinder-head-valve-train": "The engine has a repeatable top-end or cylinder-sealing concern.",
  "engine-block-internal-wear": "Internal wear is suspected, but the reusable condition of the block and rotating assembly is unknown.",
  "lubrication-cooling-systems": "The engine shows an abnormal oil-pressure or temperature-related condition.",
  "engine-external-performance-assessment": "The engine has a performance, noise, vibration, or leak concern that may be external.",
  "advanced-internal-mechanical-diagnosis": "A persistent engine symptom remains after basic external and control checks.",
  "precision-measurement-and-machining": "A component must be measured before a reuse or machining decision can be made.",
  "cooling-system-performance-validation": "The vehicle has a repeatable cooling-system performance concern.",
  "valve-train-synchronization": "The engine has symptoms consistent with possible valve-timing or synchronization error.",
  "fuel-delivery-exhaust-backpressure": "The engine lacks expected performance and fuel delivery or exhaust restriction is suspected.",
  "engine-block-reconditioning-practices": "An engine block must be evaluated for reuse or reconditioning.",
  "complete-engine-mechanical-integration": "A repaired engine is being assembled and must be proven ready for service.",
};


const LOW_VALUE_TESTS = [
  "Replace the most suspicious part and see whether the symptom changes",
  "Clear any stored information and return the vehicle without reproducing the complaint",
  "Skip the measurement and rely on the symptom description alone",
];

function alternatives(
  topicId: string,
  index: number,
  correctLabel: string,
  previousLabel?: string,
): A1DiagnosticChoice[] {
  const useful = previousLabel
    ? `Repeat the previous step first: ${previousLabel}`
    : "Perform a broader visual inspection without recording a baseline";
  const low = LOW_VALUE_TESTS[(topicId.length + index) % LOW_VALUE_TESTS.length]!;
  const correct: A1DiagnosticChoice = {
    id: `${topicId}-choice-${index + 1}-best`,
    label: correctLabel,
    result: "",
    feedback: "Best next test. It follows the evidence already gathered and advances the diagnosis.",
    value: "best",
  };
  const secondary: A1DiagnosticChoice = {
    id: `${topicId}-choice-${index + 1}-useful`,
    label: useful,
    result: "The check is valid, but it adds little new evidence at this point.",
    feedback: "Useful in some situations, but less efficient here because the current evidence supports a more targeted next test.",
    value: "useful",
  };
  const poor: A1DiagnosticChoice = {
    id: `${topicId}-choice-${index + 1}-low`,
    label: low,
    result: "No defensible new diagnostic evidence is produced.",
    feedback: "Low-value choice. Diagnosis should advance from controlled checks and measurements, not parts swapping or unsupported assumptions.",
    value: "low-value",
  };
  return index % 2 === 0 ? [secondary, correct, poor] : [poor, secondary, correct];
}

function slug(topicId: string): string {
  return topicId.replace(/^topic-/, "");
}

export function a1DiagnosticSimulationFor(topicId: string): A1DiagnosticSimulation | undefined {
  const practical = a1PracticalProfileFor(topicId);
  if (!practical) return undefined;
  const key = slug(topicId);
  const results = RESULTS[key] ?? [];
  const tests = practical.testPlan.map((label, index) => {
    const result = results[index] ?? "The result is recorded. Compare it with the supplied service information before continuing.";
    const choices = alternatives(topicId, index, label, practical.testPlan[index - 1]);
    const best = choices.find((choice) => choice.value === "best");
    if (best) best.result = result;
    return {
      id: `${topicId}-test-${index + 1}`,
      label,
      result,
      interpretation: index === practical.testPlan.length - 1
        ? "You now have enough evidence to justify a repair decision and define the verification step."
        : "Use this result to narrow the fault before choosing the next test.",
      rulesOut: index === 0
        ? "This prevents jumping directly to parts replacement before the complaint and baseline condition are verified."
        : "This result reduces the likelihood of alternatives that do not match the accumulated evidence.",
      choices,
    };
  });
  return {
    topicId,
    complaint: COMPLAINTS[key] ?? "A repeatable engine concern requires an evidence-based diagnostic sequence.",
    tests,
    conclusion: practical.repairDecision,
  };
}
