/**
 * Stage exams: one 20 question exam at the end of each Journey Map stage.
 *
 * The questions are authored against the same objectives the free Professor
 * Messer courses cover (A+ 220-1101 and 220-1102, Network+ N10-009,
 * Security+ SY0-701), plus the Linux, server, cloud and advanced security
 * material in the later stages of this curriculum.
 *
 * A score of 80% or higher is a pass.
 */
import type { Question } from "@/lib/app-data/types";

export const STAGE_PASS_SCORE = 80;

export interface StageExam {
  id: string;
  stage: string;
  title: string;
  description: string;
  /** Journey Map month band this exam closes. */
  from: number;
  to: number;
  questions: Question[];
}

interface Draft {
  topicId: string;
  certificationId: string;
  prompt: string;
  /** Omitted for written questions, which are typed in and marked on meaning. */
  choices?: [string, string, string, string];
  answer: string;
  /** Extra wordings accepted for a written answer. */
  accept?: string[];
  explanation: string;
}

function build(examId: string, drafts: Draft[]): Question[] {
  return drafts.map((draft, index) => ({
    id: `${examId}-q${index + 1}`,
    topicId: draft.topicId,
    quizId: examId,
    certificationId: draft.certificationId,
    type: draft.choices ? ("multiple_choice" as const) : ("short_answer" as const),
    prompt: draft.prompt,
    choices: draft.choices ? [...draft.choices] : [],
    correctAnswer: [draft.answer],
    acceptableAnswers: [draft.answer, ...(draft.accept ?? [])],
    explanation: draft.explanation,
    difficulty: "standard" as const,
    mistakeCategory: "concept" as const,
    requiresReasoning: !draft.choices,
  }));
}

const A = "cert-comptia-a-plus";
const N = "cert-comptia-network-plus";
const S = "cert-comptia-security-plus";
const L = "cert-comptia-linux-plus";
const SV = "cert-comptia-server-plus";
const C = "cert-comptia-cloud-plus";
const CY = "cert-comptia-cysa-plus";
const PT = "cert-comptia-pentest-plus";
const X = "cert-comptia-securityx";

