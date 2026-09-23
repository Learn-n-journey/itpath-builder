/**
 * Topic-specific reading material.
 *
 * Every URL below was opened and returned a working page on the date in
 * LAST_VERIFIED. Sources are primary documentation and standards: IETF RFCs,
 * NIST publications, CISA guidance, Microsoft Learn, Red Hat, Kubernetes,
 * Docker, Ansible, HashiCorp, AWS, MDN, Python, PostgreSQL, man7 manual pages
 * and CompTIA. Nothing here is invented, and no topic is given a link that is
 * not about that subject.
 *
 * Each topic gets its reading from keyword rules below, so a new topic added to
 * the curriculum still receives matching material. A topic always ends up with
 * at least two pieces of reading: its keyword matches first, then the fallback
 * for its certification.
 */
import type { Resource, Topic } from "@/lib/app-data/types";

export const LAST_VERIFIED = "2026-09-18";

export interface ReadingSource {
  key: string;
  title: string;
  provider: string;
  url: string;
}

/** Verified documentation and standards pages, keyed for reuse across topics. */
export const readingSources: Record<string, ReadingSource> = {
  hardware: {
    key: "hardware",
    title: "Windows hardware documentation",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/windows-hardware/",
  },
  storage: {
    key: "storage",
    title: "Windows Server storage documentation",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/windows-server/storage/storage",
  },
  raid: {
    key: "raid",
    title: "md, the multiple device (RAID) driver manual page",
    provider: "Linux manual pages",
    url: "https://man7.org/linux/man-pages/man4/md.4.html",
  },
  mobile: {
    key: "mobile",
    title: "Managing laptops and mobile devices with Intune",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/mem/intune/",
  },
  printing: {
    key: "printing",
    title: "Microsoft Learn documentation on printers and printing support",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/search/?terms=printing%20support",
  },
  networking: {
    key: "networking",
    title: "Windows Server networking documentation",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/windows-server/networking/networking",
  },
  osi: {
    key: "osi",
    title: "Requirements for internet hosts, RFC 1122",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc1122",
  },
  ip: {
    key: "ip",
    title: "Internet Protocol, RFC 791",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc791",
  },
  ipv6: {
    key: "ipv6",
    title: "IP version 6 addressing architecture, RFC 4291",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc4291",
  },
  subnetting: {
    key: "subnetting",
    title: "Classless inter-domain routing (CIDR), RFC 4632",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc4632",
  },
  routing: {
    key: "routing",
    title: "OSPF version 2, RFC 2328",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc2328",
  },
  switching: {
    key: "switching",
    title: "IEEE 802.1Q bridging and VLANs",
    provider: "IEEE 802",
    url: "https://www.ieee802.org/1/pages/802.1Q.html",
  },
  dns: {
    key: "dns",
    title: "Domain names, concepts and facilities, RFC 1034",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc1034",
  },
  dhcp: {
    key: "dhcp",
    title: "Dynamic Host Configuration Protocol, RFC 2131",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc2131",
  },
  vpn: {
    key: "vpn",
    title: "Security architecture for the Internet Protocol, RFC 4301",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc4301",
  },
  tls: {
    key: "tls",
    title: "The Transport Layer Security protocol version 1.3, RFC 8446",
    provider: "IETF",
    url: "https://datatracker.ietf.org/doc/html/rfc8446",
  },
  wireless: {
    key: "wireless",
    title: "Wi-Fi generations and standards",
    provider: "Wi-Fi Alliance",
    url: "https://www.wi-fi.org/discover-wi-fi",
  },
  wirelessSecurity: {
    key: "wirelessSecurity",
    title: "Establishing wireless robust security networks, SP 800-97",
    provider: "NIST",
    url: "https://csrc.nist.gov/publications/detail/sp/800-97/final",
  },
  cloud: {
    key: "cloud",
    title: "The NIST definition of cloud computing, SP 800-145",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/145/final",
  },
  cloudSecurity: {
    key: "cloudSecurity",
    title: "Cloud security technical reference architecture",
    provider: "CISA",
    url: "https://www.cisa.gov/resources-tools/resources/cloud-security-technical-reference-architecture",
  },
  cloudArchitecture: {
    key: "cloudArchitecture",
    title: "AWS Well-Architected Framework",
    provider: "AWS",
    url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
  },
  virtualization: {
    key: "virtualization",
    title: "What is virtualisation",
    provider: "Red Hat",
    url: "https://www.redhat.com/en/topics/virtualization/what-is-virtualization",
  },
  containers: {
    key: "containers",
    title: "Understanding containers",
    provider: "Red Hat",
    url: "https://www.redhat.com/en/topics/containers",
  },
  docker: {
    key: "docker",
    title: "Docker getting started guide",
    provider: "Docker",
    url: "https://docs.docker.com/get-started/",
  },
  kubernetes: {
    key: "kubernetes",
    title: "Kubernetes concepts",
    provider: "Kubernetes",
    url: "https://kubernetes.io/docs/concepts/overview/",
  },
  linuxShell: {
    key: "linuxShell",
    title: "bash manual page",
    provider: "Linux manual pages",
    url: "https://man7.org/linux/man-pages/man1/bash.1.html",
  },
  permissions: {
    key: "permissions",
    title: "chmod manual page",
    provider: "Linux manual pages",
    url: "https://man7.org/linux/man-pages/man1/chmod.1.html",
  },
  sudo: {
    key: "sudo",
    title: "sudo manual page",
    provider: "Linux manual pages",
    url: "https://man7.org/linux/man-pages/man8/sudo.8.html",
  },
  lvm: {
    key: "lvm",
    title: "LVM logical volume manager manual page",
    provider: "Linux manual pages",
    url: "https://man7.org/linux/man-pages/man8/lvm.8.html",
  },
  systemd: {
    key: "systemd",
    title: "systemd manual page",
    provider: "Linux manual pages",
    url: "https://man7.org/linux/man-pages/man1/systemd.1.html",
  },
  journal: {
    key: "journal",
    title: "journalctl manual page",
    provider: "Linux manual pages",
    url: "https://man7.org/linux/man-pages/man1/journalctl.1.html",
  },
  windows: {
    key: "windows",
    title: "Windows Server documentation",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/windows-server/",
  },
  windowsSecurity: {
    key: "windowsSecurity",
    title: "Windows security documentation",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/windows/security/",
  },
  windowsBoot: {
    key: "windowsBoot",
    title: "Troubleshooting Windows boot problems",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/windows-boot-issues-troubleshooting",
  },
  activeDirectory: {
    key: "activeDirectory",
    title: "Active Directory Domain Services overview",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview",
  },
  powershell: {
    key: "powershell",
    title: "PowerShell documentation",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/powershell/",
  },
  python: {
    key: "python",
    title: "The Python tutorial",
    provider: "Python",
    url: "https://docs.python.org/3/tutorial/index.html",
  },
  webDev: {
    key: "webDev",
    title: "Scripting for the web, core learning path",
    provider: "MDN",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting",
  },
  sql: {
    key: "sql",
    title: "SQL tutorial, querying and relational basics",
    provider: "PostgreSQL",
    url: "https://www.postgresql.org/docs/current/tutorial.html",
  },
  database: {
    key: "database",
    title: "What is a database",
    provider: "AWS",
    url: "https://aws.amazon.com/what-is/database/",
  },
  securityControls: {
    key: "securityControls",
    title: "Security and privacy controls, SP 800-53",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
  },
  csf: {
    key: "csf",
    title: "The NIST Cybersecurity Framework 2.0",
    provider: "NIST",
    url: "https://www.nist.gov/cyberframework",
  },
  crypto: {
    key: "crypto",
    title: "Recommendation for key management, SP 800-57",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final",
  },
  identity: {
    key: "identity",
    title: "Digital identity guidelines, SP 800-63",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/63/4/final",
  },
  firewall: {
    key: "firewall",
    title: "Guidelines on firewalls and firewall policy, SP 800-41",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/41/r1/final",
  },
  malware: {
    key: "malware",
    title: "Guide to malware incident prevention and handling, SP 800-83",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/83/r1/final",
  },
  phishing: {
    key: "phishing",
    title: "Recognise and report phishing",
    provider: "CISA",
    url: "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing",
  },
  siem: {
    key: "siem",
    title: "What is SIEM: Microsoft Sentinel overview",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/azure/sentinel/overview",
  },
  logging: {
    key: "logging",
    title: "Guide to computer security log management, SP 800-92",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/92/final",
  },
  incident: {
    key: "incident",
    title: "Computer security incident handling guide, SP 800-61",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/61/r2/final",
  },
  forensics: {
    key: "forensics",
    title: "Guide to integrating forensic techniques into incident response, SP 800-86",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/86/final",
  },
  risk: {
    key: "risk",
    title: "Risk Management Framework for information systems, SP 800-37",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/37/r2/final",
  },
  vulnerability: {
    key: "vulnerability",
    title: "Known exploited vulnerabilities catalogue",
    provider: "CISA",
    url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
  },
  patching: {
    key: "patching",
    title: "Guide to enterprise patch management planning, SP 800-40",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/40/r4/final",
  },
  pentest: {
    key: "pentest",
    title: "Technical guide to information security testing and assessment, SP 800-115",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/115/final",
  },
  owasp: {
    key: "owasp",
    title: "OWASP Top Ten web application risks",
    provider: "OWASP",
    url: "https://owasp.org/www-project-top-ten/",
  },
  zeroTrust: {
    key: "zeroTrust",
    title: "Zero trust architecture, SP 800-207",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/207/final",
  },
  backup: {
    key: "backup",
    title: "Contingency planning guide for information systems, SP 800-34",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/34/r1/final",
  },
  sanitisation: {
    key: "sanitisation",
    title: "Guidelines for media sanitisation, SP 800-88",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/88/r1/final",
  },
  serverSecurity: {
    key: "serverSecurity",
    title: "Guide to general server security, SP 800-123",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/123/final",
  },
  secureDevelopment: {
    key: "secureDevelopment",
    title: "Secure Software Development Framework, SP 800-218",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/218/final",
  },
  supplyChain: {
    key: "supplyChain",
    title: "Cybersecurity supply chain risk management, SP 800-161",
    provider: "NIST",
    url: "https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final",
  },
  devops: {
    key: "devops",
    title: "Understanding DevOps",
    provider: "Red Hat",
    url: "https://www.redhat.com/en/topics/devops",
  },
  iac: {
    key: "iac",
    title: "What is infrastructure as code",
    provider: "Red Hat",
    url: "https://www.redhat.com/en/topics/automation/what-is-infrastructure-as-code-iac",
  },
  ansible: {
    key: "ansible",
    title: "Getting started with Ansible automation",
    provider: "Ansible",
    url: "https://docs.ansible.com/ansible/latest/getting_started/index.html",
  },
  terraform: {
    key: "terraform",
    title: "Terraform documentation",
    provider: "HashiCorp",
    url: "https://developer.hashicorp.com/terraform/docs",
  },
  ai: {
    key: "ai",
    title: "AI Risk Management Framework",
    provider: "NIST",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
  },
  itsm: {
    key: "itsm",
    title: "ITIL service management, tickets, change and support process",
    provider: "Atlassian",
    url: "https://www.atlassian.com/itsm/itil",
  },
  careers: {
    key: "careers",
    title: "IT career paths and role expectations",
    provider: "CompTIA",
    url: "https://www.comptia.org/en-us/explore-careers/",
  },
};

