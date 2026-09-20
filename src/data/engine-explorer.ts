export interface AutoPart {
  id: string;
  /** Marker position as percentages of the photo box. */
  x: number;
  y: number;
  name: string;
  whatItIs: string;
  whatItDoes: string;
  shopNote: string;
}

export interface AutoAssembly {
  id: string;
  name: string;
  tagline: string;
  parts: AutoPart[];
}

export const autoAssemblies: AutoAssembly[] = [
  {
    id: "engine-bay",
    name: "Engine bay",
    tagline: "What you see when the hood comes up, and what each item is for.",
    parts: [
      {
        id: "engine-cover",
        x: 40,
        y: 33,
        name: "Engine cover",
        whatItIs:
          "The moulded plastic lid sitting on top of the engine, usually held on by rubber grommets that pop off by hand.",
        whatItDoes:
          "It muffles injector and valvetrain noise and keeps dirt off the top of the engine. Nothing under it needs the cover to run.",
        shopNote:
          "Pull it first on almost any top-end job. The ignition coils, injectors and oil filler usually sit directly underneath.",
      },
      {
        id: "oil-filler",
        x: 55,
        y: 29,
        name: "Oil filler cap",
        whatItIs:
          "The screw or quarter-turn cap on the valve cover, normally marked with an oil can symbol.",
        whatItDoes: "It is where fresh engine oil goes in during a service or a top-up.",
        shopNote:
          "A thick cream-coloured deposit under this cap points toward coolant mixing with oil, so check the cooling system before assuming it is only condensation.",
      },
      {
        id: "coolant-reservoir",
        x: 9,
        y: 33,
        name: "Coolant reservoir",
        whatItIs:
          "The translucent plastic bottle with MIN and MAX marks, connected to the radiator or engine by a small hose.",
        whatItDoes:
          "It holds the coolant that expands out of the system when hot and lets it get drawn back in as the engine cools.",
        shopNote:
          "Check the level cold. Reading a hot system gives a high level and a hot cap can release scalding coolant.",
      },
      {
        id: "washer-bottle",
        x: 7,
        y: 62,
        name: "Washer fluid reservoir",
        whatItIs: "A separate plastic tank with a blue cap, feeding the windshield washer pump.",
        whatItDoes: "It stores the washer fluid sprayed onto the glass.",
        shopNote:
          "Easy to confuse with the coolant bottle in a hurry. Washer fluid in the cooling system means a full flush.",
      },
      {
        id: "brake-master",
        x: 75,
        y: 20,
        name: "Brake master cylinder and reservoir",
        whatItIs:
          "A small translucent reservoir on top of a cylinder bolted to the firewall, behind the brake booster.",
        whatItDoes:
          "It turns pedal pressure into hydraulic pressure and sends it out to the brakes at each wheel.",
        shopNote:
          "The level drops slowly as pads wear. A sudden drop means a leak in the hydraulic system, which is a safety fault, not a top-up.",
      },
      {
        id: "battery",
        x: 88,
        y: 36,
        name: "Battery",
        whatItIs:
          "The heavy black box with two posts, clamped down in a tray at one corner of the bay.",
        whatItDoes:
          "It supplies the current to crank the starter and steadies system voltage while the engine runs.",
        shopNote:
          "Disconnect the negative clamp first and reconnect it last, so a slipping wrench cannot short the positive post to the body.",
      },
      {
        id: "air-box",
        x: 84,
        y: 57,
        name: "Air filter housing",
        whatItIs:
          "The large black plastic box with clips or screws, holding the engine air filter inside.",
        whatItDoes:
          "It filters the air entering the engine and quietens intake noise before the air reaches the throttle.",
        shopNote:
          "The mass airflow sensor usually sits in the duct just after this box, so a badly reseated lid can cause unmetered air and a lean running fault.",
      },
      {
        id: "intake-duct",
        x: 68,
        y: 50,
        name: "Intake duct",
        whatItIs:
          "The wide corrugated hose running from the air box to the throttle body on the engine.",
        whatItDoes: "It carries the filtered air into the engine.",
        shopNote:
          "Split the underside of this hose and air sneaks in after the sensor. Flex it by hand with the engine idling and listen for the note to change.",
      },
      {
        id: "alternator-bay",
        x: 25,
        y: 58,
        name: "Alternator",
        whatItIs:
          "The pulley-driven unit low on the front of the engine, turned by the serpentine belt.",
        whatItDoes: "It charges the battery and powers the electrics once the engine is running.",
        shopNote:
          "Charging faults and belt faults look alike from the driver's seat. Measure voltage at the battery with the engine running before condemning either.",
      },
      {
        id: "radiator-bay",
        x: 45,
        y: 82,
        name: "Radiator",
        whatItIs: "The wide finned core across the front of the bay, behind the bumper opening.",
        whatItDoes: "It sheds engine heat into the air passing through its fins.",
        shopNote:
          "Bent or packed fins cut airflow. Overheating only at low speed points at airflow or the cooling fan, not the coolant itself.",
      },
    ],
  },
  {
    id: "engine-cutaway",
    name: "Inside the engine",
    tagline: "A sectioned four-cylinder engine with the moving parts exposed.",
    parts: [
      {
        id: "camshaft",
        x: 50,
        y: 9,
        name: "Camshaft",
        whatItIs: "The long shaft across the top of the head with an egg-shaped lobe per valve.",
        whatItDoes:
          "As it turns, each lobe pushes its valve open at the right point in the cycle, then the spring closes it again.",
        shopNote:
          "It runs at half crankshaft speed, because each cylinder only fires once every two crank revolutions.",
      },
      {
        id: "valves",
        x: 44,
        y: 18,
        name: "Valves and springs",
        whatItIs: "Mushroom-shaped valves held shut by coil springs, two or more per cylinder.",
        whatItDoes:
          "Intake valves let the air and fuel charge in, exhaust valves let burnt gases out, and both seal the chamber while the charge burns.",
        shopNote:
          "A valve that cannot fully seat loses compression on that cylinder, which shows as a steady misfire that does not move when you swap coils.",
      },
      {
        id: "spark-plug-chamber",
        x: 33,
        y: 21,
        name: "Spark plug in the chamber",
        whatItIs:
          "The plug screwed through the head so its electrodes sit inside the combustion chamber.",
        whatItDoes: "It fires the spark that lights the compressed charge.",
        shopNote:
          "Its position at the top of the chamber is why the plug tip tells you so much about how that cylinder has been running.",
      },
      {
        id: "piston",
        x: 44,
        y: 35,
        name: "Piston and rings",
        whatItIs: "The cylindrical slug in each bore, with thin rings in grooves near its crown.",
        whatItDoes:
          "It compresses the charge, then takes the push of the burn. The rings seal combustion pressure in and scrape oil off the bore wall.",
        shopNote:
          "Worn rings let oil into the chamber and pressure into the crankcase. A wet compression test that jumps sharply points at rings rather than valves.",
      },
      {
        id: "con-rod",
        x: 47,
        y: 47,
        name: "Connecting rod",
        whatItIs: "The forged link between the piston pin and a crankshaft journal.",
        whatItDoes: "It passes the force of combustion down to the crankshaft.",
        shopNote:
          "Its big end rides on a plain bearing fed by oil pressure. Lose that oil film and you get the deep knock of a spun bearing.",
      },
      {
        id: "crankshaft",
        x: 50,
        y: 57,
        name: "Crankshaft",
        whatItIs:
          "The heavy offset shaft running the length of the block, with counterweights between throws.",
        whatItDoes:
          "It converts the up and down movement of the pistons into rotation that drives the transmission.",
        shopNote:
          "The crank position sensor reads a toothed wheel on this shaft. Lose that signal and the engine cranks but will not start.",
      },
      {
        id: "timing-chain",
        x: 17,
        y: 35,
        name: "Timing chain",
        whatItIs: "The chain at the front of the engine linking the crankshaft to the camshaft.",
        whatItDoes: "It keeps valve movement in step with piston movement.",
        shopNote:
          "A stretched chain retards cam timing and often sets a correlation code before it ever rattles loudly enough to notice.",
      },
      {
        id: "oil-pan",
        x: 50,
        y: 85,
        name: "Oil pan",
        whatItIs: "The stamped or cast sump bolted to the bottom of the block.",
        whatItDoes: "It holds the engine oil between trips around the engine.",
        shopNote:
          "The drain plug lives here, and its sealing washer is a one-use item on many engines.",
      },
      {
        id: "oil-pickup",
        x: 40,
        y: 88,
        name: "Oil pickup and strainer",
        whatItIs: "The mesh-covered tube reaching down into the oil in the pan.",
        whatItDoes: "It is where the oil pump draws oil from before sending it through the engine.",
        shopNote:
          "Sludge blocking this screen starves the engine even with a full dipstick, so low pressure with clean oil level is worth a pan drop.",
      },
      {
        id: "flywheel",
        x: 90,
        y: 57,
        name: "Flywheel or flexplate",
        whatItIs: "The large toothed disc bolted to the rear of the crankshaft.",
        whatItDoes:
          "It smooths out the pulses between power strokes and gives the starter pinion teeth to engage.",
        shopNote:
          "Chewed teeth on one part of the ring gear cause a starter that only grinds when the engine stops in that position.",
      },
    ],
  },
  {
    id: "alternator",
    name: "Alternator",
    tagline: "The charging system's generator, driven by the belt.",
    parts: [
      {
        id: "alt-pulley",
        x: 25,
        y: 52,
        name: "Drive pulley",
        whatItIs: "The grooved wheel on the front shaft that the serpentine belt wraps around.",
        whatItDoes: "It takes engine rotation through the belt and spins the rotor inside.",
        shopNote:
          "Many are overrunning decoupler pulleys. If it locks in both directions when it should freewheel one way, it can cause belt chirp and tensioner flutter.",
      },
      {
        id: "alt-stator",
        x: 55,
        y: 40,
        name: "Stator windings",
        whatItIs:
          "The copper windings visible through the vents in the middle of the aluminium housing.",
        whatItDoes:
          "The spinning rotor's magnetic field induces alternating current in these windings.",
        shopNote:
          "Because output starts as alternating current, a failed diode leaves ripple on the system that shows up as an unstable voltage reading.",
      },
      {
        id: "alt-regulator",
        x: 85,
        y: 55,
        name: "Regulator and brushes",
        whatItIs: "The rear plastic cover over the voltage regulator, brushes and rectifier diodes.",
        whatItDoes:
          "The rectifier turns the output into direct current and the regulator holds charging voltage in range.",
        shopNote:
          "Worn brushes usually give intermittent charging that comes back after a rev, rather than a dead flat no-charge.",
      },
      {
        id: "alt-bplus",
        x: 87,
        y: 28,
        name: "B+ output stud",
        whatItIs: "The heavy threaded post with a nut, carrying a thick cable to the battery.",
        whatItDoes: "It is the path for all charging current back to the battery and the fuse box.",
        shopNote:
          "This cable is live at all times. Disconnect the battery before touching the nut, and check the stud for heat discolouration from a loose connection.",
      },
      {
        id: "alt-plug",
        x: 77,
        y: 10,
        name: "Control connector",
        whatItIs: "The small plug beside the output stud, with two or three thin wires.",
        whatItDoes:
          "It carries the sense and control signals between the alternator and the engine computer or charge lamp.",
        shopNote:
          "On computer-controlled charging, a fault here can leave the alternator at a fixed default output instead of no output at all.",
      },
      {
        id: "alt-mount",
        x: 60,
        y: 85,
        name: "Mounting ears",
        whatItIs: "The cast lugs with through-holes that bolt the unit to the engine bracket.",
        whatItDoes: "They hold the alternator rigid and in line with the rest of the belt pulleys.",
        shopNote:
          "A cracked ear or worn bushing lets the unit shift under load, which throws pulley alignment and shreds belt edges.",
      },
    ],
  },
  {
    id: "starter",
    name: "Starter motor",
    tagline: "The motor that turns the engine over until it runs on its own.",
    parts: [
      {
        id: "solenoid",
        x: 38,
        y: 17,
        name: "Solenoid",
        whatItIs: "The cylinder mounted on top of the motor, with its own terminals on the end.",
        whatItDoes:
          "When triggered it pushes the drive gear into the ring gear and closes the heavy contacts that feed the motor.",
        shopNote:
          "A single loud click with no spin usually means the solenoid pulled in but the motor did not turn, so test voltage at the motor terminal, not just the trigger.",
      },
      {
        id: "starter-bat-terminal",
        x: 17,
        y: 12,
        name: "Battery terminal stud",
        whatItIs: "The large post carrying the main positive cable straight from the battery.",
        whatItDoes: "It supplies the hundreds of amps the motor draws while cranking.",
        shopNote:
          "Slow cranking with good battery voltage is often voltage drop in this cable or its ground, so measure across the cable while cranking.",
      },
      {
        id: "starter-s-terminal",
        x: 17,
        y: 26,
        name: "S terminal",
        whatItIs: "The small spade or stud beside the big post, with a thin wire.",
        whatItDoes:
          "It carries the low-current signal from the ignition switch or relay that tells the starter to engage.",
        shopNote:
          "No voltage here during cranking moves the fault back to the relay, switch, or a safety interlock such as the clutch or park position.",
      },
      {
        id: "starter-motor-body",
        x: 30,
        y: 58,
        name: "Motor body",
        whatItIs: "The steel drum holding the armature, field magnets and brushes.",
        whatItDoes: "It produces the torque that spins the engine.",
        shopNote:
          "A hot-soak no-crank that frees up when cool is a classic sign of worn brushes or a tired armature inside this housing.",
      },
      {
        id: "starter-housing",
        x: 72,
        y: 55,
        name: "Drive end housing",
        whatItIs: "The cast nose with a flange and bolt holes that mates to the bellhousing.",
        whatItDoes: "It locates the pinion at the correct depth and angle against the ring gear.",
        shopNote:
          "Leaving out a shim or a dowel here causes grinding on engagement even with a brand new starter fitted.",
      },
      {
        id: "pinion",
        x: 93,
        y: 57,
        name: "Pinion gear and drive",
        whatItIs: "The small toothed gear at the nose, on a one-way clutch.",
        whatItDoes:
          "It meshes with the flywheel ring gear to crank the engine, then freewheels so the running engine cannot drive the motor.",
        shopNote:
          "A whirring noise with no cranking usually means the one-way drive is slipping rather than the motor being dead.",
      },
    ],
  },
  {
    id: "radiator",
    name: "Radiator",
    tagline: "Where the engine dumps its heat into passing air.",
    parts: [
      {
        id: "rad-core",
        x: 50,
        y: 45,
        name: "Core and fins",
        whatItIs: "The stack of flat tubes with thin fins soldered or bonded between them.",
        whatItDoes:
          "Coolant flows through the tubes while air passes over the fins and carries the heat away.",
        shopNote:
          "Road debris and bugs packed between the fins cut cooling badly. Check the core with a light behind it before condemning a thermostat.",
      },
      {
        id: "rad-upper-tank",
        x: 55,
        y: 9,
        name: "Upper tank",
        whatItIs: "The moulded plastic tank crimped to the top of the core.",
        whatItDoes: "It spreads hot coolant arriving from the engine across all the core tubes.",
        shopNote:
          "The crimped seam between plastic tank and metal core is a common seep point once the gasket hardens with age.",
      },
      {
        id: "rad-cap",
        x: 62,
        y: 5,
        name: "Pressure cap",
        whatItIs: "The spring-loaded cap on the tank, stamped with a pressure rating.",
        whatItDoes:
          "It holds the system under pressure so the coolant can run above its normal boiling point without boiling.",
        shopNote:
          "A weak cap lets the system boil at a lower temperature, so overflow and hot-day boilover can happen with the gauge reading normal.",
      },
      {
        id: "rad-upper-hose",
        x: 19,
        y: 10,
        name: "Upper hose neck",
        whatItIs: "The stub on the top tank where the upper radiator hose clamps on.",
        whatItDoes: "It is the inlet for hot coolant leaving the engine.",
        shopNote:
          "This hose staying cold while the engine warms up is a strong sign the thermostat has not opened.",
      },
      {
        id: "rad-lower-hose",
        x: 77,
        y: 88,
        name: "Lower hose neck",
        whatItIs: "The stub on the bottom tank for the lower radiator hose.",
        whatItDoes: "It returns cooled coolant to the water pump inlet.",
        shopNote:
          "Because the pump pulls from here, a soft lower hose can collapse at high rpm and cut flow without leaking a drop.",
      },
      {
        id: "rad-overflow",
        x: 76,
        y: 7,
        name: "Overflow nipple",
        whatItIs: "The small barbed fitting near the cap, with a thin hose to the reservoir.",
        whatItDoes:
          "It passes expanding coolant to the reservoir and draws it back as the engine cools.",
        shopNote:
          "A blocked or cracked overflow hose means coolant leaves but never returns, so the level keeps dropping with no visible leak.",
      },
      {
        id: "rad-mount",
        x: 11,
        y: 19,
        name: "Mounting bracket",
        whatItIs: "The tabs and rubber-isolated mounts holding the radiator in the front structure.",
        whatItDoes: "They locate the radiator and keep engine vibration out of the core.",
        shopNote:
          "Missing isolators let the core vibrate against metal and crack a tank seam over time.",
      },
    ],
  },
  {
    id: "battery",
    name: "Battery",
    tagline: "The store of energy that starts everything else.",
    parts: [
      {
        id: "bat-positive",
        x: 82,
        y: 17,
        name: "Positive terminal",
        whatItIs: "The larger post, marked with a plus and usually covered with a red boot.",
        whatItDoes: "It feeds the starter and the vehicle's main fuse box.",
        shopNote:
          "Connect this one first when reassembling and last when disconnecting, so a tool touching the body cannot short the battery.",
      },
      {
        id: "bat-negative",
        x: 28,
        y: 23,
        name: "Negative terminal",
        whatItIs: "The slightly smaller post, marked with a minus, bolted to the body and engine.",
        whatItDoes: "It provides the return path for every circuit on the vehicle.",
        shopNote:
          "A corroded ground strap between engine and body causes odd faults everywhere at once, such as dim lights and rough cranking together.",
      },
      {
        id: "bat-vents",
        x: 25,
        y: 14,
        name: "Vent caps",
        whatItIs: "The round covers along the top over each internal cell.",
        whatItDoes:
          "They let hydrogen gas produced during charging escape while keeping the electrolyte in.",
        shopNote:
          "That gas is flammable, which is why jumper leads get connected to a ground point away from the battery rather than the negative post.",
      },
      {
        id: "bat-handle",
        x: 50,
        y: 7,
        name: "Carry handle",
        whatItIs: "The folding strap moulded into the lid.",
        whatItDoes: "It lets you lift the battery without gripping the terminals.",
        shopNote:
          "Keep the battery level while carrying it. Tipping a flooded battery can spill acid through the vents.",
      },
      {
        id: "bat-case",
        x: 30,
        y: 45,
        name: "Case and cells",
        whatItIs:
          "The moulded polypropylene box divided inside into cells of lead plates in electrolyte.",
        whatItDoes:
          "Each cell contributes around two volts, which is why six cells in series give a nominal twelve volt battery.",
        shopNote:
          "A bulged case usually means the battery has been overheated or overcharged, so check charging voltage before fitting a replacement.",
      },
      {
        id: "bat-label",
        x: 62,
        y: 60,
        name: "Rating label",
        whatItIs: "The printed panel on the case listing group size, cold cranking amps and date.",
        whatItDoes: "It tells you what the battery can deliver and whether it physically fits.",
        shopNote:
          "Match or exceed the cold cranking amps the manufacturer specifies. Fitting a smaller rating makes cold-morning cranking marginal.",
      },
    ],
  },
  {
    id: "brakes",
    name: "Disc brake assembly",
    tagline: "How the pedal turns into stopping force at the wheel.",
    parts: [
      {
        id: "rotor",
        x: 20,
        y: 30,
        name: "Brake rotor",
        whatItIs:
          "The cast iron disc that turns with the wheel, vented in the middle on most front brakes.",
        whatItDoes:
          "The pads clamp on it, and the resulting friction turns the car's motion into heat that the vents carry away.",
        shopNote:
          "Measure thickness against the discard figure cast into the hat. Pulsation under braking is usually thickness variation, not warping.",
      },
      {
        id: "hub",
        x: 30,
        y: 47,
        name: "Hub",
        whatItIs: "The bearing-supported centre the rotor and wheel sit on.",
        whatItDoes: "It carries the wheel and lets it turn on the bearing inside.",
        shopNote:
          "Rust or debris between hub face and rotor is a common cause of runout after a brake job, so clean the face before refitting.",
      },
      {
        id: "wheel-studs",
        x: 37,
        y: 62,
        name: "Wheel studs",
        whatItIs: "The threaded posts pressed through the hub flange.",
        whatItDoes: "They locate the wheel and hold it clamped against the hub.",
        shopNote:
          "Torque them in a star pattern to spec. Overtightening stretches studs and distorts the rotor hat.",
      },
      {
        id: "caliper",
        x: 72,
        y: 42,
        name: "Caliper",
        whatItIs: "The cast body straddling the rotor edge, containing one or more pistons.",
        whatItDoes: "Hydraulic pressure pushes its piston out so the pads squeeze the rotor.",
        shopNote:
          "A seized slide pin on a floating caliper makes only one pad wear. Uneven pad thickness on the same wheel is the clue.",
      },
      {
        id: "pads",
        x: 57,
        y: 48,
        name: "Brake pads",
        whatItIs: "The friction blocks on steel backing plates, sitting either side of the rotor.",
        whatItDoes: "They are the wearing parts that do the actual rubbing against the rotor.",
        shopNote:
          "The thin metal wear indicator is meant to squeal before the friction runs out, so treat that noise as a service due, not a fault to ignore.",
      },
      {
        id: "bleeder",
        x: 76,
        y: 14,
        name: "Bleeder screw",
        whatItIs: "The small hollow screw at the highest point of the caliper, under a rubber cap.",
        whatItDoes: "Opening it lets trapped air and old fluid out of the hydraulic circuit.",
        shopNote:
          "Air in the line makes the pedal spongy because air compresses and brake fluid does not.",
      },
      {
        id: "brake-hose",
        x: 90,
        y: 22,
        name: "Flexible brake hose",
        whatItIs: "The reinforced rubber hose joining the hard line on the body to the caliper.",
        whatItDoes: "It carries fluid to the caliper while allowing for steering and suspension movement.",
        shopNote:
          "A hose that has broken down inside can act as a one-way valve, leaving that brake dragging after the pedal is released.",
      },
      {
        id: "caliper-bracket",
        x: 61,
        y: 86,
        name: "Caliper bracket",
        whatItIs: "The heavy bracket bolted to the steering knuckle that the caliper slides on.",
        whatItDoes: "It anchors the caliper against the twisting force of braking.",
        shopNote:
          "Clean and lubricate the pad abutment surfaces on this bracket. Rust build-up there binds pads and causes drag.",
      },
    ],
  },
  {
    id: "spark-plug",
    name: "Spark plug",
    tagline: "A small part that tells you a lot about how a cylinder is running.",
    parts: [
      {
        id: "terminal-nut",
        x: 8,
        y: 45,
        name: "Terminal nut",
        whatItIs: "The metal tip at the top end where the coil boot or plug lead pushes on.",
        whatItDoes: "It receives the high voltage pulse from the ignition coil.",
        shopNote:
          "On some plugs this nut screws off for older lead types. If it works loose, the plug misfires intermittently under load.",
      },
      {
        id: "insulator",
        x: 26,
        y: 45,
        name: "Ceramic insulator",
        whatItIs: "The white ribbed ceramic body between the terminal and the metal shell.",
        whatItDoes:
          "It keeps the high voltage travelling down the centre instead of jumping to the engine, and the ribs lengthen the path any stray spark would have to take.",
        shopNote:
          "A hairline crack here causes a misfire that gets worse in damp weather, and it is easy to cause by dropping a plug on concrete.",
      },
      {
        id: "hex",
        x: 46,
        y: 45,
        name: "Hex",
        whatItIs: "The six-sided section the plug socket grips.",
        whatItDoes: "It is where installation torque is applied.",
        shopNote:
          "Torque to spec rather than by feel. Overtightening in an aluminium head strips threads that then need a costly repair insert.",
      },
      {
        id: "gasket",
        x: 58,
        y: 45,
        name: "Sealing washer or seat",
        whatItIs:
          "The crush washer just below the hex, or on some plugs a tapered seat instead of a washer.",
        whatItDoes: "It seals combustion pressure in and carries heat from the plug into the head.",
        shopNote:
          "A plug not seated properly runs hot because its main heat path is through this seat.",
      },
      {
        id: "threads",
        x: 72,
        y: 45,
        name: "Threads",
        whatItIs: "The threaded metal shell that screws into the cylinder head.",
        whatItDoes: "It holds the plug in place and grounds the shell to the engine.",
        shopNote:
          "Start plugs by hand or with a piece of hose. Cross-threading an aluminium head is one of the most expensive small mistakes in the shop.",
      },
      {
        id: "ground-electrode",
        x: 93,
        y: 38,
        name: "Ground electrode",
        whatItIs: "The metal strap bent over the end of the plug.",
        whatItDoes: "It provides the surface the spark jumps to from the centre electrode.",
        shopNote:
          "The distance between this strap and the centre tip is the plug gap, and it must match the specification for that engine.",
      },
      {
        id: "centre-electrode",
        x: 88,
        y: 60,
        name: "Centre electrode",
        whatItIs:
          "The fine pin in the middle of the tip, made of iridium or platinum on long-life plugs.",
        whatItDoes: "It is where the spark starts.",
        shopNote:
          "Read its colour when the plug comes out. Dry black points to a rich mixture, oily to oil getting into the chamber, and white with blistering to running too hot.",
      },
    ],
  },
];