const stage1: Draft[] = [
  {
    topicId: "topic-computer-hardware-basics",
    certificationId: A,
    prompt:
      "A technician needs one cable that carries display output, data and power delivery to a laptop dock. Which connector fits?",
    choices: [
      "USB-C with Thunderbolt support",
      "DisplayPort 1.4",
      "USB-A 3.2 Gen 2",
      "HDMI 2.1",
    ],
    answer: "USB-C with Thunderbolt support",
    explanation:
      "DisplayPort and HDMI carry video but not data and power; USB-A carries data but not display output.",
  },
  {
    topicId: "topic-computer-hardware-basics",
    certificationId: A,
    prompt: "A desktop takes DDR4 DIMMs. What happens if a DDR5 module is fitted?",
    choices: [
      "It will not seat, the notch position differs",
      "It runs at DDR4 speed",
      "It runs but only in single channel",
      "It works after a BIOS update",
    ],
    answer: "It will not seat, the notch position differs",
    explanation: "DIMM generations are keyed differently on purpose, so the wrong generation physically will not fit.",
  },
  {
    topicId: "topic-storage-technologies",
    certificationId: A,
    prompt: "Which drive interface gives an NVMe SSD its speed advantage over a SATA SSD?",
    choices: ["PCI Express lanes", "SATA 3.2", "SAS", "USB 3.2 Gen 2"],
    answer: "PCI Express lanes",
    explanation: "NVMe talks over PCIe lanes directly, well past the roughly 600 MB/s ceiling of SATA.",
  },
  {
    topicId: "topic-storage-technologies",
    certificationId: A,
    prompt: "Which RAID level mirrors data across two drives with no striping?",
    choices: ["RAID 1", "RAID 0", "RAID 5", "RAID 10"],
    answer: "RAID 1",
    explanation: "RAID 1 keeps a full copy on each drive, so either one can fail without data loss.",
  },
  {
    topicId: "topic-pc-hardware-installation",
    certificationId: A,
    prompt: "Before handling a motherboard out of the case, what is the correct precaution?",
    choices: [
      "Wear an anti-static strap bonded to a grounded point",
      "Touch the case once, then work on an anti-static mat",
      "Leave the supply plugged in but switched off and hold the heatsink",
      "Handle the board by its edges in a low humidity room",
    ],
    answer: "Wear an anti-static strap bonded to a grounded point",
    explanation:
      "Edge handling and a single case touch help, but only a bonded strap keeps you at ground the whole time.",
  },
  {
    topicId: "topic-operating-systems-overview",
    certificationId: A,
    prompt: "What is the kernel's job in an operating system?",
    choices: [
      "Mediating access to CPU, memory and devices",
      "Drawing the desktop and windows",
      "Storing user documents",
      "Installing application updates",
    ],
    answer: "Mediating access to CPU, memory and devices",
    explanation: "The kernel is the layer between programs and hardware, scheduling and enforcing access.",
  },
  {
    topicId: "topic-windows-installation-and-configuration",
    certificationId: A,
    prompt:
      "Name the Windows file system required for a boot volume with permissions and journaling.",
    answer: "NTFS",
    accept: ["ntfs file system"],
    explanation: "NTFS supports permissions, journaling and large files; FAT32 and exFAT support none of the first two.",
  },
  {
    topicId: "topic-windows-administration-tools",
    certificationId: A,
    prompt: "A service fails to start at boot. Which built-in tool shows the recorded reason?",
    choices: ["Event Viewer", "Disk Cleanup", "Resource Monitor", "Device Manager"],
    answer: "Event Viewer",
    explanation: "Service start failures are logged in the System log with an error code and message.",
  },
  {
    topicId: "topic-command-line-fundamentals",
    certificationId: A,
    prompt:
      "Type the Windows command that shows the full IP configuration of every adapter, including DNS servers.",
    answer: "ipconfig /all",
    accept: ["ipconfig all", "ipconfig/all"],
    explanation: "The /all switch adds DNS, DHCP, MAC and lease detail that plain ipconfig leaves out.",
  },
  {
    topicId: "topic-troubleshooting-methodology",
    certificationId: A,
    prompt:
      "In the CompTIA troubleshooting method, describe in your own words what you do directly after establishing a theory of probable cause.",
    answer: "Test the theory to determine the cause",
    accept: ["test the theory", "test it to confirm the cause"],
    explanation: "A theory is only a guess until it is tested; the plan of action comes after it is confirmed.",
  },
  {
    topicId: "topic-software-troubleshooting",
    certificationId: A,
    prompt: "An application crashes only for one user on a shared machine. What does that point at first?",
    choices: [
      "That user's profile or per-user settings",
      "A failing power supply",
      "A corrupt system file",
      "An incompatible CPU",
    ],
    answer: "That user's profile or per-user settings",
    explanation: "A fault confined to one account lives in that account's profile, not in shared system components.",
  },
  {
    topicId: "topic-endpoint-security-fundamentals",
    certificationId: A,
    prompt:
      "Explain in a sentence what ransomware does to a victim system.",
    answer: "It encrypts files and demands a payment to restore access",
    accept: ["encrypts data and demands payment", "locks files until a ransom is paid"],
    explanation: "Ransomware denies access to your own data until a payment is made, and tested backups are the real defence.",
  },
  {
    topicId: "topic-mobile-devices-and-laptops",
    certificationId: A,
    prompt: "A laptop runs only when the charger is connected and shows 0% battery. What is the likely cause?",
    choices: [
      "A failed battery pack",
      "A faulty display panel",
      "Bad system RAM",
      "A corrupt operating system",
    ],
    answer: "A failed battery pack",
    explanation: "Power from the adapter but no charge held is the classic sign of a dead battery cell or charge circuit.",
  },
  {
    topicId: "topic-mobile-connectivity",
    certificationId: A,
    prompt: "Which pairing step confirms a Bluetooth connection is with the intended device?",
    choices: [
      "Matching the confirmation code on both devices",
      "Turning airplane mode on",
      "Clearing the browser cache",
      "Disabling Wi-Fi",
    ],
    answer: "Matching the confirmation code on both devices",
    explanation: "The shared numeric comparison confirms both ends are the devices you think they are.",
  },
  {
    topicId: "topic-printers-and-peripherals",
    certificationId: A,
    prompt:
      "Pages from a laser printer smudge when rubbed. Name the assembly at fault and say what it does.",
    answer: "The fuser bonds toner to the page with heat and pressure",
    accept: ["fuser", "fuser assembly heat pressure"],
    explanation: "The fuser bonds toner to the page with heat and pressure; unfused toner rubs straight off.",
  },
  {
    topicId: "topic-virtualization-basics",
    certificationId: A,
    prompt: "What does a type 1 hypervisor run on?",
    choices: [
      "Directly on the hardware",
      "On top of a desktop operating system",
      "Inside a web browser",
      "Inside another virtual machine only",
    ],
    answer: "Directly on the hardware",
    explanation: "A bare metal hypervisor removes the host operating system layer, which is why servers use it.",
  },
  {
    topicId: "topic-binary-and-number-systems",
    certificationId: A,
    prompt:
      "Write the decimal value of the binary number 11010.",
    answer: "26",
    accept: ["26 "],
    explanation: "16 + 8 + 0 + 2 + 0 equals 26.",
  },
  {
    topicId: "topic-basic-networking-concepts",
    certificationId: N,
    prompt: "Which address is used to deliver a frame on the local network segment?",
    choices: ["The MAC address", "The IPv4 address", "The default gateway", "The DNS name"],
    answer: "The MAC address",
    explanation: "Layer 2 delivery uses MAC addressing; IP addressing takes over between networks.",
  },
  {
    topicId: "topic-dns-fundamentals",
    certificationId: N,
    prompt:
      "A remote support tool connects over RDP. Which port must be reachable through the firewall?",
    choices: ["3389", "3306", "5900", "445"],
    answer: "3389",
    explanation:
      "3389 is RDP, 5900 is VNC, 3306 is MySQL and 445 is SMB, all of which appear in remote access tickets.",
  },
  {
    topicId: "topic-operational-procedures-and-safety",
    certificationId: A,
    prompt: "A change is needed on a production system. What should exist before it is made?",
    choices: [
      "An approved change request with a rollback plan",
      "A tested backup of the affected system",
      "A maintenance window agreed with the service desk",
      "A configuration export saved to the ticket",
    ],
    answer: "An approved change request with a rollback plan",
    explanation:
      "The others are sensible parts of the work, but the approved request with a rollback plan is what change management requires first.",
  },
];

