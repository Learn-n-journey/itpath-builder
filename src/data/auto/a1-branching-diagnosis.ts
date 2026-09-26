export type A1EvidenceState = "plausible" | "less-likely" | "ruled-out" | "supported";

export interface A1BranchingCause {
  id: string;
  label: string;
}

export interface A1BranchingOutcome {
  result: string;
  interpretation: string;
  evidence: Record<string, A1EvidenceState>;
}

export interface A1BranchingTest {
  id: string;
  label: string;
  outcomes: Record<string, A1BranchingOutcome>;
}

export interface A1RepairChoice {
  id: string;
  label: string;
  feedback: string;
  correct: boolean;
  verificationFailureEvidence?: string;
}

export interface A1VerificationChoice {
  id: string;
  label: string;
  feedback: string;
  correct: boolean;
}

export interface A1BranchingScenario {
  topicId: string;
  complaint: string;
  hiddenCauseId: string;
  causes: A1BranchingCause[];
  tests: A1BranchingTest[];
  diagnosisThreshold: number;
  repair: string;
  verification: string[];
  repairChoices: A1RepairChoice[];
  verificationChoices: A1VerificationChoice[];
}

const outcome = (
  result: string,
  interpretation: string,
  evidence: Record<string, A1EvidenceState>,
): A1BranchingOutcome => ({ result, interpretation, evidence });

