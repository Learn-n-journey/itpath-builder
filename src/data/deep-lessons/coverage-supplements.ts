import type { DeepLesson, DeepLessonSection } from "./types";

/**
 * Focused teaching added after concept-coverage reviews.
 * These sections are appended to both built-in and owner-written lessons, so
 * workbook syncs cannot silently remove knowledge that an assessment requires.
 */
const coverageSupplements: Record<string, DeepLessonSection[]> = {
  "topic-active-directory-and-domain-services": [
    {
      id: "ad-specialised-roles-and-access-design",
      heading: "Specialised Domain Roles and Access Design",
      paragraphs: [
        "Active Directory normally uses several writable domain controllers, but a few operations need one agreed authority. These are the five Flexible Single Master Operations, or FSMO, roles. The Schema Master controls schema changes, the Domain Naming Master controls adding or removing domains, the RID Master supplies pools of relative identifiers so new security principals receive unique SIDs, the Infrastructure Master tracks cross-domain references, and the PDC Emulator handles several time-sensitive domain duties.",
        "The PDC Emulator is the preferred domain-level time authority and receives urgent notification of password changes. Other domain controllers can consult it when a recently changed password appears to fail, reducing the delay caused by ordinary replication. If users can sign in with an old password but not a new one, or domain time is drifting, the PDC Emulator and its replication and time configuration deserve attention.",
        "A Read-Only Domain Controller, or RODC, is intended for locations where physical security or local administration is limited. Its Password Replication Policy decides which account credentials may be cached locally. Denying privileged accounts limits what an attacker can recover if the branch controller is stolen. An RODC still relies on writable controllers for changes, and clients locate domain services through DNS SRV records such as the LDAP records registered by domain controllers.",
        "AGDLP separates identity from permission: place user Accounts into role-based Global groups, place those groups into Domain Local groups that represent access to a resource, then assign Permissions to the domain local group. This makes job changes and resource permissions easier to audit than granting rights directly to individual users.",
      ],
    },
  ],
  "topic-binary-and-number-systems": [
    {
      id: "binary-representation-in-real-systems",
      heading: "How Real Systems Interpret Bits",
      paragraphs: [
        "A field containing n bits has 2^n possible patterns. An unsigned 12-bit sensor field therefore has 4,096 possible values, from 0 through 4,095. Signed integers commonly use two's-complement representation: an 8-bit value runs from -128 through 127, and adding one to 01111111 produces 10000000, which represents -128 if overflow is allowed to wrap. The bits did not change meaning by themselves. The data type tells the system whether the same pattern is an unsigned number, a signed number, text, flags, or part of a floating-point value.",
        "Bitwise operations change selected bits. OR sets a bit without clearing the others, so OR with a mask such as 00000100 sets bit 2. AND is used to clear or test selected bits, XOR toggles them, and NOT reverses every bit. In the IEEE 754 32-bit floating-point format, the highest-order bit is the sign bit, followed by an 8-bit exponent and a 23-bit fraction.",
        "Text also has a defined interpretation. ASCII assigns values to 128 characters and those characters keep the same one-byte values in UTF-8. UTF-8 uses two, three, or four bytes for other characters. The euro sign is Unicode U+20AC and its UTF-8 bytes are E2 82 AC. A packet capture shows bytes, so you must know the declared encoding before translating them into characters.",
        "Hexadecimal text must be parsed with the intended radix. In Python, int(\"0x144\", 16) explicitly reads the string as base 16 and returns decimal 324. IEC binary prefixes are exact powers of two: 1 MiB is 2^20 bytes and 1 GiB is 2^30 bytes, while MB and GB normally mean decimal powers of ten. Keeping the unit and interpretation beside a raw value prevents otherwise convincing conversion errors.",
      ],
    },
  ],
  "topic-command-line-fundamentals": [
    {
      id: "command-line-tools-across-shells",
      heading: "Useful Tools Across Shells",
      paragraphs: [
        "Secure Shell, or SSH, creates an encrypted remote terminal session. The scp utility copies files over SSH, while sftp provides an interactive file-transfer session over the same protected channel. Authentication can use a password or a key pair, but the destination host and path still need to be checked before data is sent.",
        "PowerShell passes structured objects through its pipeline rather than only plain text. Get-Member shows the properties and methods available on those objects. Tee-Object writes pipeline output to a file or variable while also passing the same objects onward, which is useful when a command needs both a saved record and further processing.",
        "A shell accepting a command does not prove the task succeeded. Check the command's exit status, the expected output, and the resulting system state. Read help before using a destructive option, quote paths containing spaces, and remember that an argument supplies a target or value while an option changes how the command behaves.",
      ],
    },
  ],
  "topic-dns-fundamentals": [
    {
      id: "dns-records-and-resilient-resolution",
      heading: "DNS Records and Resilient Resolution",
      paragraphs: [
        "DNS records answer different questions. MX identifies the mail exchangers for a domain, NS identifies its authoritative name servers, CNAME makes one name an alias of another canonical name, and PTR maps an address back to a name in reverse DNS. SRV records publish a service, protocol, port, and target host, which is why technologies such as LDAP and SIP can use them to locate a service automatically.",
        "An uncached recursive lookup normally moves from a root server to the appropriate top-level-domain server and then to the domain's authoritative server. A complete zone transfer is AXFR and should be restricted to authorised secondary servers. DNS over HTTPS, or DoH, carries resolver queries inside HTTPS; it protects the client-to-resolver exchange but does not make an untrustworthy answer correct.",
        "Managed DNS can steer traffic as well as publish records. Weighted routing can send roughly 80 percent of answers to one endpoint and 20 percent to another. Health-check or failover routing stops returning an unhealthy endpoint. A CDN commonly uses aliases and geographically distributed answers to lead a client toward a suitable edge location.",
        "SERVFAIL means the resolver could not produce a valid answer, not that the name definitely does not exist. After DNSSEC changes, a broken chain of trust, mismatched DS record, expired signature, or missing signed data can cause validation to fail and produce SERVFAIL. Check authoritative answers, delegation, signatures, and caching before changing application settings.",
      ],
    },
  ],
  "topic-programming-and-development-concepts": [
    {
      id: "program-flow-errors-and-data-exchange",
      heading: "Program Flow, Errors, and Data Exchange",
      paragraphs: [
        "Programs branch with conditions such as if, elif, and else, and repeat work with loops. Pseudocode describes that logic without tying it to one language. A collection index starts at zero in many languages, so index 2 selects the third item; an index beyond the collection's range raises an error rather than returning another valid element.",
        "Exception handling separates an expected failure path from normal processing. A try block contains work that may fail, a catch or except block handles a known error, and raise or throw deliberately passes an error to the caller. Catch only errors you can handle, preserve useful details, and do not turn a serious failure into a false success.",
        "A recursive function calls itself and must have a reachable base case. Without one, each call adds another stack frame until the call stack overflows. In object-oriented code, overriding replaces an inherited method's behaviour for a subclass while preserving the method's expected contract.",
        "Serialization converts an in-memory object into a transport or storage format such as JSON; deserialization reconstructs usable data from it. Validate untrusted input before creating objects. Experimental work belongs on a branch, and git stash can temporarily shelve uncommitted changes when you need a clean working tree without making a premature commit.",
      ],
    },
  ],
  "topic-data-and-database-fundamentals": [
    {
      id: "relational-design-and-query-behaviour",
      heading: "Relational Design and Query Behaviour",
      paragraphs: [
        "A WHERE clause contains a predicate, a condition that decides which rows qualify. INNER JOIN keeps rows that match on both sides, GROUP BY collects rows so functions such as SUM can calculate one result per region, and a view stores a reusable query behind a stable name. An execution plan shows how the database intends to find and join rows and is the first place to look when a query becomes slow at production scale.",
        "Indexes speed selected reads but consume storage and add work to every insert, update, and delete. For a frequent search on customer_id and order_date, evaluate a composite index in the order that matches the real predicates and sorting. Too many indexes can make a write-heavy table slower, so keep only those justified by measured queries.",
        "Normalization separates facts that change independently. If department_name repeats on every employee row, store departments once and reference department_id. A primary key identifies each row; a UNIQUE constraint can enforce a business rule such as one customer per email address. Choose a date type for dates rather than mixing words such as 'unknown' into the same column, and represent missing values deliberately.",
        "Data Definition Language, or DDL, changes structure with operations such as CREATE and ALTER, while privileges such as SELECT and INSERT control what an application account may do. Grant only the operations the application needs and do not grant schema-changing rights to an ordinary runtime account. Concurrent edits also need a strategy, such as transactions, locking, or optimistic version checks, to prevent one user's update silently overwriting another's.",
        "A document database can suit records whose attributes vary greatly and are usually retrieved as a whole by identifier. That does not make it automatically better than a relational design; the choice follows access patterns, consistency needs, relationships, and reporting requirements.",
      ],
    },
  ],
  "topic-ip-addressing-and-subnetting": [
    {
      id: "address-boundaries-and-link-local-ipv6",
      heading: "Address Boundaries and Link-Local IPv6",
      paragraphs: [
        "Every IPv6 interface normally has a link-local address from fe80::/10. Link-local traffic stays on the local network segment and routers do not forward it. IPv6 uses these addresses for neighbour discovery and other local control traffic even when a globally routable address is also present.",
        "Subnet boundaries come from a bitwise AND between an address and its mask. A network bit is 1 only when both the address bit and mask bit are 1. A /27 contains 32 addresses and usually 30 ordinary IPv4 host addresses; a /26 contains 64 and usually 62. Moving from /25 to /26 halves each subnet's address capacity.",
        "To detect overlap, calculate each network address and its final address rather than comparing only the written prefixes. 192.168.90.64/26 spans .64 through .127, so any proposed range touching those addresses intersects it. The network and broadcast values are not ordinary host assignments in a conventional IPv4 subnet.",
      ],
    },
  ],
  "topic-linux-storage-filesystems-and-lvm": [
    {
      id: "growing-linux-storage-safely",
      heading: "Growing Linux Storage Safely",
      paragraphs: [
        "Partitioning tools such as fdisk and GParted create or change partition boundaries. LVM adds another layer: physical volumes supply extents to a volume group, and logical volumes consume those extents. Before extending a logical volume, use vgs or vgdisplay to confirm that the volume group has free extents. If it has none, add capacity to the group before retrying lvextend or lvresize.",
        "Growing a logical volume does not by itself grow the filesystem inside it. After extending an XFS logical volume, run xfs_growfs against the mounted filesystem. For ext4, use resize2fs against the block device. The commands are filesystem-specific because XFS and ext4 maintain different on-disk structures.",
        "Some LVM commands can resize the logical volume and filesystem together with a filesystem-resize option, but verify support and backups first. Identify every layer with lsblk, pvs, vgs, lvs, findmnt, and df before changing anything. Shrinking is more dangerous than growing, and XFS cannot be shrunk in place.",
      ],
    },
  ],
  "topic-mobile-device-hardware": [
    {
      id: "mobile-components-sensors-and-secure-processing",
      heading: "Mobile Components, Sensors, and Secure Processing",
      paragraphs: [
        "Mobile hardware combines general processors with specialised components. A neural processing unit, or NPU, accelerates on-device machine-learning work such as image analysis while using less power than sending every operation through the main CPU. Sustained heavy processing creates heat, so a phone may use thermal throttling to lower clock speed and protect the battery and silicon; smooth performance followed by heat and slowdown is a strong clue.",
        "Ultra-wideband, or UWB, measures radio timing precisely enough for accurate short-range ranging and direction finding, making it useful for locating nearby tags. An accelerometer measures linear acceleration and movement, a gyroscope measures rotation, a magnetometer supplies compass direction, and an ambient-light sensor helps the display adapt to surrounding light. Magnets can disturb a magnetometer even when the other motion sensors work normally.",
        "A haptic actuator creates vibration or tactile feedback independently of the speaker. Camera autofocus adjusts the lens to produce a sharp image, while an LED flash supplies light in dark scenes. A failed microphone can leave incoming audio intact while calls and voice recordings contain no sound.",
        "Secure enclaves and hardware-backed keystores isolate cryptographic keys from the ordinary operating system and may perform sensitive operations without exposing the raw key. Mobile document-picker frameworks similarly let a user grant an application access to selected files from local, cloud, or attached storage without granting broad access to every file.",
        "The display produces the visible image; the digitizer detects touch. A broken display can show no image while touch still causes sounds or responses, while a failed digitizer can leave a perfect picture that no longer responds accurately to a finger or stylus.",
      ],
    },
  ],
  "topic-network-attacks-and-access-control": [
    {
      id: "network-access-control-and-aaa",
      heading: "Network Access Control and AAA",
      paragraphs: [
        "AAA separates authentication, authorisation, and accounting. Authentication proves identity, authorisation decides what that identity may do, and accounting records the session and actions. RADIUS commonly supports network access such as VPN and 802.1X and usually encrypts only the password field in its classic form. TACACS+ separates the AAA functions more clearly and encrypts the packet body, which makes it well suited to detailed administration of network devices.",
        "IEEE 802.1X controls access at a wired or wireless port. The endpoint is the supplicant, the switch or access point is the authenticator, and an authentication server, commonly RADIUS, validates the identity. Until authentication succeeds, the port permits only the limited exchange needed for access control rather than ordinary network traffic.",
        "Access control does not replace segmentation or monitoring. Apply least privilege, place unauthorised or unhealthy devices into a restricted VLAN where appropriate, watch for repeated failures, and protect the AAA service itself because a central outage can deny access across the network.",
      ],
    },
  ],
  "topic-networking-basics": [
    {
      id: "networking-addressing-captures-and-link-errors",
      heading: "Addressing, Captures, and Link Errors",
      paragraphs: [
        "DNS normally uses destination port 53 over UDP for ordinary queries and can use TCP 53 for responses that do not fit, retries after truncation, and operations such as zone transfer. IPv4 private addresses come from 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16 and are not routed directly across the public internet.",
        "IPv6 Stateless Address Autoconfiguration, or SLAAC, lets a host form an address using information advertised by a local router rather than requiring a traditional DHCPv4-style address lease. DHCPv6 may still supply other settings or managed addresses, depending on the router advertisement and network design.",
        "Wireshark capture filters decide which packets are collected and must be chosen before or during capture. Display filters change only which packets are shown and can be applied repeatedly to an existing capture; the display filter tcp shows TCP packets without deleting other captured traffic.",
        "Ethernet's frame check sequence, or FCS, detects frame corruption. A duplex mismatch, especially one side forced to full duplex while the other negotiates differently, can cause late collisions, FCS errors, retransmissions, and poor throughput. Configure both ends consistently, preferably with compatible auto-negotiation, then clear counters and retest.",
      ],
    },
  ],
  "topic-network-cabling-and-connectors": [
    {
      id: "cable-standards-testing-and-repair",
      heading: "Cable Standards, Testing, and Repair",
      paragraphs: [
        "A cable map verifies conductor order, opens, shorts, reversals, and split pairs. A certification tester goes further by measuring whether an installed link meets a named performance standard, including loss, crosstalk, length, and return loss. A link may pass simple continuity and still fail certification at its intended data rate.",
        "1000BASE-LX uses long-wavelength light, normally around 1310 nm, over single-mode fibre and can also run over some multimode installations within stricter limits. Older multimode fibre can suffer differential mode delay when a laser launches unevenly into its core, so a mode-conditioning patch cable may be required for certain 1000BASE-LX deployments. Fibre mating surfaces must be inspected and cleaned before connection because tiny contamination can produce major optical loss.",
        "MDI and MDI-X describe whether transmit and receive pairs are presented in the endpoint or switch arrangement. Older links sometimes required a crossover cable between like devices; auto-MDI/MDI-X now detects and corrects the pair orientation automatically on most modern Ethernet ports.",
        "When a copper termination fails, remove the damaged end, preserve pair twists as close to the contact as practical, follow one wiring standard consistently, provide strain relief, and test again. A 110-style punch-down tool seats conductors into insulation-displacement contacts on patch panels and jacks. Label both ends and record the result so a passing cable remains maintainable.",
      ],
    },
  ],
  "topic-printers-peripherals-and-connectivity": [
    {
      id: "peripheral-selection-and-output-troubleshooting",
      heading: "Peripheral Selection and Output Troubleshooting",
      paragraphs: [
        "Printer symptoms often identify the subsystem. Loose laser-printer toner that rubs off points to insufficient heat or pressure at the fuser. Marks repeating at a regular distance suggest a rotating component such as the drum, fuser roller, or transfer roller; the interval can be compared with component circumference. Missing inkjet lines after long disuse call for a nozzle check followed by the manufacturer's printhead-cleaning process before replacing parts.",
        "Choose the mechanism for the job. A sheet-fed scanner with an automatic document feeder processes stacks of loose pages quickly, while a flatbed supports books, photographs, and fragile originals without pulling them through rollers. An impact dot-matrix printer can strike multipart forms in one pass. An inkjet is often the practical starting point for occasional high-quality photographs and colour marketing work, while volume, consumable cost, durability, and media support still need to be checked.",
        "AirPrint uses service discovery on the local network, so a phone isolated on guest Wi-Fi may not discover a printer on the staff network. Move the authorised device to a network that can reach and discover the printer, or use an intentionally configured print service; do not remove segmentation without reviewing the security effect.",
        "HDMI Audio Return Channel, or ARC, sends audio from a television back to a soundbar or receiver over the HDMI connection. DisplayPort Multi-Stream Transport, or MST, can carry separate display streams to compatible daisy-chained monitors or an MST hub. A USB-C-to-VGA connection needs an adapter that supports the laptop's USB-C video output mode and performs the required digital-to-analogue conversion.",
      ],
    },
  ],
  "topic-scripting-basics-for-support": [
    {
      id: "safe-support-scripts",
      heading: "Building Support Scripts That Fail Safely",
      paragraphs: [
        "A support script must treat failure as data. In Python, wrap an operation that may fail in try and catch the specific exception with except, such as OSError for operating-system and file errors. In PowerShell, use try and catch with terminating errors. Record the operation, target, timestamp, and error without exposing passwords or tokens, then return a non-zero exit status when the job did not complete.",
        "Python's pathlib.Path joins and inspects paths without hand-building separators. subprocess.run starts an external command; check=True raises an exception for a non-zero exit status, while captured output can be logged or validated. Use argparse for named command-line options instead of relying on unexplained positional values.",
        "PowerShell's -WhatIf previews supported changes without applying them, subexpressions such as $() evaluate an expression inside a string, and $env:COMPUTERNAME reads the current computer name from the environment. Test whether a cmdlet supports -WhatIf rather than assuming every command does.",
        "Windows Task Scheduler can run a script on a schedule or event, and schtasks can create, query, run, and delete those tasks from the command line. Use a dedicated account with only the required rights, define the working directory, capture output, and test the exact non-interactive context because mapped drives, profiles, and prompts may differ from an administrator's open terminal.",
      ],
    },
  ],
  "topic-troubleshooting-methodology": [
    {
      id: "evidence-from-windows-networking",
      heading: "Evidence from Windows Networking",
      paragraphs: [
        "Get-NetTCPConnection lists local and remote addresses, ports, connection states, and owning processes for Windows TCP connections. netstat provides similar evidence across platforms. Use them to confirm whether a service is listening, whether a client established a connection, and which process owns the socket instead of guessing from an application message.",
        "Windows Network Connectivity Status Indicator, or NCSI, performs network checks and reports the connection state shown by Windows. A failed NCSI probe can produce a 'no internet' indication even while some sites remain reachable, so compare DNS, gateway, and direct service tests before treating the icon as proof of a total outage.",
        "SetupAPI logs record device and driver installation decisions, while the Winsock catalogue contains the providers applications use for network sockets. Driver-install problems belong in SetupAPI evidence; broad socket failures after software changes may justify inspecting Winsock. Resetting Winsock is a targeted final step, not a first response, because it changes system state and may disrupt installed network software.",
      ],
    },
  ],
  "topic-windows-administration-tools": [
    {
      id: "windows-sysinternals-diagnostics",
      heading: "Windows and Sysinternals Diagnostics",
      paragraphs: [
        "System Information, launched as msinfo32, summarises hardware resources, components, drivers, and the software environment. It is useful for establishing what Windows detected before changing configuration. Save evidence first when a fault is intermittent.",
        "Microsoft Sysinternals tools answer narrower questions. Autoruns lists the many locations that can start code automatically. TCPView links live TCP and UDP endpoints to processes. Process Explorer inspects process trees, handles, signatures, and loaded modules. ListDLLs reports the dynamic-link libraries loaded by processes, and ProcDump captures process dumps when a program crashes, hangs, or crosses a trigger threshold.",
        "These tools observe different layers, so use the smallest one that answers the hypothesis. A listening-port question belongs in TCPView, an unexplained startup item in Autoruns, a suspected module conflict in ListDLLs or Process Explorer, and a reproducible crash in ProcDump. Record timestamps and command options so another technician can reproduce the collection.",
      ],
    },
  ],
  "topic-windows-boot-and-crash-troubleshooting": [
    {
      id: "windows-boot-records-and-crash-evidence",
      heading: "Windows Boot Records and Crash Evidence",
      paragraphs: [
        "A Windows bug check is the stop condition behind a blue-screen crash. Its hexadecimal bug-check code and parameters narrow the failure class, while a memory dump preserves state for debugging. Windows Error Reporting stores reports under locations including the SystemErrorReporting folders, but the Event Viewer timestamp, dump, recent driver history, and hardware evidence must be correlated before blaming one component.",
        "Boot Configuration Data, or BCD, tells Windows Boot Manager which loader and operating-system device to use. bcdedit displays or changes that store, including entries such as device and osdevice. Export the BCD before editing it, and use Windows recovery tools when the installed system cannot boot.",
        "UEFI firmware keeps boot entries and order in non-volatile RAM, or NVRAM. A valid Windows installation can still be skipped if the firmware entry, disk mode, or boot order is wrong. First confirm that firmware sees the storage device, then confirm the EFI System Partition and Windows Boot Manager entry, and only then repair BCD data.",
      ],
    },
  ],
  "topic-windows-installation-and-configuration": [
    {
      id: "windows-images-drivers-and-recovery",
      heading: "Windows Images, Drivers, and Recovery",
      paragraphs: [
        "A Windows Imaging Format, or WIM, file can hold one or more file-based Windows images. Deployment tools can mount a WIM, add packages, updates, drivers, and settings, then commit a controlled customised image. An unattended installation file can select the image and destination automatically, but its identifiers and disk rules must match the actual media and target.",
        "Windows drivers are commonly described by INF files, which tell Setup which files, services, devices, and settings belong to the package. A yellow warning symbol in Device Manager indicates a device or driver problem, while SetupAPI logs show why installation or matching failed.",
        "Windows Recovery Environment, or WinRE, provides Startup Repair, Command Prompt, reset, and other recovery tools. ReAgentC reports and changes WinRE configuration, including enabling it and identifying its image location. Check reagentc /info before assuming recovery is present. An in-place repair installation keeps applications and user data while refreshing Windows system files, but backups and compatibility checks still come first.",
        "Major hardware changes can trigger activation checks. Confirm the installed edition, licence association, and activation status rather than repeatedly entering unrelated product keys.",
      ],
    },
  ],
  "topic-windows-security-settings-and-permissions": [
    {
      id: "windows-application-control-and-auditing",
      heading: "Windows Application Control and Auditing",
      paragraphs: [
        "A discretionary access control list, or DACL, decides who is allowed or denied access to an object. A system access control list, or SACL, decides which successful or failed access attempts Windows should audit. A SACL creates evidence only when the matching audit policy is enabled, so configure both sides and verify the resulting security events.",
        "AppLocker controls which executables, scripts, installers, packaged apps, and libraries may run through publisher, path, or file-hash rules. Start in audit-only mode, review what would be blocked, create rules for required software and administrators, then enforce deliberately. Publisher rules survive normal signed updates better than hashes; broad writable-path rules can create a bypass.",
        "User Account Control, or UAC, separates ordinary work from elevated administrative actions. Legacy per-user file and registry virtualisation can redirect some writes attempted by older unelevated applications, but it is a compatibility measure rather than a security boundary. Modern applications should write user data to approved user locations and request elevation only for genuine system changes.",
      ],
    },
  ],
  "topic-wireless-standards-and-soho-networks": [
    {
      id: "wireless-capacity-roaming-and-safe-setup",
      heading: "Wireless Capacity, Roaming, and Safe Setup",
      paragraphs: [
        "Multiple-input multiple-output, or MIMO, uses several antennas and spatial streams to send more than one data stream across the same channel when the access point, client, and radio conditions support it. OFDMA divides a channel into smaller resource units so an access point can serve multiple clients efficiently, especially when many devices send modest amounts of data.",
        "Channel planning reduces self-interference. On 2.4 GHz, channels 1, 6, and 11 are the usual non-overlapping 20 MHz choices in regions that permit them. Wider channels raise peak speed but consume more spectrum and can perform worse in a crowded area. Measure channel use and signal quality instead of choosing the highest channel number or power setting.",
        "A client normally decides when to reassociate with another access point sharing the same network name and security settings. Good roaming depends on sensible cell overlap and minimum acceptable signal, not on placing an extender exactly halfway without measuring the link. An extender must receive a clean upstream signal before it can repeat anything useful.",
        "Wi-Fi Protected Setup using a PIN has a history of design and implementation weaknesses and should be disabled when it is not required. Prefer WPA2 or WPA3 with a strong passphrase for a small network, change default administration credentials, update firmware, and keep the internet-facing WAN side separate from the trusted LAN side.",
      ],
    },
  ],
};

export function withCoverageSupplements(lesson: DeepLesson): DeepLesson {
  const additions = coverageSupplements[lesson.topicId] ?? [];
  if (additions.length === 0) return lesson;
  const existingIds = new Set(lesson.sections.map((section) => section.id).filter(Boolean));
  const existingHeadings = new Set(lesson.sections.map((section) => section.heading.trim().toLowerCase()));
  const fresh = additions.filter(
    (section) => !existingIds.has(section.id) && !existingHeadings.has(section.heading.trim().toLowerCase()),
  );
  if (fresh.length === 0) return lesson;
  return { ...lesson, sections: [...lesson.sections, ...fresh] };
}