const stage2: Draft[] = [
  {
    topicId: "topic-osi-model-and-encapsulation",
    certificationId: N,
    prompt: "At which OSI layer does a router make its forwarding decision?",
    choices: ["Layer 3", "Layer 2", "Layer 4", "Layer 7"],
    answer: "Layer 3",
    explanation: "Routers forward on IP addressing, which is the network layer.",
  },
  {
    topicId: "topic-osi-model-and-encapsulation",
    certificationId: N,
    prompt: "What is the correct term for a layer 4 TCP data unit?",
    choices: ["Segment", "Frame", "Packet", "Bit"],
    answer: "Segment",
    explanation: "TCP produces segments, IP produces packets, and Ethernet produces frames.",
  },
  {
    topicId: "topic-ethernet-switching-and-vlans",
    certificationId: N,
    prompt:
      "Name the standard that tags frames so several VLANs can share one link.",
    answer: "802.1Q",
    accept: ["dot1q", "8021q"],
    explanation: "802.1Q inserts the VLAN tag; 802.1X is port authentication and 802.3af is Power over Ethernet.",
  },
  {
    topicId: "topic-ethernet-switching-and-vlans",
    certificationId: N,
    prompt: "What problem does Spanning Tree Protocol prevent?",
    choices: [
      "Switching loops and broadcast storms",
      "IP address conflicts",
      "DNS poisoning",
      "Duplicate MAC vendor codes",
    ],
    answer: "Switching loops and broadcast storms",
    explanation: "STP blocks redundant paths so frames cannot circulate endlessly.",
  },
  {
    topicId: "topic-ip-addressing-and-subnetting",
    certificationId: N,
    prompt:
      "How many usable host addresses does a /27 subnet provide? Write the number.",
    answer: "30",
    accept: ["30 hosts"],
    explanation: "A /27 has 32 addresses, less the network and broadcast addresses, which leaves 30.",
  },
  {
    topicId: "topic-ip-addressing-and-subnetting",
    certificationId: N,
    prompt: "A host shows 169.254.14.9. What does that tell you?",
    choices: [
      "It failed to reach a DHCP server",
      "It has a static public address",
      "It is on a guest VLAN",
      "Its DNS server is down",
    ],
    answer: "It failed to reach a DHCP server",
    explanation: "169.254.x.x is APIPA, self-assigned when no DHCP lease was obtained.",
  },
  {
    topicId: "topic-routing-fundamentals",
    certificationId: N,
    prompt: "Which route is chosen when two routes to the same destination exist?",
    choices: [
      "The one with the longest prefix match",
      "The one learned most recently",
      "The one with the lowest MAC address",
      "The one with the largest MTU",
    ],
    answer: "The one with the longest prefix match",
    explanation: "The most specific prefix wins before metrics or administrative distance are compared.",
  },
  {
    topicId: "topic-routing-fundamentals",
    certificationId: N,
    prompt:
      "Name the routing protocol used between autonomous systems on the internet.",
    answer: "BGP",
    accept: ["border gateway protocol"],
    explanation: "BGP is the exterior gateway protocol; OSPF, RIP and EIGRP operate inside an organisation.",
  },
  {
    topicId: "topic-network-services-and-protocols",
    certificationId: N,
    prompt:
      "Write the port number DNS uses for standard name queries.",
    answer: "53",
    accept: ["port 53"],
    explanation: "DNS uses 53, DHCP uses 67 and 68, SNMP uses 161 and LDAP uses 389.",
  },
  {
    topicId: "topic-network-services-and-protocols",
    certificationId: N,
    prompt: "What does a DHCP reservation do?",
    choices: [
      "Always hands the same address to a given MAC",
      "Blocks a device from the network",
      "Shortens the lease for all clients",
      "Assigns a public address",
    ],
    answer: "Always hands the same address to a given MAC",
    explanation: "A reservation ties an address to a hardware address while still using DHCP.",
  },
  {
    topicId: "topic-wireless-and-network-troubleshooting",
    certificationId: N,
    prompt:
      "List the three non-overlapping 2.4 GHz channels used in North America.",
    answer: "1, 6 and 11",
    accept: ["1 6 11"],
    explanation: "Those three are far enough apart in frequency to avoid co-channel interference.",
  },
  {
    topicId: "topic-wireless-and-network-troubleshooting",
    certificationId: N,
    prompt: "Users can reach servers by IP but not by name. Where would you look first?",
    choices: ["DNS resolution", "The default gateway", "The switch port speed", "Cable length"],
    answer: "DNS resolution",
    explanation: "Working IP connectivity with failing names isolates the fault to name resolution.",
  },
  {
    topicId: "topic-security-principles-and-threats",
    certificationId: S,
    prompt: "Which part of the CIA triad does a ransomware attack most directly break?",
    choices: ["Availability", "Non-repudiation", "Authentication", "Accounting"],
    answer: "Availability",
    explanation: "Encrypting the data denies access to it, which is an availability loss first of all.",
  },
  {
    topicId: "topic-security-principles-and-threats",
    certificationId: S,
    prompt:
      "An attacker sends a tailored email to the finance director alone. Name this attack and say what makes it different from ordinary phishing.",
    answer: "Spear phishing, it targets a named individual with tailored detail",
    accept: ["spear phishing", "targeted phishing at one person"],
    explanation: "Spear phishing targets a named individual with tailored detail rather than a mass mailing.",
  },
  {
    topicId: "topic-cryptography-fundamentals",
    certificationId: S,
    prompt: "Which key signs a message so the recipient can prove who sent it?",
    choices: [
      "The sender's private key",
      "The sender's public key",
      "The recipient's private key",
      "A shared symmetric key",
    ],
    answer: "The sender's private key",
    explanation: "Only the sender holds that key, so a signature it produces verifies with their public key.",
  },
  {
    topicId: "topic-cryptography-fundamentals",
    certificationId: S,
    prompt: "What does salting a stored password protect against?",
    choices: [
      "Precomputed rainbow table attacks",
      "Network sniffing",
      "Session hijacking",
      "SQL injection",
    ],
    answer: "Precomputed rainbow table attacks",
    explanation: "A unique salt per password makes precomputed hash tables useless.",
  },
  {
    topicId: "topic-identity-and-access-management",
    certificationId: S,
    prompt: "Which combination counts as genuine multi-factor authentication?",
    choices: [
      "A password and a hardware token code",
      "A password and a security question",
      "A PIN and a password",
      "Two different passwords",
    ],
    answer: "A password and a hardware token code",
    explanation: "Two factors must come from different categories: something you know and something you have.",
  },
  {
    topicId: "topic-network-security-controls",
    certificationId: S,
    prompt: "What does a network segment created for public-facing servers do?",
    choices: [
      "Keeps exposed services away from the internal network",
      "Speeds up internal file transfers",
      "Removes the need for a firewall",
      "Assigns public addresses to every workstation",
    ],
    answer: "Keeps exposed services away from the internal network",
    explanation: "A screened subnet limits what an attacker reaches if a public server is compromised.",
  },
  {
    topicId: "topic-risk-governance-and-compliance",
    certificationId: S,
    prompt: "Buying insurance against a breach is an example of which risk response?",
    choices: ["Transference", "Avoidance", "Acceptance", "Mitigation"],
    answer: "Transference",
    explanation: "The financial consequence moves to another party, though the risk itself remains.",
  },
  {
    topicId: "topic-incident-response-fundamentals",
    certificationId: S,
    prompt: "Which incident response phase comes directly after identification?",
    choices: ["Containment", "Recovery", "Lessons learned", "Preparation"],
    answer: "Containment",
    explanation: "Once an incident is confirmed, the first job is to stop it spreading before eradication.",
  },
];

