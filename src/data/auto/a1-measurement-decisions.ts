export interface A1MeasurementStep {
  id: string;
  label: string;
  result: string;
  interpretation: string;
}

export interface A1ServiceDecision {
  id: string;
  label: string;
  feedback: string;
  correct: boolean;
}

export interface A1MeasurementScenario {
  topicId: string;
  job: string;
  measurements: A1MeasurementStep[];
  decisionChoices: A1ServiceDecision[];
  verification: string[];
}

export const a1MeasurementScenarios: A1MeasurementScenario[] = [
  {
    topicId: "topic-engine-block-internal-wear",
    job: "A worn engine is disassembled. Determine whether the measured block and rotating components can be reused, machined, or must be replaced.",
    measurements: [
      { id: "clean", label: "Clean the measuring surfaces and establish the service-information limits", result: "The surfaces are clean and the applicable measurement locations and service limits are available.", interpretation: "Valid dimensional decisions require clean surfaces and the correct limits before measuring." },
      { id: "bore", label: "Measure cylinder bores at the specified heights and directions", result: "The readings show repeatable taper/out-of-round beyond the supplied reusable limit but within the available machining range.", interpretation: "A single bore reading would miss the wear pattern; the multi-point measurements establish the dimensional condition." },
      { id: "related", label: "Measure related piston, journal, and clearance dimensions and inspect wear patterns", result: "The related measurements agree with the bore wear and do not reveal a separate condition requiring block replacement.", interpretation: "The measurements support reconditioning rather than guessing from appearance." },
    ],
    decisionChoices: [
      { id: "reuse", label: "Reuse the components because the engine still rotated before disassembly.", feedback: "Operation before teardown does not override measurements outside the reusable limit.", correct: false },
      { id: "machine", label: "Machine the affected dimensions to an available repair size and select matching components according to service information.", feedback: "Correct. The measured condition is outside reuse limits but remains within a supported repair range.", correct: true },
      { id: "replace", label: "Replace the block automatically whenever taper or out-of-round is found.", feedback: "Replacement is not automatically required when the component can be restored within an approved repair size.", correct: false },
    ],
    verification: ["Re-measure the machined dimensions at all required locations.", "Verify final assembly clearances with the matching components.", "Confirm free rotation and document the measurements before startup."],
  },
  {
    topicId: "topic-precision-measurement-and-machining",
    job: "A component must be approved for reuse or machining. Build a defensible decision from tool setup, repeated measurements, and the supplied service limit.",
    measurements: [
      { id: "tool", label: "Select the correct measuring tool and verify its range, resolution, and reference", result: "The tool is appropriate for the dimension and produces a repeatable reference.", interpretation: "A precise-looking number is not useful if the tool or reference is wrong." },
      { id: "locations", label: "Measure every location and direction required by the service procedure", result: "Repeated readings reveal a dimensional variation that exceeds the reusable limit.", interpretation: "Multiple readings distinguish actual taper, out-of-round, runout, or clearance from a single-point assumption." },
      { id: "compare", label: "Calculate the required comparison and check available repair sizes", result: "The component is outside the reuse limit but can be restored within an approved machining range.", interpretation: "The service decision now follows the measurement and repair range." },
    ],
    decisionChoices: [
      { id: "reuse-close", label: "Reuse it because the readings are close to the limit.", feedback: "Outside the supplied reusable limit is not approved merely because the difference appears small.", correct: false },
      { id: "machine-range", label: "Machine it within the approved repair range, then re-measure before assembly.", feedback: "Correct. This decision follows both the measured condition and the available repair range.", correct: true },
      { id: "machine-guess", label: "Machine it until the surface looks uniform, then assemble it.", feedback: "Machining requires a dimensional target and post-machining measurement, not appearance alone.", correct: false },
    ],
    verification: ["Re-reference the measuring equipment.", "Re-measure the repaired component at the required locations.", "Verify final calculated clearance/dimension is within the supplied specification and record it."],
  },
  {
    topicId: "topic-engine-block-reconditioning-practices",
    job: "An engine block is being evaluated for reconditioning. Decide whether it can be restored within service limits and prove the finished block is ready for assembly.",
    measurements: [
      { id: "inspect", label: "Clean and inspect the block, passages, threads, sealing surfaces, and suspected structural areas", result: "No non-repairable structural damage is found; the block can proceed to dimensional evaluation.", interpretation: "Reconditioning should not begin until structural suitability is established." },
      { id: "measure", label: "Measure deck, bore, and bearing-related dimensions at the specified locations", result: "The dimensions require correction but remain within supported reconditioning options.", interpretation: "The block is not reusable as-is, but the measurements do not require automatic replacement." },
      { id: "repair-range", label: "Compare required corrections with available service/repair sizes", result: "The required machining remains inside the published repair range.", interpretation: "The evidence supports reconditioning with defined dimensional targets." },
    ],
    decisionChoices: [
      { id: "assemble", label: "Clean the block and assemble it without machining because no major crack was found.", feedback: "Structural integrity alone does not make out-of-limit dimensions reusable.", correct: false },
      { id: "recondition", label: "Recondition the block to the supported repair dimensions, then clean and re-measure it.", feedback: "Correct. Both structural inspection and dimensional limits support this path.", correct: true },
      { id: "replace-all", label: "Replace every block that needs machining.", feedback: "Machining exists specifically to restore serviceable components when approved repair limits allow it.", correct: false },
    ],
    verification: ["Document post-machining dimensions.", "Clean and verify oil/coolant passages and threaded features.", "Confirm the reconditioned dimensions produce the required final assembly clearances."],
  },
  {
    topicId: "topic-complete-engine-mechanical-integration",
    job: "A repaired engine is ready for final assembly. Decide whether the recorded measurements and setup are sufficient to proceed, then prove the assembled engine is ready for service.",
    measurements: [
      { id: "records", label: "Review the recorded component measurements and repair decisions before assembly", result: "All critical repaired dimensions have documented in-limit results except one final bearing clearance that has not yet been verified.", interpretation: "Final assembly should stop when a prerequisite measurement is missing." },
      { id: "clearance", label: "Measure and document the remaining critical assembly clearance", result: "The final clearance is within the supplied specification.", interpretation: "The missing prerequisite is now resolved with measured evidence." },
      { id: "setup", label: "Verify timing, sealing surfaces, fluid paths, fastener procedures, and required pre-start preparation", result: "The assembly checks and required priming/preparation are complete.", interpretation: "The engine now has a defensible pre-start baseline rather than an assumption that assembly is correct." },
    ],
    decisionChoices: [
      { id: "start-early", label: "Start the engine before checking the missing clearance and listen for abnormal noise.", feedback: "Initial startup is not a substitute for a required assembly measurement.", correct: false },
      { id: "proceed", label: "Proceed to initial operation only after the missing measurement and all pre-start prerequisites are verified.", feedback: "Correct. The decision preserves the chain of verified measurements and procedures.", correct: true },
      { id: "teardown", label: "Disassemble the completed work again even though all required measurements are now documented in specification.", feedback: "The verified evidence supports proceeding; unnecessary teardown adds risk without resolving an identified problem.", correct: false },
    ],
    verification: ["Confirm oil pressure/lubrication immediately during initial operation.", "Check temperature behavior, leaks, abnormal noise, and warning indicators.", "Complete the required functional test under the original complaint condition and recheck fluids after the specified cycle."],
  },
];

export function a1MeasurementScenarioFor(topicId: string): A1MeasurementScenario | undefined {
  return a1MeasurementScenarios.find((scenario) => scenario.topicId === topicId);
}
