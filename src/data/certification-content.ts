import type { Certification, CertificationObjective, EntityId } from "@/lib/app-data/types";
import { domainOverlay } from "@/data/domain-overlay";

/**
 * Certification objectives are plain data. The UI never hard-codes them:
 * it reads this file and merges the learner's own edits from user data.
 */

type ObjectiveSeed = [code: string, domain: string, title: string, topicIds: EntityId[]];

interface CertSeed {
  id: EntityId;
  title: string;
  code: string;
  provider: string;
  level: "core" | "infrastructure" | "security" | "advanced";
  description: string;
  objectives: ObjectiveSeed[];
}

const T = {
  hardware: "topic-computer-hardware-basics",
  os: "topic-operating-systems-overview",
  netBasic: "topic-basic-networking-concepts",
  cli: "topic-command-line-fundamentals",
  virt: "topic-virtualization-basics",
  career: "topic-it-career-overview",
  // Networking Basics was merged into Basic Networking Concepts. Keep every
  // certification objective attached to the surviving topic.
  net: "topic-basic-networking-concepts",
  dns: "topic-dns-fundamentals",
  binary: "topic-binary-and-number-systems",
  method: "topic-troubleshooting-methodology",
  prog: "topic-programming-and-development-concepts",
  data: "topic-data-and-database-fundamentals",
  apps: "topic-software-applications-and-licensing",
  cia: "topic-security-fundamentals-cia",
  install: "topic-pc-hardware-installation",
  storage: "topic-storage-technologies",
  laptops: "topic-mobile-devices-and-laptops",
  printers: "topic-printers-and-peripherals",
  winInstall: "topic-windows-installation-and-configuration",
  winAdmin: "topic-windows-administration-tools",
  winSec: "topic-windows-security-settings",
  winBoot: "topic-windows-boot-and-crash-troubleshooting",
  macLinux: "topic-macos-and-linux-clients",
  softFix: "topic-software-troubleshooting",
  endpoint: "topic-endpoint-security-fundamentals",
  procedures: "topic-operational-procedures-and-safety",
  mobileHw: "topic-mobile-hardware-and-components",
  mobileNet: "topic-mobile-connectivity",
  mobileApps: "topic-mobile-configuration-and-apps",
  mobileSec: "topic-mobile-security-and-mdm",
  mobileFix: "topic-mobile-troubleshooting",
  wireless: "topic-wireless-standards-and-soho-networks",
  cabling: "topic-network-cabling-and-connectors",
  scripting: "topic-scripting-basics-for-support",
  ad: "topic-active-directory-and-domain-services",
  clientVirt: "topic-client-virtualization-and-cloud-basics",
};