const stage3: Draft[] = [
  {
    topicId: "topic-linux-filesystem-and-permissions",
    certificationId: L,
    prompt:
      "Describe the access chmod 640 gives to the owner, the group and everyone else.",
    answer: "Owner read and write, group read, others none",
    accept: ["owner rw group r others none", "read write for owner, read for group, nothing for others"],
    explanation: "6 is read plus write, 4 is read, and 0 is no access.",
  },
  {
    topicId: "topic-linux-filesystem-and-permissions",
    certificationId: L,
    prompt:
      "Name the Linux directory that holds system-wide configuration files.",
    answer: "/etc",
    accept: ["etc"],
    explanation: "/etc holds configuration, /var holds changing data and /proc exposes kernel state.",
  },
  {
    topicId: "topic-linux-package-and-service-management",
    certificationId: L,
    prompt: "Which command shows whether a systemd service is running and why it failed?",
    choices: ["systemctl status sshd", "service list", "ps aux | grep systemd", "journal --all"],
    answer: "systemctl status sshd",
    explanation: "systemctl status prints the state plus the most recent log lines for that unit.",
  },
  {
    topicId: "topic-linux-package-and-service-management",
    certificationId: L,
    prompt: "Which command installs a package on a Debian based system?",
    choices: ["apt install nginx", "yum add nginx", "rpm --sync nginx", "pkg get nginx"],
    answer: "apt install nginx",
    explanation: "Debian and Ubuntu use apt with dpkg underneath; yum and rpm belong to Red Hat systems.",
  },
  {
    topicId: "topic-bash-scripting-and-automation",
    certificationId: L,
    prompt: "What does the shebang line #!/bin/bash at the top of a script do?",
    choices: [
      "Names the interpreter that runs the script",
      "Comments out the first command",
      "Grants the script execute permission",
      "Sets the script to run as root",
    ],
    answer: "Names the interpreter that runs the script",
    explanation: "The kernel reads that line to decide which program executes the file.",
  },
  {
    topicId: "topic-bash-scripting-and-automation",
    certificationId: L,
    prompt:
      "In a cron entry, what schedule does 0 3 * * * describe?",
    answer: "Every day at 03:00",
    accept: ["daily at 3am", "every day at three in the morning"],
    explanation: "The fields are minute, hour, day of month, month and day of week.",
  },
  {
    topicId: "topic-linux-networking-and-troubleshooting",
    certificationId: L,
    prompt: "Which command lists listening TCP sockets and the processes behind them?",
    choices: ["ss -tlnp", "ping -c 4", "ip route show", "df -h"],
    answer: "ss -tlnp",
    explanation: "ss with those flags shows TCP listeners numerically with owning process names.",
  },
  {
    topicId: "topic-linux-networking-and-troubleshooting",
    certificationId: L,
    prompt: "A disk is full but deleting files does not free space. What is the usual reason?",
    choices: [
      "A process still holds the deleted file open",
      "The filesystem is read only",
      "Swap is exhausted",
      "The inode size is wrong",
    ],
    answer: "A process still holds the deleted file open",
    explanation: "Space returns only when the last file handle closes, which is why lsof finds these cases.",
  },
  {
    topicId: "topic-server-hardware-and-storage-arrays",
    certificationId: SV,
    prompt:
      "Name the RAID level that stripes with distributed parity and survives one drive failure.",
    answer: "RAID 5",
    accept: ["raid5"],
    explanation: "RAID 5 spreads parity across members, so one member can be lost and rebuilt.",
  },
  {
    topicId: "topic-server-hardware-and-storage-arrays",
    certificationId: SV,
    prompt: "Why do servers use ECC memory?",
    choices: [
      "It detects and corrects single bit errors",
      "It runs at higher clock speeds",
      "It uses less power",
      "It needs no memory controller",
    ],
    answer: "It detects and corrects single bit errors",
    explanation: "Silent bit flips corrupt long running workloads, so correction matters more than speed.",
  },
  {
    topicId: "topic-windows-server-and-active-directory",
    certificationId: SV,
    prompt: "What is the purpose of an Active Directory organisational unit?",
    choices: [
      "Grouping objects so policy can be applied to them",
      "Replicating the database between sites",
      "Holding the DNS zone file",
      "Storing password hashes",
    ],
    answer: "Grouping objects so policy can be applied to them",
    explanation: "Group Policy links to OUs, which is the main reason to create them.",
  },
  {
    topicId: "topic-windows-server-and-active-directory",
    certificationId: SV,
    prompt:
      "Name the protocol Active Directory uses for authentication by default.",
    answer: "Kerberos",
    accept: ["kerberos tickets"],
    explanation: "Kerberos ticketing is the default; NTLM remains only as a fallback.",
  },
  {
    topicId: "topic-backup-and-disaster-recovery",
    certificationId: SV,
    prompt:
      "Explain what a recovery point objective defines.",
    answer: "How much data loss is acceptable, measured in time since the last good copy",
    accept: ["acceptable data loss", "how much data you can afford to lose"],
    explanation: "RPO is measured in time since the last good copy; RTO is how long restoration may take.",
  },
  {
    topicId: "topic-backup-and-disaster-recovery",
    certificationId: SV,
    prompt: "What does the 3-2-1 backup rule require?",
    choices: [
      "Three copies, two media types, one off site",
      "Three servers, two sites, one admin",
      "Three full backups a week",
      "Three encryption keys",
    ],
    answer: "Three copies, two media types, one off site",
    explanation: "It protects against media failure and against losing the site itself.",
  },
  {
    topicId: "topic-monitoring-and-patch-management",
    certificationId: SV,
    prompt: "Why are patches tested in a staging environment first?",
    choices: [
      "To catch breakage before production is affected",
      "To reduce the download size",
      "To satisfy the vendor licence",
      "To avoid needing a reboot",
    ],
    answer: "To catch breakage before production is affected",
    explanation: "A patch can fix a vulnerability and break an application at the same time.",
  },
  {
    topicId: "topic-cloud-service-models-and-deployment",
    certificationId: C,
    prompt: "In infrastructure as a service, what does the customer remain responsible for?",
    choices: [
      "The guest operating system and everything above it",
      "The physical hypervisor hosts",
      "The data centre power",
      "The storage array firmware",
    ],
    answer: "The guest operating system and everything above it",
    explanation: "The shared responsibility line in IaaS sits just above the virtual machine boundary.",
  },
  {
    topicId: "topic-cloud-compute-and-networking",
    certificationId: C,
    prompt: "What does an auto scaling group do?",
    choices: [
      "Adds and removes instances to match demand",
      "Encrypts traffic between regions",
      "Balances storage across disks",
      "Rotates access keys",
    ],
    answer: "Adds and removes instances to match demand",
    explanation: "Capacity follows a measured signal such as CPU or queue depth.",
  },
  {
    topicId: "topic-cloud-identity-and-security",
    certificationId: C,
    prompt: "Which practice best limits damage from a leaked cloud credential?",
    choices: [
      "Least privilege roles with short lived credentials",
      "One shared administrator account",
      "Long lived static access keys",
      "Allowing all actions inside one account",
    ],
    answer: "Least privilege roles with short lived credentials",
    explanation: "Narrow permissions and expiry reduce both the reach and the lifetime of a leak.",
  },
  {
    topicId: "topic-containers-and-infrastructure-as-code",
    certificationId: C,
    prompt: "How does a container differ from a virtual machine?",
    choices: [
      "It shares the host kernel instead of running its own",
      "It cannot be networked",
      "It always needs more memory",
      "It runs only on Windows",
    ],
    answer: "It shares the host kernel instead of running its own",
    explanation: "That shared kernel is why containers start in moments and stay small.",
  },
  {
    topicId: "topic-containers-and-infrastructure-as-code",
    certificationId: C,
    prompt: "What is the main benefit of declarative infrastructure as code?",
    choices: [
      "The same definition rebuilds the same environment",
      "It removes the need for backups",
      "It encrypts all traffic automatically",
      "It eliminates cloud costs",
    ],
    answer: "The same definition rebuilds the same environment",
    explanation: "Describing the desired state makes environments repeatable and reviewable.",
  },
];