export const a1BranchingScenarios: A1BranchingScenario[] = [
  {
    topicId: "topic-engine-mechanical-foundations",
    complaint: "The engine runs rough and one cylinder contributes less than the others. Determine where the cylinder is losing its ability to seal.",
    hiddenCauseId: "valve-sealing",
    causes: [
      { id: "ring-sealing", label: "Piston or ring sealing loss" },
      { id: "valve-sealing", label: "Valve sealing loss" },
      { id: "head-gasket", label: "Head-gasket or adjacent-cylinder sealing breach" },
    ],
    diagnosisThreshold: 2,
    repair: "Inspect and service the affected valve, seat, guide, or related cylinder-head component according to service information after the sealing fault is confirmed.",
    verification: ["Repeat the cylinder sealing test.", "Recheck cylinder contribution and the original rough-running complaint.", "Confirm there are no new fluid leaks, abnormal noises, or warning indicators."],
    repairChoices: [
      { id: "service-valve-path", label: "Service the confirmed valve-sealing fault using service information, correcting the affected valve/seat/guide condition as measurements require.", feedback: "This repair addresses the fault localized by the leak-down and supporting cylinder-sealing evidence.", correct: true },
      { id: "replace-rings", label: "Replace the piston rings because low compression was measured.", feedback: "Low compression alone did not localize the leak. The later evidence points away from the ring/cylinder path.", correct: false, verificationFailureEvidence: "Post-repair compression remains low and leak-down still escapes through the valve path. The original rough-running complaint remains." },
      { id: "adjust-only", label: "Perform an adjustment only and return the vehicle without correcting the confirmed sealing defect.", feedback: "An adjustment is incomplete when the evidence identifies a physical valve-sealing fault that still fails the sealing test.", correct: false, verificationFailureEvidence: "The adjustment does not restore cylinder sealing. Leak-down still identifies leakage at the intake or exhaust path." },
      { id: "replace-head-gasket", label: "Replace the head gasket without evidence of cylinder-to-cylinder or cooling-system leakage.", feedback: "That replacement does not match the localized evidence and adds unnecessary work.", correct: false, verificationFailureEvidence: "The original cylinder still loses pressure through the valve path after the unrelated gasket replacement." },
    ],
    verificationChoices: [
      { id: "repeat-sealing", label: "Repeat the cylinder sealing test under the same controlled conditions and compare the result with the pre-repair evidence.", feedback: "This directly checks whether the repaired sealing path now holds pressure.", correct: true },
      { id: "recheck-complaint", label: "Recheck cylinder contribution and reproduce the original rough-running operating condition.", feedback: "This verifies that the measured repair also corrected the customer's original complaint.", correct: true },
      { id: "final-inspection", label: "Inspect for new leaks, abnormal noises, warning indicators, and disturbed connections before closing the repair order.", feedback: "A final inspection checks for repair-induced or remaining concerns.", correct: true },
      { id: "clear-codes", label: "Clear stored information and consider the repair verified if no warning light immediately returns.", feedback: "Clearing information is not proof that cylinder sealing or the original complaint has been corrected.", correct: false },
    ],
    tests: [
      {
        id: "compression",
        label: "Perform a cylinder compression comparison using the vehicle-specific procedure",
        outcomes: {
          "ring-sealing": outcome("The affected cylinder is materially lower than its companions.", "Compression confirms a cylinder sealing problem but does not by itself identify where pressure escapes.", { "ring-sealing": "supported", "valve-sealing": "supported", "head-gasket": "supported" }),
          "valve-sealing": outcome("The affected cylinder is materially lower than its companions.", "Compression confirms a cylinder sealing problem but does not by itself identify where pressure escapes.", { "ring-sealing": "supported", "valve-sealing": "supported", "head-gasket": "supported" }),
          "head-gasket": outcome("Two adjacent cylinders are materially lower than the remaining cylinders.", "The adjacent pattern raises suspicion for a sealing breach between cylinders, but localization is still required.", { "ring-sealing": "less-likely", "valve-sealing": "less-likely", "head-gasket": "supported" }),
        },
      },
      {
        id: "wet-compression",
        label: "Repeat the low cylinder's compression check with the service-approved wet-test method when applicable",
        outcomes: {
          "ring-sealing": outcome("The reading increases noticeably compared with the dry comparison.", "The change supports leakage past the piston-ring/cylinder interface. Confirm with a localization test before repair.", { "ring-sealing": "supported", "valve-sealing": "less-likely", "head-gasket": "less-likely" }),
          "valve-sealing": outcome("The reading remains essentially unchanged from the dry comparison.", "No meaningful wet-test improvement makes a ring-sealing explanation less likely and keeps valve or gasket leakage in play.", { "ring-sealing": "less-likely", "valve-sealing": "supported", "head-gasket": "plausible" }),
          "head-gasket": outcome("The adjacent-cylinder pattern remains and the wet check does not materially change it.", "The pattern does not behave like a simple ring-sealing loss.", { "ring-sealing": "ruled-out", "valve-sealing": "less-likely", "head-gasket": "supported" }),
        },
      },
      {
        id: "leak-down",
        label: "Perform a cylinder leak-down test and identify where the test air escapes",
        outcomes: {
          "ring-sealing": outcome("Leakage is heard and measured primarily through the crankcase path.", "Air escaping into the crankcase localizes the sealing loss toward the piston-ring/cylinder interface.", { "ring-sealing": "supported", "valve-sealing": "ruled-out", "head-gasket": "ruled-out" }),
          "valve-sealing": outcome("Leakage is heard primarily at the intake or exhaust path with the tested cylinder positioned correctly.", "The leak-down result localizes pressure loss to a valve sealing path.", { "ring-sealing": "ruled-out", "valve-sealing": "supported", "head-gasket": "ruled-out" }),
          "head-gasket": outcome("Leakage communicates with the adjacent cylinder or cooling system during the controlled test.", "The result supports a head-gasket or related cylinder-to-cylinder/coolant sealing breach.", { "ring-sealing": "ruled-out", "valve-sealing": "ruled-out", "head-gasket": "supported" }),
        },
      },
    ],
  },
  {
    topicId: "topic-cooling-system-performance-validation",
    complaint: "The engine overheats mainly at low road speed. Diagnose the cooling-system condition without opening a hot pressurized system.",
    hiddenCauseId: "fan-airflow",
    causes: [
      { id: "fan-airflow", label: "Cooling-fan or low-speed airflow fault" },
      { id: "thermostat-flow", label: "Thermostat or coolant-flow restriction" },
      { id: "pressure-loss", label: "Coolant leak or pressure-retention fault" },
      { id: "radiator-restriction", label: "Radiator heat-transfer or flow restriction" },
    ],
    diagnosisThreshold: 2,
    repair: "Repair the confirmed fan, control, wiring, or airflow fault using the vehicle-specific service procedure.",
    verification: ["Bring the engine through the original low-speed operating condition.", "Verify commanded and actual fan operation.", "Confirm stable coolant temperature, fluid level, and no leaks after cool-down."],
    repairChoices: [
      { id: "repair-fan-path", label: "Repair the confirmed fan, control, wiring, or airflow fault identified by the command-versus-operation evidence.", feedback: "This repair follows the evidence that fan response failed under the condition that produced overheating.", correct: true },
      { id: "replace-thermostat", label: "Replace the thermostat because overheating can be caused by restricted coolant flow.", feedback: "That is a possible cause in general, but the case evidence showed consistent circulation and an airflow-dependent temperature change.", correct: false, verificationFailureEvidence: "At low road speed the engine still overheats. Fan command is present, but actual fan operation still does not match the command." },
      { id: "replace-radiator", label: "Replace the radiator without evidence of abnormal heat-transfer distribution or restriction.", feedback: "The measured pattern did not support radiator restriction, so replacement is not evidence-based.", correct: false, verificationFailureEvidence: "The new radiator does not change the low-speed complaint. Commanded fan operation is still absent at the fan." },
      { id: "top-off-only", label: "Top off the coolant and return the vehicle because the system held pressure during the cold test.", feedback: "Pressure retention ruled out a simple leak; it did not correct the confirmed fan/airflow fault.", correct: false, verificationFailureEvidence: "Coolant level remains correct, but temperature again rises at low speed while commanded fan operation is not achieved." },
    ],
    verificationChoices: [
      { id: "repeat-low-speed", label: "Reproduce the original low-speed operating condition while monitoring coolant temperature.", feedback: "Verification should recreate the condition that originally exposed the fault.", correct: true },
      { id: "command-fan", label: "Verify commanded fan state matches actual fan operation through the required operating range.", feedback: "This directly proves the repaired fan/control path responds correctly.", correct: true },
      { id: "cooldown-check", label: "After cool-down, confirm coolant level and inspect for leaks or disturbed connections.", feedback: "This closes the loop safely after the thermal test.", correct: true },
      { id: "idle-briefly", label: "Idle the engine briefly and close the repair order if the gauge does not immediately rise.", feedback: "A brief idle does not adequately reproduce or measure the original low-speed overheating condition.", correct: false },
    ],
    tests: [
      {
        id: "cold-pressure",
        label: "With the engine cool, inspect coolant condition and pressure-test the system and cap to the specified procedure",
        outcomes: {
          "fan-airflow": outcome("The cold system retains the specified test pressure and no external leak is found.", "Pressure retention makes a simple leak/pressure-loss explanation less likely.", { "fan-airflow": "plausible", "thermostat-flow": "plausible", "pressure-loss": "ruled-out", "radiator-restriction": "plausible" }),
          "thermostat-flow": outcome("The cold system retains the specified test pressure and no external leak is found.", "The concern remains a circulation or heat-rejection problem.", { "fan-airflow": "plausible", "thermostat-flow": "supported", "pressure-loss": "ruled-out", "radiator-restriction": "plausible" }),
          "pressure-loss": outcome("The system does not retain the specified test pressure and evidence of coolant loss appears.", "A pressure-retention fault is now supported and should be localized before further hot testing.", { "fan-airflow": "less-likely", "thermostat-flow": "less-likely", "pressure-loss": "supported", "radiator-restriction": "less-likely" }),
          "radiator-restriction": outcome("The cold system retains the specified test pressure and no external leak is found.", "Pressure retention does not test radiator heat-transfer efficiency.", { "fan-airflow": "plausible", "thermostat-flow": "plausible", "pressure-loss": "ruled-out", "radiator-restriction": "supported" }),
        },
      },
      {
        id: "fan-operation",
        label: "Compare scan-tool fan command with actual fan operation at the specified temperature or commanded test",
        outcomes: {
          "fan-airflow": outcome("Fan operation does not match the commanded state during the condition that produces overheating.", "The command/response mismatch directly supports a fan, circuit, or airflow fault.", { "fan-airflow": "supported", "thermostat-flow": "less-likely", "pressure-loss": "less-likely", "radiator-restriction": "less-likely" }),
          "thermostat-flow": outcome("Fan command and actual fan operation agree.", "Correct fan response reduces the likelihood that low-speed airflow is causing the temperature rise.", { "fan-airflow": "ruled-out", "thermostat-flow": "supported", "pressure-loss": "plausible", "radiator-restriction": "plausible" }),
          "pressure-loss": outcome("Fan command and actual fan operation agree.", "The fan responds correctly, so the pressure-loss evidence remains the stronger lead.", { "fan-airflow": "ruled-out", "thermostat-flow": "plausible", "pressure-loss": "supported", "radiator-restriction": "plausible" }),
          "radiator-restriction": outcome("Fan command and actual fan operation agree.", "Correct fan operation shifts attention toward coolant flow and heat transfer.", { "fan-airflow": "ruled-out", "thermostat-flow": "plausible", "pressure-loss": "plausible", "radiator-restriction": "supported" }),
        },
      },
      {
        id: "temperature-pattern",
        label: "Measure cooling-circuit temperature behavior at the service-information checkpoints",
        outcomes: {
          "fan-airflow": outcome("Temperature behavior improves when adequate airflow is supplied while coolant circulation remains consistent.", "The airflow-dependent change reinforces the fan/airflow diagnosis.", { "fan-airflow": "supported", "thermostat-flow": "ruled-out", "pressure-loss": "less-likely", "radiator-restriction": "less-likely" }),
          "thermostat-flow": outcome("The temperature pattern indicates delayed or restricted coolant circulation across the thermostat path.", "The measured pattern supports a thermostat/flow problem.", { "fan-airflow": "ruled-out", "thermostat-flow": "supported", "pressure-loss": "less-likely", "radiator-restriction": "less-likely" }),
          "pressure-loss": outcome("Temperature behavior is inconsistent as coolant is lost and system pressure cannot be maintained.", "The thermal behavior agrees with the already observed pressure-retention fault.", { "fan-airflow": "less-likely", "thermostat-flow": "less-likely", "pressure-loss": "supported", "radiator-restriction": "less-likely" }),
          "radiator-restriction": outcome("The measured radiator temperature pattern shows uneven heat transfer inconsistent with normal flow.", "The temperature distribution supports a radiator restriction or heat-transfer problem.", { "fan-airflow": "ruled-out", "thermostat-flow": "less-likely", "pressure-loss": "less-likely", "radiator-restriction": "supported" }),
        },
      },
    ],
  },
  {
    topicId: "topic-valve-train-synchronization",
    complaint: "After timing-system service, the engine has low power and rough operation. Determine whether the problem is mechanical timing, timing-system control, or a correlation-signal issue.",
    hiddenCauseId: "mechanical-timing",
    causes: [
      { id: "mechanical-timing", label: "Camshaft/crankshaft mechanical timing is incorrect" },
      { id: "tensioner-guide", label: "Timing-chain/belt tensioner or guide condition" },
      { id: "correlation-signal", label: "Cam/crank position signal or correlation circuit fault" },
    ],
    diagnosisThreshold: 2,
    repair: "Correct the mechanical timing alignment using the exact service-information procedure, then inspect the timing components that allowed the misalignment.",
    verification: ["Rotate the engine by hand as required by the service procedure and recheck timing references.", "Confirm cam/crank correlation data after startup.", "Reproduce the original operating condition and verify normal power, idle quality, and warning-indicator status."],
    repairChoices: [
      { id: "correct-timing", label: "Correct the mechanical cam/crank timing using the exact service procedure and inspect the components involved in the misalignment.", feedback: "This addresses the fixed mechanical offset demonstrated by both correlation data and reference inspection.", correct: true },
      { id: "replace-sensors", label: "Replace the camshaft and crankshaft position sensors because a correlation fault was reported.", feedback: "The signals were present and stable. The mechanical references, not the signal source, were misaligned.", correct: false, verificationFailureEvidence: "New sensors produce the same stable but displaced correlation. Mechanical timing references remain out of specification and the low-power complaint remains." },
      { id: "replace-tensioner", label: "Replace only the tensioner even though inspection showed normal tension and a fixed reference misalignment.", feedback: "The evidence ruled out a tension-control problem as the cause of this fixed timing error.", correct: false, verificationFailureEvidence: "Timing-system tension is normal, but the cam/crank references remain misaligned. Rough operation and low power remain." },
      { id: "clear-correlation", label: "Clear the correlation fault and perform a relearn without correcting the mechanical alignment.", feedback: "A relearn cannot correct mechanical timing references that are physically out of position.", correct: false, verificationFailureEvidence: "Correlation returns displaced after startup because the mechanical references were never corrected." },
    ],
    verificationChoices: [
      { id: "hand-rotate", label: "Rotate the engine by hand as required and recheck the mechanical timing references before startup.", feedback: "This is the critical pre-start check after mechanical timing service.", correct: true },
      { id: "correlation-recheck", label: "After startup, confirm cam/crank correlation data is within the vehicle-specific expected relationship.", feedback: "This verifies that the mechanical correction is reflected in operating data.", correct: true },
      { id: "road-condition", label: "Reproduce the original operating condition and verify normal power, idle quality, and warning-indicator status.", feedback: "This confirms the original complaint is actually resolved.", correct: true },
      { id: "codes-only", label: "Close the repair order if no code sets during the first few seconds after startup.", feedback: "A brief code check does not verify mechanical alignment or reproduce the original complaint.", correct: false },
    ],
    tests: [
      {
        id: "correlation-data",
        label: "Review available cam/crank correlation data, codes, and signal behavior before disassembly",
        outcomes: {
          "mechanical-timing": outcome("Correlation is consistently displaced while the position signals remain present and stable.", "Stable signals with persistent displacement support a mechanical synchronization problem.", { "mechanical-timing": "supported", "tensioner-guide": "plausible", "correlation-signal": "less-likely" }),
          "tensioner-guide": outcome("Correlation varies or becomes unstable as operating conditions change, while the signals remain present.", "Changing correlation can result from excessive timing-system movement and warrants mechanical inspection.", { "mechanical-timing": "plausible", "tensioner-guide": "supported", "correlation-signal": "less-likely" }),
          "correlation-signal": outcome("One position signal is intermittent or implausible rather than consistently offset.", "An unstable or missing signal supports an electrical/sensor path before mechanical disassembly.", { "mechanical-timing": "less-likely", "tensioner-guide": "less-likely", "correlation-signal": "supported" }),
        },
      },
      {
        id: "mechanical-references",
        label: "Position the engine by the service procedure and inspect the mechanical timing references",
        outcomes: {
          "mechanical-timing": outcome("The crankshaft and camshaft references do not align as specified.", "Direct mechanical reference inspection supports incorrect valve timing.", { "mechanical-timing": "supported", "tensioner-guide": "plausible", "correlation-signal": "ruled-out" }),
          "tensioner-guide": outcome("Reference position can vary with visible excess slack or abnormal tensioning behavior.", "The mechanical inspection points toward a tension-control problem rather than a fixed installation error.", { "mechanical-timing": "less-likely", "tensioner-guide": "supported", "correlation-signal": "ruled-out" }),
          "correlation-signal": outcome("Mechanical timing references align correctly.", "Correct mechanical alignment makes a signal/circuit explanation more likely when correlation data remains abnormal.", { "mechanical-timing": "ruled-out", "tensioner-guide": "less-likely", "correlation-signal": "supported" }),
        },
      },
      {
        id: "tension-inspection",
        label: "Inspect the timing tensioner, guide/idler, and chain or belt condition using the specified procedure",
        outcomes: {
          "mechanical-timing": outcome("Timing components hold normal tension, but the fixed reference alignment remains incorrect.", "Normal tension with incorrect fixed alignment supports an installation/alignment error.", { "mechanical-timing": "supported", "tensioner-guide": "ruled-out", "correlation-signal": "ruled-out" }),
          "tensioner-guide": outcome("The tensioner or guide cannot maintain the specified timing-system control.", "The component condition explains the changing mechanical relationship.", { "mechanical-timing": "less-likely", "tensioner-guide": "supported", "correlation-signal": "ruled-out" }),
          "correlation-signal": outcome("Mechanical timing components and tension are normal.", "Normal mechanical inspection reinforces the need to diagnose the signal/circuit path.", { "mechanical-timing": "ruled-out", "tensioner-guide": "ruled-out", "correlation-signal": "supported" }),
        },
      },
    ],
  },
];

export function a1BranchingScenarioFor(topicId: string): A1BranchingScenario | undefined {
  return a1BranchingScenarios.find((scenario) => scenario.topicId === topicId);
}