const seeds: CertSeed[] = [
  {
    id: "cert-comptia-tech-plus",
    title: "Technology Foundations",
    code: "FC0-U71",
    provider: "CompTIA",
    level: "core",
    description: "Build a strong foundation in how computers, software, networks and data work together, while exploring the kinds of problems IT professionals solve.",
    objectives: [
      ["1.1", "IT Concepts", "Explain computing basics, notational systems and units", [T.hardware, T.binary]],
      ["1.2", "IT Concepts", "Apply a structured troubleshooting method", [T.method]],
      ["2.1", "Infrastructure", "Identify common hardware components and connections", [T.hardware, T.install]],
      ["2.2", "Infrastructure", "Explain basic networking concepts and internet service types", [T.netBasic, T.net]],
      ["2.3", "Infrastructure", "Explain storage, capacity and virtualization basics", [T.hardware, T.virt]],
      ["3.1", "Applications and Software", "Compare operating system types and their roles", [T.os, T.virt]],
      ["3.2", "Applications and Software", "Use the command line for simple file and system tasks", [T.cli]],
      ["3.3", "Applications and Software", "Install and license applications correctly", [T.apps]],
      ["4.1", "Software Development", "Explain programming logic, data types and scripting basics", [T.prog]],
      ["5.1", "Data and Database", "Explain data value, database structure and query basics", [T.data]],
      ["5.2", "Data and Database", "Explain backup, retention and restore testing", [T.data]],
      ["6.1", "Security", "Apply confidentiality, integrity and availability to everyday practice", [T.cia]],
      ["6.2", "Security", "Explain authentication factors and account hygiene", [T.cia]],
      ["6.3", "Career", "Describe IT support roles, ticketing and professional conduct", [T.career]],
    ],
  },
  {
    id: "cert-comptia-a-plus",
    title: "Computer Systems & Support",
    code: "220-1201/1202",
    provider: "CompTIA",
    level: "core",
    description: "Learn how computers and devices work, how operating systems are managed, and how to troubleshoot the everyday hardware, software and support problems you will encounter in IT.",
    objectives: [
      ["1.1", "Mobile Devices", "Install and configure laptop hardware and components", [T.laptops, T.mobileHw]],
      ["1.2", "Mobile Devices", "Configure mobile device connectivity, apps and synchronisation", [T.mobileNet, T.mobileApps]],
      ["2.1", "Networking", "Explain addressing, DHCP, DNS and common ports", [T.netBasic, T.dns]],
      ["2.2", "Networking", "Compare 802.11 standards and configure a SOHO network", [T.wireless]],
      ["2.3", "Networking", "Identify network cable types, connectors and tools", [T.cabling]],
      ["3.1", "Hardware", "Identify system components, cables and connectors", [T.hardware, T.install]],
      ["3.2", "Hardware", "Install and replace storage, memory and power components", [T.install, T.storage]],
      ["3.3", "Hardware", "Install, configure and troubleshoot printers", [T.printers]],
      ["4.1", "Virtualization and Cloud", "Describe client-side virtualization and cloud models", [T.clientVirt, T.virt]],
      ["5.1", "Hardware Troubleshooting", "Diagnose hardware, storage and display faults", [T.install, T.storage]],
      ["5.2", "Hardware Troubleshooting", "Diagnose mobile device hardware problems", [T.mobileFix]],
      ["6.1", "Operating Systems", "Install and configure Windows", [T.winInstall]],
      ["6.2", "Operating Systems", "Use Windows management and command line tools", [T.winAdmin, T.cli]],
      ["6.3", "Operating Systems", "Compare macOS and Linux client features", [T.macLinux]],
      ["6.4", "Operating Systems", "Configure domain membership, group policy and shares", [T.ad]],
      ["7.1", "Security", "Apply endpoint security, malware removal and browser hardening", [T.endpoint]],
      ["7.2", "Security", "Configure Windows security settings and NTFS permissions", [T.winSec]],
      ["7.3", "Security", "Secure mobile devices and apply mobile device management", [T.mobileSec]],
      ["8.1", "Software Troubleshooting", "Diagnose application and operating system faults", [T.softFix]],
      ["8.2", "Software Troubleshooting", "Diagnose boot failures and stop errors", [T.winBoot]],
      ["9.1", "Operational Procedures", "Apply ticketing, documentation, safety and communication practices", [T.procedures, T.career]],
      ["9.2", "Operational Procedures", "Explain scripting use cases and the risks of running scripts", [T.scripting]],
      ["9.3", "Operational Procedures", "Apply the CompTIA troubleshooting methodology", [T.method]],
    ],
  },
  {
    id: "cert-comptia-network-plus",
    title: "Networking & Infrastructure",
    code: "N10-009",
    provider: "CompTIA",
    level: "infrastructure",
    description: "Understand how devices communicate across networks, from cabling and addressing to switching, routing and core services, then learn how to track down connectivity problems.",
    objectives: [
      ["1.1", "Networking Concepts", "Explain the OSI and TCP/IP models", [T.netBasic, T.net]],
      ["1.2", "Networking Concepts", "Describe switching, routing and broadcast domains", [T.net]],
      ["1.3", "Networking Concepts", "Explain DNS resolution and record types", [T.dns]],
      ["2.1", "Implementation", "Configure IPv4 addressing and DHCP scopes", [T.netBasic]],
      ["2.2", "Implementation", "Document cabling, VLANs and network topology", [T.net]],
      ["3.1", "Operations", "Use monitoring and command line network tools", [T.cli, T.net]],
      ["4.1", "Security", "Apply basic network hardening measures", [T.net]],
      ["5.1", "Troubleshooting", "Diagnose connectivity and name resolution faults", [T.dns, T.net]],
    ],
  },
  {
    id: "cert-comptia-security-plus",
    title: "Cybersecurity Foundations",
    code: "SY0-701",
    provider: "CompTIA",
    level: "security",
    description: "Learn how systems and data are protected, how common threats work, and how security controls, monitoring and response fit together in real environments.",
    objectives: [
      ["1.1", "General Security Concepts", "Compare security control types", ["topic-security-control-types-and-categories"]],
      ["1.2", "General Security Concepts", "Explain the CIA triad and least privilege", [T.os]],
      ["2.1", "Threats and Vulnerabilities", "Recognise phishing and social engineering", [T.career]],
      ["2.2", "Threats and Vulnerabilities", "Explain malware categories and indicators", [T.os]],
      ["3.1", "Security Architecture", "Secure network designs and segmentation", [T.net]],
      ["3.2", "Security Architecture", "Explain identity and access management basics", [T.os]],
      ["4.1", "Security Operations", "Interpret logs during an investigation", [T.cli]],
      ["5.1", "Program Management", "Document incidents and follow policy", [T.career]],
    ],
  },
  {
    id: "cert-comptia-linux-plus",
    title: "Linux Systems Administration",
    code: "XK0-006",
    provider: "CompTIA",
    level: "infrastructure",
    description: "Get comfortable working in Linux from the command line, managing users, files, services and software, and diagnosing common system problems.",
    objectives: [
      ["1.1", "System Management", "Navigate the filesystem from the shell", [T.cli]],
      ["1.2", "System Management", "Manage packages, services and processes", [T.cli, T.os]],
      ["2.1", "Security", "Manage users, groups and file permissions", [T.os]],
      ["3.1", "Scripting", "Write basic Bash scripts and pipelines", [T.cli]],
      ["4.1", "Troubleshooting", "Diagnose disk, memory and service failures", [T.cli]],
    ],
  },
  {
    id: "cert-comptia-server-plus",
    title: "Server Administration",
    code: "SK0-005",
    provider: "CompTIA",
    level: "infrastructure",
    description: "Learn how servers are built, configured and maintained, including storage, virtualization, backups and the practical work involved in keeping services available.",
    objectives: [
      ["1.1", "Server Hardware", "Install server components and form factors", [T.hardware]],
      ["1.2", "Server Hardware", "Explain RAID levels and storage choices", [T.hardware]],
      ["2.1", "Server Administration", "Manage server operating systems and roles", [T.os]],
      ["3.1", "Virtualization", "Deploy and size virtual servers", [T.virt]],
      ["4.1", "Disaster Recovery", "Plan backups, snapshots and restore testing", [T.virt]],
      ["5.1", "Troubleshooting", "Diagnose server hardware and boot problems", [T.hardware]],
    ],
  },
  {
    id: "cert-comptia-cloud-plus",
    title: "Cloud Infrastructure",
    code: "CV0-004",
    provider: "CompTIA",
    level: "infrastructure",
    description: "Understand how cloud systems are designed and operated, then practice working with compute, storage, networking, identity, monitoring and security in cloud environments.",
    objectives: [
      ["1.1", "Cloud Architecture", "Compare deployment and service models", [T.virt]],
      ["1.2", "Cloud Architecture", "Size compute, storage and network resources", [T.virt]],
      ["2.1", "Deployment", "Provision virtual machines and networks", [T.virt, T.net]],
      ["3.1", "Operations", "Monitor capacity and cost", [T.virt]],
      ["4.1", "Security", "Apply identity, keys and network controls in cloud", [T.net]],
      ["5.1", "Troubleshooting", "Diagnose unreachable cloud workloads", [T.virt, T.net]],
    ],
  },
  {
    id: "cert-comptia-cysa-plus",
    title: "Security Analysis & Defense",
    code: "CS0-004",
    provider: "CompTIA",
    level: "advanced",
    description: "Develop the skills used to investigate suspicious activity, analyze logs and alerts, understand vulnerabilities, prioritize risk and respond to security incidents.",
    objectives: [
      ["1.1", "Security Operations", "Analyse network and endpoint telemetry", [T.net]],
      ["1.2", "Security Operations", "Use log analysis to confirm suspicious activity", [T.cli]],
      ["2.1", "Vulnerability Management", "Prioritise findings by real risk", ["topic-vulnerability-scanning-methods-and-output-analysis"]],
      ["3.1", "Incident Response", "Follow containment and eradication steps", [T.career]],
      ["4.1", "Reporting", "Communicate findings to technical and business readers", [T.career]],
    ],
  },
  {
    id: "cert-comptia-pentest-plus",
    title: "Offensive Security",
    code: "PT0-003",
    provider: "CompTIA",
    level: "advanced",
    description: "Learn how authorized security testing works from start to finish: defining scope, gathering information, examining weaknesses, using testing techniques responsibly and communicating findings.",
    objectives: [
      ["1.1", "Engagement", "Define scope, rules of engagement and legal limits", [T.career]],
      ["2.1", "Reconnaissance", "Enumerate hosts, services and DNS records", [T.dns, T.net]],
      ["3.1", "Attacks", "Explain common network and host attack paths", [T.net, T.os]],
      ["4.1", "Tooling", "Use scripting to support testing tasks", [T.cli]],
      ["5.1", "Reporting", "Write findings with evidence and remediation", [T.career]],
    ],
  },
  {
    id: "cert-comptia-securityx",
    title: "Advanced Security Engineering",
    code: "CAS-005",
    provider: "CompTIA",
    level: "advanced",
    description: "Bring security concepts together at an advanced level by learning how organizations design secure systems, manage risk, investigate complex incidents and make sound security decisions.",
    objectives: [
      ["1.1", "Governance", "Apply risk management and compliance frameworks", [T.career]],
      ["2.1", "Architecture", "Design secure enterprise network architecture", [T.net]],
      ["2.2", "Architecture", "Integrate identity across hybrid environments", [T.os, T.virt]],
      ["3.1", "Operations", "Lead complex incident investigations", [T.cli]],
      ["4.1", "Engineering", "Evaluate cryptographic and automation solutions", [T.cli]],
    ],
  },
];