const stage4: Draft[] = [
  {
    topicId: "topic-security-monitoring-and-siem",
    certificationId: CY,
    prompt: "What does a SIEM add beyond collecting logs?",
    choices: [
      "Correlation of events across sources into alerts",
      "Automatic patching of endpoints",
      "Encryption of stored files",
      "Network address translation",
    ],
    answer: "Correlation of events across sources into alerts",
    explanation: "Value comes from tying separate events together into one detectable pattern.",
  },
  {
    topicId: "topic-security-monitoring-and-siem",
    certificationId: CY,
    prompt: "An alert fires on normal administrator activity. What is it?",
    choices: ["A false positive", "A true positive", "A false negative", "A true negative"],
    answer: "A false positive",
    explanation: "The rule fired without a real threat, which is what tuning is meant to reduce.",
  },
  {
    topicId: "topic-log-analysis-and-detection-engineering",
    certificationId: CY,
    prompt: "Which log source best shows a process spawning an unexpected child on Windows?",
    choices: [
      "Endpoint process creation events",
      "DHCP server logs",
      "Printer spooler logs",
      "NTP sync logs",
    ],
    answer: "Endpoint process creation events",
    explanation: "Process creation records the parent and command line, which is where this pattern shows.",
  },
  {
    topicId: "topic-log-analysis-and-detection-engineering",
    certificationId: CY,
    prompt: "Why is accurate time synchronisation essential for log analysis?",
    choices: [
      "Events from different systems must line up in order",
      "It reduces log storage size",
      "It encrypts log transport",
      "It prevents log tampering entirely",
    ],
    answer: "Events from different systems must line up in order",
    explanation: "Without a shared clock you cannot build a reliable sequence of what happened.",
  },
  {
    topicId: "topic-threat-intelligence-and-hunting",
    certificationId: CY,
    prompt: "What distinguishes threat hunting from alert triage?",
    choices: [
      "It starts from a hypothesis rather than an alert",
      "It only uses automated tooling",
      "It runs only after an incident closes",
      "It ignores endpoint data",
    ],
    answer: "It starts from a hypothesis rather than an alert",
    explanation: "Hunting looks for activity no rule has caught yet, driven by a stated theory.",
  },
  {
    topicId: "topic-threat-intelligence-and-hunting",
    certificationId: CY,
    prompt:
      "Name the framework that maps adversary tactics and techniques so detection coverage can be measured.",
    answer: "MITRE ATT&CK",
    accept: ["attack framework", "mitre attack"],
    explanation: "ATT&CK catalogues observed behaviours, so coverage can be measured against it.",
  },
  {
    topicId: "topic-vulnerability-management",
    certificationId: CY,
    prompt: "Beyond the CVSS score, what most affects how urgently a vulnerability is fixed?",
    choices: [
      "Exposure and business criticality of the asset",
      "The alphabetical order of the CVE",
      "The scanner vendor",
      "The age of the operating system licence",
    ],
    answer: "Exposure and business criticality of the asset",
    explanation: "A high score on an isolated lab host matters less than a medium on an exposed system.",
  },
  {
    topicId: "topic-vulnerability-management",
    certificationId: CY,
    prompt: "What is a credentialed vulnerability scan?",
    choices: [
      "A scan that logs in to inspect the host from inside",
      "A scan run only from the internet",
      "A scan of credentials in a password store",
      "A scan that requires no authorisation",
    ],
    answer: "A scan that logs in to inspect the host from inside",
    explanation: "Authenticated scans see patch levels and configuration that external probing cannot.",
  },
  {
    topicId: "topic-penetration-testing-methodology",
    certificationId: PT,
    prompt: "What must be agreed in writing before any testing begins?",
    choices: [
      "Scope, rules of engagement and authorisation",
      "The final report format only",
      "The tester's tooling licences",
      "The client's marketing plan",
    ],
    answer: "Scope, rules of engagement and authorisation",
    explanation: "Without written authorisation and scope the activity is not a legal test.",
  },
  {
    topicId: "topic-penetration-testing-methodology",
    certificationId: PT,
    prompt: "Which activity belongs to passive reconnaissance?",
    choices: [
      "Reviewing public DNS and company filings",
      "Running a full port scan",
      "Sending phishing emails",
      "Brute forcing a login page",
    ],
    answer: "Reviewing public DNS and company filings",
    explanation: "Passive work never touches the target's systems directly.",
  },
  {
    topicId: "topic-exploitation-and-reporting",
    certificationId: PT,
    prompt: "What makes a penetration test finding useful to the client?",
    choices: [
      "Reproducible evidence with impact and remediation",
      "The name of the exploit tool",
      "A raw scanner export",
      "A screenshot with no context",
    ],
    answer: "Reproducible evidence with impact and remediation",
    explanation: "A finding must be verifiable, explain the business impact and say how to fix it.",
  },
  {
    topicId: "topic-exploitation-and-reporting",
    certificationId: PT,
    prompt:
      "Explain what lateral movement means during an intrusion.",
    answer: "Moving from one compromised host to others inside the network",
    accept: ["spreading to other machines internally"],
    explanation: "It is how a single foothold becomes access across the estate.",
  },
  {
    topicId: "topic-security-architecture-and-zero-trust",
    certificationId: X,
    prompt:
      "State the central assumption of a zero trust architecture.",
    answer: "No request is trusted by network location alone",
    accept: ["never trust always verify", "trust nothing by default"],
    explanation: "Every request is authenticated and authorised on its own merits.",
  },
  {
    topicId: "topic-security-architecture-and-zero-trust",
    certificationId: X,
    prompt: "Which control most directly limits blast radius after a compromise?",
    choices: [
      "Microsegmentation between workloads",
      "A longer password policy",
      "More frequent vulnerability scans",
      "Longer log retention",
    ],
    answer: "Microsegmentation between workloads",
    explanation: "Tight segmentation stops a single compromise reaching the rest of the estate.",
  },
  {
    topicId: "topic-cloud-and-identity-attack-defense",
    certificationId: X,
    prompt: "Which attack abuses a stolen authentication token rather than a password?",
    choices: [
      "Token replay against a cloud service",
      "Offline hash cracking",
      "ARP spoofing",
      "Port scanning",
    ],
    answer: "Token replay against a cloud service",
    explanation: "A valid token can bypass the login step entirely, which is why binding and expiry matter.",
  },
  {
    topicId: "topic-cloud-and-identity-attack-defense",
    certificationId: X,
    prompt: "What does conditional access evaluate before granting a session?",
    choices: [
      "Signals such as device state, location and risk",
      "Only the username",
      "Only the time of day",
      "Only the browser version",
    ],
    answer: "Signals such as device state, location and risk",
    explanation: "Access decisions combine identity with the context of the request.",
  },
  {
    topicId: "topic-enterprise-risk-and-security-program",
    certificationId: X,
    prompt:
      "Explain what residual risk means.",
    answer: "The risk left after controls are applied",
    accept: ["what remains after mitigation"],
    explanation: "Controls reduce risk; what remains has to be accepted or treated further.",
  },
  {
    topicId: "topic-enterprise-risk-and-security-program",
    certificationId: X,
    prompt: "Which metric best shows a security programme is improving operationally?",
    choices: [
      "Falling mean time to detect and respond",
      "The number of tools purchased",
      "The size of the policy document",
      "Headcount in the security team",
    ],
    answer: "Falling mean time to detect and respond",
    explanation: "Detection and response speed measures outcomes rather than spending.",
  },
  {
    topicId: "topic-advanced-incident-response-and-forensics",
    certificationId: X,
    prompt:
      "State the order evidence is collected in during forensics and give an example.",
    answer: "Most volatile first, for example memory before disk",
    accept: ["order of volatility", "volatile data first then disk"],
    explanation: "Volatile data disappears on shutdown, so it is captured before persistent storage.",
  },
  {
    topicId: "topic-advanced-incident-response-and-forensics",
    certificationId: X,
    prompt:
      "Explain why a chain of custody record is kept.",
    answer: "To prove evidence was handled without tampering",
    accept: ["shows who handled evidence and when", "keeps evidence admissible"],
    explanation: "Every transfer is documented so the evidence holds up later.",
  },
];