/** Keyword rules, checked against the topic id and title, in order. */
const rules: { match: RegExp; keys: string[] }[] = [
  // Windows subjects that share words with Linux ones are settled first.
  { match: /windows-security|windows security/, keys: ["windowsSecurity", "windows"] },
  // Linux specifics come next so a Linux topic never matches a Windows rule.
  { match: /linux-filesystem|users-groups|sudo/, keys: ["permissions", "sudo"] },
  { match: /lvm|logical-volume/, keys: ["lvm", "storage"] },
  { match: /systemd|journal|syslog/, keys: ["systemd", "journal"] },
  { match: /bash|shell-script/, keys: ["linuxShell", "python"] },
  { match: /linux-network/, keys: ["networking", "linuxShell"] },
  { match: /linux-container|container.*linux/, keys: ["containers", "docker"] },
  { match: /linux-firewall|linux.*hardening/, keys: ["firewall", "linuxShell"] },
  { match: /linux-authentication|linux.*accounting/, keys: ["identity", "sudo"] },
  { match: /linux-automation|linux.*scripting/, keys: ["ansible", "linuxShell"] },
  { match: /linux-device/, keys: ["linuxShell", "virtualization"] },
  { match: /linux/, keys: ["linuxShell", "permissions"] },
  { match: /permission/, keys: ["permissions", "identity"] },
  { match: /command-line|command line|terminal|\bcli\b/, keys: ["linuxShell", "powershell"] },
  // Security subjects with a named standard.
  { match: /endpoint/, keys: ["malware", "incident"] },
  { match: /data-protection|classification|data handling/, keys: ["securityControls", "sanitisation"] },
  { match: /security-fundamental|\bcia\b|confidential/, keys: ["securityControls", "csf"] },
  { match: /security-control|security-monitoring|siem|detection|observab/, keys: ["siem", "securityControls"] },
  { match: /forensic|evidence|chain-of-custody/, keys: ["forensics", "incident"] },
  { match: /incident|containment|playbook/, keys: ["incident", "csf"] },
  { match: /crypt|encryption|key-management|\bpki\b|certificate|hashing/, keys: ["crypto", "tls"] },
  { match: /identity|authentication|access-control|authoris|authoriz|\baaa\b/, keys: ["identity", "zeroTrust"] },
  { match: /zero-trust|segmentation/, keys: ["zeroTrust", "securityControls"] },
  { match: /firewall|hardening|baseline/, keys: ["firewall", "securityControls"] },
  { match: /malware|virus|ransomware|endpoint/, keys: ["malware", "incident"] },
  { match: /social-engineering|phishing|awareness|user-training/, keys: ["phishing", "csf"] },
  { match: /penetration|pentest|reconnaissance|enumeration|exploitation|lateral|persistence/, keys: ["pentest", "vulnerability"] },
  { match: /web-application|application-security|injection|\bxss\b/, keys: ["owasp", "secureDevelopment"] },
  { match: /supply-chain|devsecops/, keys: ["supplyChain", "secureDevelopment"] },
  { match: /sdlc|secure-software|secure-coding/, keys: ["secureDevelopment", "owasp"] },
  { match: /vulnerab|patch|remediation/, keys: ["vulnerability", "patching"] },
  { match: /risk|compliance|audit|governance|policy|third-party|privacy|threat-model/, keys: ["risk", "securityControls"] },
  { match: /decommission|sanitis|sanitiz|disposal|destruction/, keys: ["sanitisation", "serverSecurity"] },
  { match: /backup|disaster|recovery|resilien|availability|continuity/, keys: ["backup", "csf"] },
  { match: /threat|attack|adversar|indicator/, keys: ["csf", "vulnerability"] },
  // Cloud, virtualisation and automation.
  { match: /container|kubernetes|podman/, keys: ["containers", "kubernetes"] },
  { match: /virtualis|virtualiz|hypervisor|virtual-machine/, keys: ["virtualization", "containers"] },
  { match: /devops|ci-cd|pipeline/, keys: ["devops", "iac"] },
  { match: /infrastructure-as-code|orchestration|automation/, keys: ["iac", "ansible"] },
  { match: /scaling|capacity|workload|optimis|optimiz/, keys: ["cloudArchitecture", "cloud"] },
  { match: /cloud/, keys: ["cloud", "cloudSecurity"] },
  // Networking.
  { match: /subnet|ip-address|ipv4/, keys: ["subnetting", "ip"] },
  { match: /ipv6/, keys: ["ipv6", "ip"] },
  { match: /routing|router|switching|vlan/, keys: ["routing", "switching"] },
  { match: /\bdns\b|name-resolution/, keys: ["dns", "networking"] },
  { match: /\bdhcp\b/, keys: ["dhcp", "networking"] },
  { match: /\bvpn\b|remote-access|tunnel/, keys: ["vpn", "zeroTrust"] },
  { match: /wireless|wifi|wi-fi|soho/, keys: ["wireless", "wirelessSecurity"] },
  { match: /\bosi\b|encapsulation|protocol|\bport\b|packet/, keys: ["osi", "ip"] },
  { match: /cabling|connector|transmission-media|topolog/, keys: ["networking", "osi"] },
  { match: /network/, keys: ["networking", "ip"] },
  // Devices, systems and support.
  { match: /printer|printing/, keys: ["printing", "hardware"] },
  { match: /\braid\b/, keys: ["raid", "storage"] },
  { match: /storage|filesystem|file-system|\bdisk\b/, keys: ["storage", "raid"] },
  { match: /mobile|laptop/, keys: ["mobile", "hardware"] },
  { match: /active-directory|domain-service/, keys: ["activeDirectory", "identity"] },
  { match: /boot|crash|blue-screen/, keys: ["windowsBoot", "windows"] },
  { match: /windows/, keys: ["windows", "windowsSecurity"] },
  { match: /powershell|scripting|script/, keys: ["powershell", "python"] },
  { match: /programming|development-concept/, keys: ["python", "webDev"] },
  { match: /database|\bsql\b|data and database/, keys: ["database", "sql"] },
  { match: /software|application|licens/, keys: ["itsm", "windows"] },
  { match: /data-cent|data-center|power-cooling|facility|\bserver\b/, keys: ["serverSecurity", "hardware"] },
  { match: /hardware|motherboard|\bcpu\b|memory|power|cooling|peripheral|component/, keys: ["hardware", "storage"] },
  { match: /operating-system/, keys: ["windows", "linuxShell"] },
  { match: /artificial-intelligence|machine-learning|\bai\b/, keys: ["ai", "csf"] },
  { match: /ticket|customer|communication|professional|documentation|career|help-desk|change-management/, keys: ["itsm", "careers"] },
  { match: /troubleshoot|diagnostic/, keys: ["itsm", "logging"] },
  { match: /binary|number-system/, keys: ["python", "networking"] },
  { match: /monitor|logging/, keys: ["logging", "siem"] },
  { match: /security/, keys: ["securityControls", "csf"] },
];

