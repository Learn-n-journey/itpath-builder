/**
 * Dedicated A1 Engine Repair practical profiles.
 *
 * These profiles make AUTO PATH practice specific to the system being studied.
 * They deliberately avoid universal numeric specifications: actual limits,
 * procedures, fastener torque and fluid requirements must come from the
 * service information for the vehicle being serviced.
 */
export interface A1IdentificationPart {
  name: string;
  clue: string;
  function: string;
}

export interface A1PracticalProfile {
  topicId: string;
  identify: A1IdentificationPart[];
  tools: string[];
  testPlan: string[];
  repairDecision: string;
  verification: string[];
}

const profile = (
  slug: string,
  identify: A1IdentificationPart[],
  tools: string[],
  testPlan: string[],
  repairDecision: string,
  verification: string[],
): A1PracticalProfile => ({
  topicId: `topic-${slug}`,
  identify,
  tools,
  testPlan,
  repairDecision,
  verification,
});

export const a1PracticalProfiles: A1PracticalProfile[] = [
  profile(
    "engine-mechanical-foundations",
    [
      { name: "Cylinder", clue: "The bore in the block where the piston travels.", function: "Guides piston travel and helps form the sealed combustion space." },
      { name: "Piston and rings", clue: "The moving assembly that receives combustion force inside the cylinder.", function: "Transfers combustion force to the connecting rod while the rings seal gases and control oil." },
      { name: "Valve train", clue: "The parts that open and close the intake and exhaust paths.", function: "Controls cylinder breathing in time with crankshaft position." },
      { name: "Crankshaft", clue: "The rotating shaft connected to the pistons through connecting rods.", function: "Converts reciprocating piston motion into rotary output." },
      { name: "Head gasket", clue: "The sealing layer between the cylinder head and block.", function: "Seals combustion, coolant, and oil passages between the head and block." },
    ],
    ["Manufacturer service information", "Compression gauge", "Cylinder leak-down tester", "Basic hand tools"],
    [
      "Verify the complaint and check service history before disturbing the engine.",
      "Perform a visual inspection and confirm oil and coolant condition.",
      "Run a compression test using the vehicle-specific procedure and compare cylinders with the published specification.",
      "If compression is abnormal, use a cylinder leak-down test to localize where sealing is being lost.",
      "Correlate the measurements with noise, smoke, fluid condition, and other evidence before condemning an internal part.",
    ],
    "Choose repair only after the measurements isolate a mechanical sealing or internal-engine fault; do not replace parts from a symptom alone.",
    ["Repeat the failed mechanical test.", "Recreate the original operating condition.", "Check for leaks, abnormal noise, warning indicators, and fluid-level changes."],
  ),
  profile(
    "cylinder-head-valve-train",
    [
      { name: "Cylinder head", clue: "The upper engine casting containing combustion chambers and valve passages.", function: "Closes the top of the cylinders and supports the valve train and gas passages." },
      { name: "Intake valve", clue: "The valve controlling incoming air or air-fuel charge.", function: "Opens at the required time to let the cylinder fill." },
      { name: "Exhaust valve", clue: "The valve controlling the path from the cylinder to the exhaust.", function: "Opens at the required time to let burned gases leave." },
      { name: "Valve spring", clue: "The spring surrounding a valve stem.", function: "Returns the valve to its seat and helps keep the valve train following the cam profile." },
      { name: "Camshaft", clue: "The shaft with lobes that command valve movement.", function: "Controls valve lift and timing through the valve train." },
    ],
    ["Manufacturer service information", "Straightedge and feeler gauges", "Micrometer or dial indicator as specified", "Valve spring tester when required"],
    [
      "Inspect the head and valve train for visible damage, wear, deposits, lubrication problems, and evidence of overheating.",
      "Check head flatness and relevant valve-train dimensions against the vehicle-specific service limits.",
      "Inspect valve faces, seats, stems, guides, springs, followers, and cam surfaces using the specified procedure.",
      "Use compression or leak-down evidence when needed to distinguish valve sealing from ring or gasket leakage.",
      "Record each measurement before deciding whether a component is reusable, serviceable, or requires replacement or machining.",
    ],
    "Base the service decision on measured wear and the manufacturer's reusable/service limits, not appearance alone.",
    ["Repeat the sealing or dimensional check that identified the fault.", "Confirm correct valve-train operation.", "Run the engine and verify the original symptom and abnormal noise are gone."],
  ),
  profile(
    "engine-block-internal-wear",
    [
      { name: "Cylinder bore", clue: "The machined surface the piston and rings travel against.", function: "Provides the running and sealing surface for the piston assembly." },
      { name: "Piston", clue: "The reciprocating component fitted inside a cylinder bore.", function: "Receives combustion pressure and transfers force through the connecting rod." },
      { name: "Piston rings", clue: "Split rings fitted in grooves around the piston.", function: "Seal combustion pressure, transfer heat, and control oil on the cylinder wall." },
      { name: "Connecting rod", clue: "The link between a piston and a crankshaft journal.", function: "Transfers force between the piston and crankshaft." },
      { name: "Main and rod bearings", clue: "Replaceable bearing surfaces supporting crankshaft journals.", function: "Maintain an oil-film-supported running surface and correct clearances." },
    ],
    ["Manufacturer service information", "Outside micrometer", "Dial bore gauge", "Plastigage or specified clearance-measurement method", "Precision cleaning tools"],
    [
      "Clean the components before precision measurement so debris does not distort the result.",
      "Measure bores and journals at the locations and directions specified by service information.",
      "Calculate or verify taper, out-of-round, and running clearances against the published limits.",
      "Inspect pistons, rings, bearing surfaces, and crankshaft journals for wear patterns that support the measurements.",
      "Decide whether the component is reusable, can be machined, or requires replacement only after comparing all measurements with service limits.",
    ],
    "Match the repair to measured wear: reuse, machine, or replace according to the service limits and available repair sizes.",
    ["Recheck critical clearances during assembly.", "Verify free rotation and correct assembly before startup.", "After startup, verify oil pressure, leaks, noise, and the original complaint."],
  ),
  profile(
    "lubrication-cooling-systems",
    [
      { name: "Oil pump", clue: "The pump that circulates lubricant through engine oil passages.", function: "Creates oil flow so bearings and other moving parts receive lubrication." },
      { name: "Oil pressure regulating valve", clue: "A valve used to control excessive lubrication-system pressure.", function: "Limits or regulates pressure according to system design." },
      { name: "Water pump", clue: "The pump circulating coolant through the engine and heat exchangers.", function: "Maintains coolant flow through the thermal-management circuit." },
      { name: "Thermostat", clue: "A temperature-responsive valve in the coolant circuit.", function: "Controls coolant routing to help the engine reach and maintain operating temperature." },
      { name: "Radiator", clue: "The front heat exchanger carrying engine coolant through small passages.", function: "Transfers heat from coolant to airflow." },
    ],
    ["Manufacturer service information", "Mechanical oil-pressure gauge when specified", "Cooling-system pressure tester", "Thermometer or scan data", "Cooling-system vacuum-fill or bleeding equipment when specified"],
    [
      "Verify fluid level, condition, correct fluid type, leaks, and obvious restrictions before deeper testing.",
      "Measure lubrication pressure or cooling-system pressure/temperature using the vehicle-specific procedure.",
      "Compare measured behavior with the published specification at the required operating conditions.",
      "For overheating, separate airflow, coolant-flow, pressure-retention, thermostat, pump, and combustion-leak possibilities with targeted tests.",
      "For lubrication concerns, separate oil level/condition, pickup restriction, pump/regulator, bearing-clearance, and sender/display faults before repair.",
    ],
    "Repair the isolated cause and correct any fluid contamination or secondary damage identified during testing.",
    ["Repeat the pressure or temperature test.", "Bring the engine through the operating conditions that originally produced the complaint.", "Verify stable fluid level, no leaks, normal warning-indicator behavior, and correct heater/cooling operation."],
  ),
  profile(
    "engine-external-performance-assessment",
    [
      { name: "Drive belt", clue: "The external belt driving one or more engine accessories.", function: "Transfers crankshaft rotation to belt-driven accessories." },
      { name: "Engine mount", clue: "The support isolating the powertrain from the vehicle structure.", function: "Supports the powertrain while controlling movement and vibration." },
      { name: "Intake manifold", clue: "The passage assembly distributing incoming air to the cylinders.", function: "Routes intake air to each cylinder and provides sealed intake paths." },
      { name: "Exhaust manifold", clue: "The passage assembly collecting exhaust from the cylinders.", function: "Routes exhaust gases from the cylinder head into the exhaust system." },
      { name: "Crankcase ventilation path", clue: "The system routing crankcase vapors back into the intake.", function: "Controls crankcase pressure and routes vapors for combustion." },
    ],
    ["Manufacturer service information", "Inspection light", "Vacuum or smoke-testing equipment when appropriate", "Scan tool when applicable"],
    [
      "Confirm the complaint and inspect belts, mounts, hoses, intake connections, exhaust joints, and crankcase ventilation components.",
      "Look for leaks, looseness, misrouting, deterioration, interference, and evidence of recent work.",
      "Use an appropriate leak or functional test when a visual inspection cannot confirm the condition.",
      "Compare observed engine movement, airflow behavior, or scan evidence with a known-good condition and service information.",
      "Do not attribute an internal-engine symptom to an external component until the evidence separates the two.",
    ],
    "Correct the confirmed external mechanical fault and any related routing, sealing, or mounting problem.",
    ["Repeat the inspection or leak test.", "Recreate the original load or operating condition.", "Verify no abnormal movement, leakage, noise, or warning indication remains."],
  ),
  profile(
    "advanced-internal-mechanical-diagnosis",
    [
      { name: "Combustion chamber", clue: "The sealed space where the compressed charge burns.", function: "Contains combustion pressure so it can act on the piston." },
      { name: "Valve sealing surface", clue: "The contact area between a valve face and its seat.", function: "Seals the cylinder when the valve is closed." },
      { name: "Piston-ring seal", clue: "The sealing interface between piston rings and the cylinder wall.", function: "Limits combustion leakage into the crankcase." },
      { name: "Head-gasket fire ring", clue: "The gasket area surrounding the cylinder opening.", function: "Helps contain combustion pressure between the head and block." },
      { name: "Crankcase", clue: "The lower engine space around the crankshaft and underside of the pistons.", function: "Contains the rotating assembly and receives gases that pass the piston rings." },
    ],
    ["Manufacturer service information", "Compression gauge", "Cylinder leak-down tester", "Vacuum gauge when applicable", "Borescope when appropriate"],
    [
      "Verify the symptom and first rule out basic external, ignition, fuel, and control problems that can imitate mechanical faults.",
      "Compare cylinder compression using the specified test conditions.",
      "Use leak-down testing to determine whether leakage is occurring through intake valves, exhaust valves, rings, or an adjacent sealing path.",
      "Use vacuum, borescope, noise, or fluid evidence only as supporting evidence and correlate it with the primary mechanical tests.",
      "State what each result proves and what it does not prove before choosing a repair.",
    ],
    "Open or replace internal components only when multiple pieces of evidence localize the mechanical fault.",
    ["Repeat compression/leak-down or the decisive test.", "Verify smooth operation under the original complaint conditions.", "Confirm no new leaks, noises, smoke, or fluid cross-contamination."],
  ),
  profile(
    "precision-measurement-and-machining",
    [
      { name: "Outside micrometer", clue: "A precision tool that measures an outside diameter.", function: "Measures journals, pistons, stems, and other outside dimensions accurately." },
      { name: "Dial bore gauge", clue: "A comparative gauge used inside a cylinder or bearing bore.", function: "Measures bore size variation, taper, and out-of-round relative to a reference." },
      { name: "Straightedge", clue: "A precision reference placed across a machined surface.", function: "Helps reveal distortion when used with the specified checking method." },
      { name: "Feeler gauge", clue: "Thin calibrated blades used to measure a small gap.", function: "Checks clearances and gaps where the service procedure calls for it." },
      { name: "Dial indicator", clue: "A gauge that shows very small movement from a reference position.", function: "Measures runout, end play, lift, or other displacement depending on setup." },
    ],
    ["Manufacturer service information", "Micrometer", "Dial bore gauge", "Dial indicator", "Straightedge and feeler gauges"],
    [
      "Clean the part and measuring surfaces and verify the measuring tool is suitable for the required range and resolution.",
      "Zero or reference the tool according to its procedure before taking the measurement.",
      "Measure at every location and direction required by service information rather than relying on one point.",
      "Record the readings before calculating clearance, taper, out-of-round, runout, or other required comparison.",
      "Compare the result with the vehicle/component service limit and account for available machining or repair sizes.",
    ],
    "Machine or replace only when measured dimensions fall outside the applicable service limit or the repair procedure specifically requires it.",
    ["Re-measure the machined or replacement component.", "Verify final assembly clearances before operation.", "Document the final measurements used to approve the repair."],
  ),
  profile(
    "cooling-system-performance-validation",
    [
      { name: "Pressure cap", clue: "The calibrated cap sealing a pressurized cooling circuit.", function: "Maintains the designed system pressure and provides pressure/vacuum control according to system design." },
      { name: "Cooling fan", clue: "The electrically or mechanically driven fan moving air through the heat exchangers.", function: "Provides airflow when vehicle speed alone is insufficient." },
      { name: "Coolant temperature sensor", clue: "The sensor reporting coolant temperature to the control system.", function: "Provides temperature information used for engine and fan-control decisions." },
      { name: "Thermostat", clue: "The temperature-controlled coolant valve.", function: "Changes coolant routing as the engine warms." },
      { name: "Radiator", clue: "The primary coolant-to-air heat exchanger.", function: "Rejects engine heat to passing air." },
    ],
    ["Manufacturer service information", "Cooling-system pressure tester", "Scan tool", "Infrared thermometer or contact temperature tool as appropriate", "Combustion-leak test equipment when justified"],
    [
      "Verify coolant level and condition only when the system can be checked safely.",
      "Pressure-test the system and cap using the specified procedure when leakage or pressure retention is in question.",
      "Observe coolant temperature data and fan command/operation through the warm-up cycle.",
      "Compare inlet/outlet or circuit temperature behavior when investigating flow or heat-transfer concerns.",
      "Use a combustion-gas test or mechanical-engine test when evidence points toward combustion entering the cooling system.",
    ],
    "Repair the component or sealing fault demonstrated by the test sequence rather than replacing the thermostat, pump, or radiator by assumption.",
    ["Repeat the pressure test if leakage was involved.", "Complete a controlled warm-up and verify fan/thermostat behavior.", "Recheck coolant level after the specified bleed/cool-down procedure and confirm the original overheating complaint is gone."],
  ),
  profile(
    "valve-train-synchronization",
    [
      { name: "Crankshaft timing reference", clue: "The crankshaft position mark or reference used during mechanical timing.", function: "Provides the crankshaft reference for synchronizing piston and valve position." },
      { name: "Camshaft timing reference", clue: "The camshaft mark or reference aligned during timing service.", function: "Provides the valve-event reference relative to crankshaft position." },
      { name: "Timing chain or belt", clue: "The flexible drive linking crankshaft rotation to one or more camshafts.", function: "Maintains the designed rotational relationship between crankshaft and camshaft." },
      { name: "Tensioner", clue: "The device maintaining controlled tension in the timing drive.", function: "Controls slack so timing remains stable." },
      { name: "Guide or idler", clue: "The surface or pulley controlling the timing drive path.", function: "Supports and guides the belt or chain along its designed path." },
    ],
    ["Manufacturer service information", "Specified timing/locking tools", "Hand tools", "Scan tool when cam/crank correlation data are applicable"],
    [
      "Verify the complaint and check for timing-related codes, noise, or mechanical symptoms without assuming a slipped timing drive.",
      "Rotate and position the engine only according to the vehicle-specific procedure, especially on interference engines.",
      "Check mechanical timing references and tensioner/guide condition using the specified service procedure.",
      "Where supported, compare mechanical findings with cam/crank correlation evidence from the control system.",
      "After service, rotate the engine by hand as required and recheck timing references before attempting to start it.",
    ],
    "Correct the timing-drive or valve-train fault using the specified alignment procedure and required one-time-use parts or tensioning steps.",
    ["Recheck mechanical timing references.", "Verify cam/crank correlation where applicable.", "Start and operate the engine only after safe mechanical checks, then confirm the original noise/performance complaint is gone."],
  ),
  profile(
    "fuel-delivery-exhaust-backpressure",
    [
      { name: "Fuel delivery path", clue: "The components carrying fuel from supply to the engine.", function: "Provides fuel at the pressure and flow required by the engine-management system." },
      { name: "Fuel injector", clue: "The electronically controlled device metering fuel into the intake or cylinder.", function: "Meters fuel when commanded by the control system." },
      { name: "Intake air path", clue: "The ducting and manifold path carrying air into the engine.", function: "Supplies measured or modeled airflow to the cylinders." },
      { name: "Catalytic converter", clue: "The exhaust aftertreatment unit in the exhaust stream.", function: "Promotes chemical reactions that reduce regulated exhaust pollutants." },
      { name: "Exhaust restriction point", clue: "A damaged or obstructed section that can limit exhaust flow.", function: "When restricted, it creates excessive backpressure and can reduce engine breathing and power." },
    ],
    ["Manufacturer service information", "Scan tool", "Fuel-pressure/volume test equipment appropriate to the system", "Exhaust backpressure or vacuum-testing equipment when specified"],
    [
      "Verify the complaint and inspect the intake, fuel, and exhaust paths for obvious damage, leakage, restriction, or recent work.",
      "Use scan data to determine whether fuel-control evidence supports a delivery, airflow, or exhaust-flow problem.",
      "Measure fuel pressure/volume only with equipment and procedures appropriate to the vehicle's fuel system.",
      "Test for exhaust restriction using the manufacturer's recommended method when symptoms and earlier evidence justify it.",
      "Separate a mechanical breathing restriction from ignition, fuel-control, and internal-engine faults before repair.",
    ],
    "Repair the measured delivery or flow fault; do not condemn a pump, injector, or converter from a code or symptom alone.",
    ["Repeat the failed pressure/flow/backpressure test.", "Verify fuel-control data under the original operating condition.", "Confirm restored performance with no leaks, warning indicators, or recurrence."],
  ),
  profile(
    "engine-block-reconditioning-practices",
    [
      { name: "Deck surface", clue: "The machined block surface that mates with the cylinder head.", function: "Provides the sealing surface for the head gasket and cylinder head." },
      { name: "Main bearing bore", clue: "The aligned block bores supporting the crankshaft main bearings.", function: "Locates and supports the crankshaft through its main bearings." },
      { name: "Cylinder bore", clue: "The machined cylinder surface in the block.", function: "Guides the piston and provides the ring sealing surface." },
      { name: "Threaded fastener hole", clue: "A threaded block feature used to clamp a component.", function: "Provides the designed clamping attachment when threads and fasteners are serviceable." },
      { name: "Oil and coolant passages", clue: "Internal galleries and passages cast or machined through the block.", function: "Route lubricant and coolant to the areas that require them." },
    ],
    ["Manufacturer service information", "Precision measuring tools", "Thread inspection tools", "Cleaning equipment appropriate to the component", "Machining equipment operated by qualified personnel when required"],
    [
      "Clean the block enough to inspect sealing surfaces, bores, threads, passages, and damage without hiding defects.",
      "Inspect for cracks or damage using the method appropriate to the material and service procedure.",
      "Measure deck, bore, and bearing-related dimensions at the specified locations.",
      "Compare all measurements with service limits and available oversize/undersize repair options.",
      "After machining or repair, clean passages and re-measure the critical dimensions before assembly.",
    ],
    "Approve reconditioning only when the block can be restored within the published service limits; otherwise replace it.",
    ["Document post-machining dimensions.", "Verify passages and threaded features are clean and serviceable.", "During assembly, confirm the final clearances derived from the reconditioned dimensions."],
  ),
  profile(
    "complete-engine-mechanical-integration",
    [
      { name: "Short block", clue: "The assembled block, crankshaft, rods, pistons, and related lower-engine parts.", function: "Provides the rotating/reciprocating mechanical core of the engine." },
      { name: "Cylinder-head assembly", clue: "The head, valves, valve train, and related upper-engine components.", function: "Seals the cylinders and controls intake/exhaust gas exchange." },
      { name: "Timing system", clue: "The drive synchronizing crankshaft and camshaft movement.", function: "Keeps piston position and valve events correctly related." },
      { name: "Lubrication circuit", clue: "The pump, pickup, galleries, bearings, and return paths carrying engine oil.", function: "Supplies and returns lubricant through the assembled engine." },
      { name: "Cooling circuit", clue: "The passages, pump, thermostat, radiator, and hoses managing engine heat.", function: "Moves and rejects heat so engine temperature remains controlled." },
    ],
    ["Manufacturer service information", "Assembly and measuring tools specified for the engine", "Priming equipment where required", "Scan tool", "Leak/pressure test equipment as appropriate"],
    [
      "Review all recorded measurements and repair decisions before final assembly.",
      "Verify critical clearances, timing, sealing surfaces, fluid paths, and fastener procedures as the engine is assembled.",
      "Prime lubrication or other systems when the service procedure requires it before initial startup.",
      "On initial operation, immediately verify lubrication, leaks, abnormal noise, temperature behavior, and warning indicators.",
      "Complete the required functional or road test and compare final measurements with the original complaint and baseline evidence.",
    ],
    "Treat final assembly as a chain of verified measurements and procedures; stop if any prerequisite measurement or setup cannot be confirmed.",
    ["Repeat the original diagnostic test.", "Verify oil and cooling-system behavior through the required operating range.", "Recheck leaks and fluid levels after the specified run/cool-down cycle.", "Document the final result and evidence that the original complaint is resolved."],
  ),
];

export function a1PracticalProfileFor(topicId: string): A1PracticalProfile | undefined {
  return a1PracticalProfiles.find((item) => item.topicId === topicId);
}