export const stageExams: StageExam[] = [
  {
    id: "stage-exam-1",
    stage: "Stage 1",
    title: "Stage 1 exam: Foundations and CompTIA A+",
    description:
      "Twenty questions across hardware, operating systems, troubleshooting, mobile devices and safety, matched to the A+ 220-1101 and 220-1102 objectives covered in the Professor Messer course.",
    from: 1,
    to: 7,
    questions: build("stage-exam-1", stage1),
  },
  {
    id: "stage-exam-2",
    stage: "Stage 2",
    title: "Stage 2 exam: Networking and Security",
    description:
      "Twenty questions across the OSI model, switching, subnetting, routing, network services, wireless and the Security+ core, matched to the Network+ N10-009 and Security+ SY0-701 objectives in the Professor Messer courses.",
    from: 8,
    to: 13,
    questions: build("stage-exam-2", stage2),
  },
  {
    id: "stage-exam-3",
    stage: "Stage 3",
    title: "Stage 3 exam: Linux, Servers and Cloud",
    description:
      "Twenty questions across the Linux filesystem, services, scripting, server hardware, directory services, backup, monitoring, cloud models and containers.",
    from: 14,
    to: 19,
    questions: build("stage-exam-3", stage3),
  },
  {
    id: "stage-exam-4",
    stage: "Stage 4",
    title: "Stage 4 exam: Advanced Security and Career",
    description:
      "Twenty questions across monitoring and SIEM, detection engineering, threat hunting, vulnerability management, penetration testing, zero trust, risk leadership and forensics.",
    from: 20,
    to: 24,
    questions: build("stage-exam-4", stage4),
  },
];

export function getStageExam(id: string): StageExam | undefined {
  return stageExams.find((exam) => exam.id === id);
}