/** Reading used when a topic's keywords give fewer than two matches. */
const certificationFallback: Record<string, string[]> = {
  "cert-comptia-tech-plus": ["careers", "hardware"],
  "cert-comptia-a-plus": ["hardware", "windows"],
  "cert-comptia-network-plus": ["networking", "osi"],
  "cert-comptia-security-plus": ["securityControls", "csf"],
  "cert-comptia-linux-plus": ["linuxShell", "permissions"],
  "cert-comptia-server-plus": ["serverSecurity", "storage"],
  "cert-comptia-cloud-plus": ["cloud", "cloudArchitecture"],
  "cert-comptia-cysa-plus": ["incident", "siem"],
  "cert-comptia-pentest-plus": ["pentest", "owasp"],
  "cert-comptia-securityx": ["risk", "securityControls"],
};

/** Picks the reading sources for a single topic, never fewer than two. */
export function readingForTopic(topic: Topic): ReadingSource[] {
  const haystack = `${topic.id} ${topic.title}`.toLowerCase();
  const keys: string[] = [];

  for (const rule of rules) {
    if (!rule.match.test(haystack)) continue;
    for (const key of rule.keys) if (!keys.includes(key)) keys.push(key);
    if (keys.length >= 2) break;
  }

  const fallback = certificationFallback[topic.certificationId] ?? ["csf", "careers"];
  for (const key of fallback) {
    if (keys.length >= 2) break;
    if (!keys.includes(key)) keys.push(key);
  }

  return keys
    .slice(0, 3)
    .map((key) => readingSources[key])
    .filter((source): source is ReadingSource => Boolean(source));
}

/** Builds reading resources for every topic in the curriculum. */
export function buildTopicReadingResources(topicList: Topic[]): Resource[] {
  return topicList.flatMap((topic) =>
    readingForTopic(topic).map((source, index) => ({
      id: `resource-reading-${topic.id}-${index + 1}`,
      title: `${source.title}, ${source.provider}`,
      provider: source.provider,
      url: source.url,
      topicIds: [topic.id],
      certificationId: topic.certificationId,
      kind: "article" as const,
      difficulty: "standard" as const,
      access: "free" as const,
      lastVerified: LAST_VERIFIED,
      status: "verified" as const,
    })),
  );
}
