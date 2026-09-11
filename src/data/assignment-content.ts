import type { Assignment, AssignmentType } from "@/lib/app-data/types";

type Seed = [AssignmentType, string, string, string, string, string[], string[]];

const seeds: Seed[] = [
  ["explain", "topic-operating-systems-overview", "Explain process isolation", "Explain how an operating system keeps applications separated while sharing hardware.", "Explain process isolation, memory protection, and the kernel's role in your own words.", ["Define the kernel boundary", "Connect isolation to stability", "Use a concrete application example"], ["kernel", "memory protection", "process"]],
  ["recall", "topic-computer-hardware-basics", "Recall the boot hardware path", "Recall the components involved from power-on until the operating system begins loading.", "Name the power, firmware, processor, memory, storage, and boot handoff stages in a sensible sequence.", ["Identify core components", "Describe the boot handoff", "Keep the sequence technically accurate"], ["power supply", "firmware", "cpu", "ram", "storage", "bootloader"]],
  ["configure", "topic-dns-fundamentals", "Configure a DNS record plan", "Choose records for a website, alias, and mail service.", "Write the record type for: root website to 192.0.2.10; www as an alias of the root; mail delivery to mail.example.test.", ["Use an A record for the IPv4 host", "Use CNAME for the alias", "Use MX for mail routing"], ["a record", "cname", "mx"]],
  ["build", "topic-virtualization-basics", "Build a safe VM specification", "Create a practical VM specification for a small Linux test server.", "Specify vCPU, RAM, storage, networking mode, installation source, and one snapshot checkpoint. Explain each choice.", ["Allocate realistic resources", "Choose an appropriate network mode", "Plan installation and recovery"], ["vcpu", "ram", "storage", "network", "snapshot"]],
  ["compare", "topic-basic-networking-concepts", "Compare switches and routers", "Compare how switches and routers move traffic.", "Compare their addressing, decision scope, broadcast-domain behavior, and where each appears in a small office.", ["Distinguish MAC and IP decisions", "Explain network boundaries", "Give a useful deployment example"], ["mac", "ip", "broadcast", "switch", "router"]],
  ["scenario", "topic-it-career-overview", "Handle an urgent support request", "Respond professionally when an executive reports an urgent but unclear outage.", "Describe your first response, questions, prioritization decision, and how you will keep the user informed.", ["Acknowledge impact", "Gather precise evidence", "Set expectations and document next steps"], ["impact", "questions", "priority", "update"]],
  ["incident", "topic-networking-basics", "Document an intermittent outage", "Produce an incident record for a workstation that loses connectivity every afternoon.", "Write a concise incident record with symptoms, scope, timestamps, evidence, actions, result, and escalation conditions.", ["Record observable facts", "Separate evidence from assumptions", "Define next action and escalation"], ["symptom", "time", "evidence", "action", "escalation"]],
  ["troubleshoot", "topic-computer-hardware-basics", "Troubleshoot a no-POST desktop", "A desktop powers on but shows no display and emits a memory error code.", "Give a safe ordered troubleshooting sequence and the evidence that would confirm or reject a RAM fault.", ["Power down safely", "Reseat and isolate memory modules", "Use POST evidence to verify the result"], ["power off", "reseat", "one module", "post"]],
  ["design", "topic-networking-basics", "Design a small office network", "Design a network for ten staff, shared printing, Wi-Fi, and internet access.", "Describe the topology, router, switch, access point, addressing, DHCP, DNS, and basic guest isolation.", ["Include all required network roles", "Create a coherent addressing plan", "Separate guest access"], ["router", "switch", "access point", "dhcp", "dns", "guest"]],
  ["teach_back", "topic-dns-fundamentals", "Teach back DNS resolution", "Teach DNS resolution to a colleague without using unexplained jargon.", "Explain what happens from entering a hostname until a browser receives an address, including cache, resolver, and authority.", ["Explain the query path", "Distinguish resolver and authority", "Explain caching and TTL clearly"], ["cache", "resolver", "authoritative", "ttl"]],
  ["command_challenge", "topic-command-line-fundamentals", "Find errors in a Linux log", "Construct one command that finds case-insensitive occurrences of error in /var/log/app.log.", "Enter the command only.", ["Use grep", "Make matching case-insensitive", "Target the exact file"], ["grep", "-i", "/var/log/app.log"]],
  ["exam_simulation", "topic-basic-networking-concepts", "Network fundamentals exam simulation", "Answer a compact technical prompt under exam-style conditions.", "State the device that forwards by MAC address, the device that connects IP networks, and the service that automatically leases IP settings.", ["Identify the switch", "Identify the router", "Identify DHCP"], ["switch", "router", "dhcp"]],
  ["capstone", "topic-dns-fundamentals", "Diagnose a name-resolution outage", "Combine networking, command-line, and DNS knowledge into a documented recovery plan.", "Users can reach 192.0.2.20 but not portal.example.test after a record change. Write a diagnosis plan, commands, likely causes, safe fix, validation, and rollback.", ["Isolate DNS from general connectivity", "Inspect client and authoritative answers", "Account for cache and TTL", "Validate and document rollback"], ["nslookup", "dig", "authoritative", "cache", "ttl", "rollback"]],
];

const automatic = new Set<AssignmentType>(["recall", "configure", "troubleshoot", "command_challenge", "exam_simulation"]);

export const assignments: Assignment[] = seeds.map(([type, topicId, title, brief, responsePrompt, criteria, concepts], assignmentIndex) => ({
  id: `assignment-${type.replaceAll("_", "-")}`,
  topicId,
  title,
  brief,
  type,
  responsePrompt,
  evaluationMode: automatic.has(type) ? "automatic" : "self_rubric",
  instructions: ["Read the task and identify the evidence required.", "Write a complete response in the workspace.", "Save your draft, then submit when it is ready for evaluation."],
  rubric: criteria.map((description, index) => ({
    id: `rubric-${assignmentIndex + 1}-${index + 1}`,
    label: `Criterion ${index + 1}`,
    description,
    points: 100 / criteria.length,
    acceptedConcepts: automatic.has(type) ? [concepts[index] ?? concepts[0]] : undefined,
  })),
}));