/**
 * How the 24-month path is segmented. Months listed here belong to that
 * certification block; certifications with no months are optional
 * specialisations the learner can pursue outside the scheduled path.
 */
const certificationMonths: Record<string, number[]> = {
  "cert-comptia-tech-plus": [1, 2],
  "cert-comptia-a-plus": [3, 4, 5, 6, 7],
  "cert-comptia-network-plus": [8, 9, 10],
  "cert-comptia-security-plus": [11, 12, 13],
  "cert-comptia-linux-plus": [14, 15],
  "cert-comptia-server-plus": [16, 17],
  "cert-comptia-cloud-plus": [18, 19],
  "cert-comptia-cysa-plus": [20, 21],
  "cert-comptia-pentest-plus": [22],
  "cert-comptia-securityx": [23, 24],
};

function slug(id: EntityId) {
  return id.replace(/^cert-/, "");
}

const authoredCertifications: Certification[] = seeds.map((seed) => ({
  id: seed.id,
  title: seed.title,
  code: seed.code,
  provider: seed.provider,
  level: seed.level,
  description: seed.description,
  months: certificationMonths[seed.id] ?? [],
  objectiveIds: seed.objectives.map(([code]) => `obj-${slug(seed.id)}-${code}`),
}));

/** The live subject's qualification tracks: the generated package when one is active, the authored ones otherwise. */
export const certifications: Certification[] = domainOverlay?.certifications ?? authoredCertifications;

/** Returns the certification block a curriculum month belongs to, if any. */
export function certificationForMonth(month: number): Certification | undefined {
  return certifications.find((certification) => (certification.months ?? []).includes(month));
}

const authoredObjectives: CertificationObjective[] = seeds.flatMap((seed) =>
  seed.objectives.map(([code, domain, title, topicIds]) => ({
    id: `obj-${slug(seed.id)}-${code}`,
    certificationId: seed.id,
    code,
    domain,
    title,
    topicIds,
  })),
);

export const certificationObjectives: CertificationObjective[] = domainOverlay?.certificationObjectives ?? authoredObjectives;
