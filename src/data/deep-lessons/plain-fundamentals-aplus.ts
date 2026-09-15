/** Beginner layer for the fundamentals-aplus topics. Filled in per topic. */
import type { LessonPlainLanguage } from "./types";

export const fundamentalsAplusPlainLanguage: Record<string, LessonPlainLanguage> = {
  "topic-binary-and-number-systems": {
    plainIntro:
      "A computer only ever has electricity that is on or off, so it counts using just two digits instead of the ten we use. Imagine a row of light switches: each one flipped on or off can stand for a number, and the more switches you have, the bigger the numbers you can build. Because writing out long strings of ons and offs is tiring for people, technicians use shorter systems, like hex, that group those switches together into single symbols. This matters because IP addresses, colour codes, file permissions and drive sizes are all really just this switch counting written in a form humans can read.",
    wordList: [
      { term: "Bit", plain: "One single switch, either 0 or 1, the smallest piece of information a computer holds." },
      { term: "Byte", plain: "Eight bits grouped together, the standard chunk used to measure memory and storage." },
      { term: "Nibble", plain: "Four bits grouped together, exactly the amount one hex digit can show." },
      { term: "Binary", plain: "Counting using only 0 and 1, the way a computer actually works underneath." },
      { term: "Hexadecimal (hex)", plain: "A shorthand counting system using 0-9 and A-F, used to write things like MAC addresses and colour codes more compactly." },
      { term: "Octal", plain: "A counting system using 0-7, used mainly for writing Linux file permission numbers." },
      { term: "Decimal versus binary units (GB vs GiB)", plain: "Storage makers count in round tens (GB) while your computer counts in its own base-two units (GiB), which is why a '1 TB' drive shows a slightly smaller number on screen." },
      { term: "Subnet mask", plain: "A pattern of on and off bits that marks which part of an address is the local network and which part is not." },
    ],
  },

  "topic-troubleshooting-methodology": {
    plainIntro:
      "When something breaks, a good technician does not just guess and start swapping parts. They follow a set order of steps, the same way a doctor asks questions and runs tests before treating a patient, so that the fix is based on evidence rather than luck. First you find out exactly what is wrong and who it affects, then you form one clear guess about the cause, test that guess, fix it, check it really worked, and write down what happened. Following this order matters because it stops you wasting time chasing the wrong cause or leaving a problem that quietly comes back.",
    wordList: [
      { term: "Scope", plain: "How many people or machines are affected by the problem, which tells you if it is one device or something shared." },
      { term: "Theory of probable cause", plain: "Your best specific guess at what is causing the problem, written so it can be checked and proven right or wrong." },
      { term: "Single-variable testing", plain: "Changing only one thing at a time, so you know exactly what fixed the problem." },
      { term: "Escalation", plain: "Passing a problem on to someone with more access or knowledge once you have done all you can." },
      { term: "Root cause", plain: "The real underlying reason a problem happened, not just the symptom you first noticed." },
      { term: "Verification", plain: "Checking with the actual user that things are working properly again, not just assuming it from your own screen." },
      { term: "Preventive measure", plain: "Something you do after the fix so the same problem is less likely to happen again." },
      { term: "Workaround", plain: "A quick temporary bypass that gets someone working again without fixing the actual underlying cause." },
    ],
  },

  "topic-pc-hardware-installation": {
    plainIntro:
      "Fitting or upgrading parts inside a computer is a bit like fitting a new oven into a kitchen: you have to check the part will physically fit, that the power supply can handle it, and that everything is wired up correctly before you switch it on. Most failed upgrades go wrong because someone skipped that checking stage, not because fitting the part itself was hard. Static electricity from your own body is another hidden risk, since it can silently damage delicate parts without you feeling a shock. Getting this right matters because a badly seated part or an ignored compatibility check can stop a whole machine from starting.",
    wordList: [
      { term: "Socket", plain: "The exact shape of slot on a motherboard that a processor must match to be fitted." },
      { term: "Form factor", plain: "The standard size of a motherboard or case, which decides what fits inside what." },
      { term: "Dual channel memory", plain: "Fitting two matching memory sticks in the correct paired slots so the computer can use them faster together." },
      { term: "PCIe lane", plain: "A pathway on the motherboard that carries data to and from a plugged-in card, like a graphics card." },
      { term: "PSU (power supply) connector", plain: "The specific plug type a part needs from the power supply, such as an 8-pin plug for a processor." },
      { term: "ESD (electrostatic discharge)", plain: "A static electric charge from your body that can quietly damage a computer part even though you do not see or feel a spark." },
      { term: "POST", plain: "The quick self-check a computer runs the instant it is switched on, before anything appears on the screen." },
    ],
  },

  "topic-storage-technologies": {
    plainIntro:
      "Storage is where your files live even after you switch the computer off. An old-style hard drive is like a tiny record player with a spinning disc and a needle that has to physically move to find your file, while a solid-state drive is more like flicking straight to the right page in a well-organised folder, with no moving parts at all. RAID is a way of spreading copies of your data across several drives so that losing one drive does not lose your files, but it is not the same thing as a backup, which is a separate copy kept somewhere else entirely. Knowing the difference matters because relying on the wrong one is how people lose data they thought was safe.",
    wordList: [
      { term: "HDD (hard disk drive)", plain: "An older type of storage that reads and writes data on a spinning magnetic disc using a moving arm." },
      { term: "SSD (solid-state drive)", plain: "A newer type of storage with no moving parts, much faster than a hard disk." },
      { term: "NVMe", plain: "A fast connection method that lets an SSD talk directly to the computer's fastest data pathway, instead of the older, slower cable type." },
      { term: "RAID", plain: "A way of using several drives together so that losing one does not lose your data, or so that reading and writing is faster." },
      { term: "Parity", plain: "Extra calculated information stored alongside your data that lets a RAID system rebuild what was on a failed drive." },
      { term: "Degraded state", plain: "A RAID setup running after one drive has failed, still working but with no protection left until it is fixed." },
      { term: "SMART attributes", plain: "Health information a drive reports about itself, used to warn you before it fails completely." },
      { term: "3-2-1 backup rule", plain: "A simple rule for safe backups: keep three copies of your data, on two different types of storage, with one copy kept somewhere else entirely." },
    ],
  },

  "topic-mobile-devices-and-laptops": {
    plainIntro:
      "A laptop is really a desktop computer squeezed into a small case with a battery attached, and that squeeze means parts sit closer together, get hotter, and are harder to open up and repair. A smartphone takes this even further, sealing almost everything inside one solid unit. Because company phones and laptops often hold work data, businesses use a remote control system so they can lock down, check on, or wipe a device if it is lost, in the same way a company might issue a work phone with rules already built in. This matters because a lost device with no such protection can expose sensitive company information the moment it goes missing.",
    wordList: [
      { term: "Battery health/wear level", plain: "A measure of how much a battery's capacity has dropped compared to when it was new." },
      { term: "Charging circuit", plain: "The internal wiring inside a device that carries power from the charging port to the battery." },
      { term: "Digitiser", plain: "The touch-sensitive layer on a touchscreen, which can stop responding even while the picture underneath still works fine." },
      { term: "MDM (mobile device management)", plain: "A system that lets a company control, monitor and secure phones and laptops remotely." },
      { term: "MDM profile", plain: "A set of rules pushed to a device, such as requiring a passcode or blocking certain apps." },
      { term: "Remote wipe", plain: "A command sent from a company's system that erases some or all of the data on a lost or stolen device." },
      { term: "BYOD (bring your own device)", plain: "A setup where an employee's personal phone is allowed limited access to work data, usually kept in a separate secured area." },
    ],
  },

  "topic-printers-and-peripherals": {
    plainIntro:
      "Printing a document is like sending a letter through several hand-offs: your program writes it, a driver translates it into language the printer understands, a queue holds it until its turn, a cable or network carries it across, and the printer itself does the physical work. If any single hand-off fails, the whole job stops, even though everything else along the way was working fine. This is why saying 'the printer is broken' is not very useful on its own, and the real skill is working out which hand-off actually failed. Getting this right matters because printers generate more support tickets than almost anything else in an office.",
    wordList: [
      { term: "Driver", plain: "Software that translates what you want printed into instructions the specific printer model understands." },
      { term: "Print spooler", plain: "The background service that holds and manages print jobs in order until the printer is ready for each one." },
      { term: "Print queue", plain: "The list of jobs waiting to print, in order, for a particular printer." },
      { term: "Network printer path", plain: "The route a print job travels across the network from your computer to the printer." },
      { term: "Consumables", plain: "The parts of a printer that get used up and need replacing, such as ink, toner and drums." },
      { term: "Firmware", plain: "The printer's own built-in software, separate from any driver installed on your computer." },
      { term: "Duplexer", plain: "An attachment or built-in part that lets a printer print automatically on both sides of the paper." },
    ],
  },

  "topic-windows-installation-and-configuration": {
    plainIntro:
      "Setting up Windows once for yourself at home is like cooking one meal exactly the way you like it. Setting Windows up across a whole business is more like running a restaurant kitchen, where every dish has to come out the same way every time, because inconsistency causes confusion and extra work later. Getting this consistency means making a handful of important decisions once, such as how the disk is divided and how accounts are managed, then applying that same setup to every machine. This matters because a fleet of computers set up differently from each other is much harder to support and secure than one set up to a single agreed standard.",
    wordList: [
      { term: "UEFI", plain: "The modern firmware standard a computer uses to start up, replacing the older BIOS system." },
      { term: "GPT", plain: "A modern way of dividing up a disk into sections, required for UEFI and needed for larger drives." },
      { term: "Windows edition", plain: "The version of Windows installed, such as Home or Pro, which decides which business features are available." },
      { term: "Identity model", plain: "How a computer signs a user in, whether through a local account, a personal Microsoft account, or a company account." },
      { term: "Driver installation", plain: "Making sure the software needed for each piece of hardware is installed so Windows recognises it correctly." },
      { term: "Windows Update configuration", plain: "The settings that control when and how a computer receives its security and feature updates." },
      { term: "BitLocker", plain: "Windows' built-in feature that scrambles the data on a drive so it cannot be read if the device is lost or stolen." },
    ],
  },

  "topic-windows-administration-tools": {
    plainIntro:
      "Windows has a set of built-in tools that let a technician see what the computer is actually doing, a bit like the different instruments a doctor uses during a check-up. One tool shows what is happening right now, another shows a history of what happened earlier, another lists the quiet background jobs running behind the scenes, and another lets you type precise instructions instead of clicking through menus. Knowing which tool answers which kind of question turns a vague complaint like 'it's slow' into a specific, checkable fact. This matters because using the wrong tool wastes time even when you are looking in roughly the right place.",
    wordList: [
      { term: "Task Manager", plain: "A tool that shows what is using the computer's processor, memory, disk and network right now." },
      { term: "Event Viewer", plain: "A tool that keeps a timestamped record of things that happened on the computer in the past, even after the screen has moved on." },
      { term: "Services", plain: "A list of background programs the computer runs, showing whether each one is set to start automatically and whether it is currently running." },
      { term: "Device Manager", plain: "A tool that lists all the hardware in a computer and flags anything with a driver problem." },
      { term: "Registry Editor", plain: "A tool that lets you view and change the computer's internal settings database directly, used when there is no ordinary menu for a setting." },
      { term: "Microsoft Management Console (MMC)", plain: "A shared window that several administration tools plug into, so they share the same look and feel." },
      { term: "PowerShell", plain: "A way of typing precise commands to check or change settings, useful for doing the same task on many machines at once." },
    ],
  },

  "topic-macos-and-linux-clients": {
    plainIntro:
      "Windows is not the only computer system you will meet. macOS and Linux solve exactly the same everyday problems, such as installing software, controlling who can access what, and recovering from a crash, but they use different names and tools to do it. It helps to think of it like driving in different countries: the road signs look different, but a stop sign still means stop everywhere. Once you know the four jobs every operating system has to do, learning a new one becomes a case of finding out what that system calls its version of each job, rather than starting again from nothing.",
    wordList: [
      { term: "Package manager", plain: "The tool used to install, update and remove software, different on each system but doing the same job everywhere." },
      { term: "Permission model", plain: "The rules deciding who can read, change or run a file, based on being the owner, in a group, or neither." },
      { term: "Terminal/shell", plain: "A window where you type text commands to the computer instead of clicking icons." },
      { term: "Log location", plain: "Where a computer keeps its record of past events, different on each system but serving the same purpose." },
      { term: "Recovery environment", plain: "A separate, cut-down mode a computer can start into to repair itself when the main system will not start normally." },
      { term: "File system", plain: "The underlying method a drive uses to organise and store files, different between Windows, macOS and Linux." },
      { term: "Time Machine", plain: "Apple's built-in backup tool for macOS, which automatically keeps past versions of your files." },
    ],
  },

  "topic-software-troubleshooting": {
    plainIntro:
      "When an app misbehaves, it is tempting to wipe the whole computer and start again, but that is like buying a new car because the radio does not work. Most software problems come from one of three places: something specific to the person using it, something specific to the machine itself, or something wrong with the particular file being opened. Working out which of these three it is, usually by testing the same thing on a different user or a different machine, narrows down the fix hugely before you touch anything drastic. This matters because a full reinstall throws away evidence that could have shown exactly what went wrong and stopped it happening again.",
    wordList: [
      { term: "User profile", plain: "The personal folder holding one person's settings and saved preferences for an app or the computer." },
      { term: "Dependency/runtime", plain: "A shared piece of software, like .NET or Java, that another program needs already installed in order to run at all." },
      { term: "Application cache", plain: "Temporary files an app keeps to work faster, which can sometimes become corrupted and cause crashes." },
      { term: "Error code/exception", plain: "The specific message or number a program shows when it fails, usually the most useful clue you have." },
      { term: "Clean boot", plain: "Starting Windows with only the essential parts running, used to check whether another program is causing a conflict." },
      { term: "Rollback", plain: "Undoing a recent update that is suspected of causing a new problem." },
      { term: "Repair install", plain: "A lighter option than a full reinstall that puts back missing or damaged files without deleting a user's settings." },
    ],
  },

  "topic-endpoint-security-fundamentals": {
    plainIntro:
      "Keeping a laptop or phone secure is like securing a house: you lock the doors, you do not hand every visitor a key to every room, you fix broken locks quickly, you keep valuables in a safe in case someone does get in, and you have an alarm to warn you of trouble. No single one of these stops every attack, but stacked together they make a break-in far less likely and far less damaging if it happens anyway. This matters because a person clicking a bad link or reusing a weak password is an everyday event, not a rare exception, so these habits are built assuming a mistake will eventually happen.",
    wordList: [
      { term: "Multi-factor authentication (MFA)", plain: "Needing a second proof of who you are, beyond just a password, before you can log in." },
      { term: "Least privilege", plain: "Giving someone only the access they actually need to do their job, and nothing more." },
      { term: "Patch management", plain: "The process of applying security updates promptly, before someone finds and uses a known weakness." },
      { term: "Full-disk encryption", plain: "Scrambling everything on a drive so it cannot be read by anyone who does not have the right key, even if the device is stolen." },
      { term: "Endpoint protection/antivirus", plain: "Software that watches for and blocks known bad programs and suspicious behaviour." },
      { term: "Phishing", plain: "A trick message designed to fool someone into giving away their password or running something harmful." },
      { term: "Isolation/containment", plain: "Disconnecting a suspected infected device from the network straight away to stop the problem spreading." },
    ],
  },

  "topic-operational-procedures-and-safety": {
    plainIntro:
      "Being good at fixing computers is not the same as being a good IT professional. The professional side means working safely, checking changes carefully before making them, keeping accurate records, and explaining things clearly to people who are not technical. Think of change control like a hospital rule that stops any doctor changing a patient's medication on a whim, without anyone else knowing or being able to reverse it. Keeping equipment records and safely wiping old drives before disposal feels like paperwork until something goes wrong, at which point it is the only way to know what was fixed, what happened, and that no private data was left behind.",
    wordList: [
      { term: "Change request", plain: "A written proposal describing a planned change, why it is needed, and how to undo it, submitted before the change is made." },
      { term: "Rollback plan", plain: "A pre-agreed way of reversing a change if it causes an unexpected problem." },
      { term: "Asset register", plain: "A record of every piece of equipment a company owns, who has it, and where it is." },
      { term: "Data destruction/sanitisation", plain: "Wiping or physically destroying a storage device so no data can be recovered before it is thrown away or reused." },
      { term: "Safety Data Sheet (SDS)", plain: "A document explaining how to handle a hazardous material safely, such as printer toner or a battery." },
      { term: "Chain of custody", plain: "A written record of everyone who has handled a piece of equipment or evidence, kept for legal or investigation purposes." },
      { term: "Professional communication", plain: "Explaining a problem or mistake clearly and calmly to someone non-technical, without jargon or blame." },
    ],
  },
};
