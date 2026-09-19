import { domainOverlay } from "@/data/domain-overlay";
import { extraPracticeActivities } from "@/data/practice-extra";
import { expansionModules, expansionPractice, expansionRecall, expansionScenarios } from "@/data/curriculum";
import type { LearningModule, PracticeActivity, RecallQuestion, RealWorldScenario } from "@/lib/app-data/types";

const moduleData: Array<Omit<LearningModule, "id" | "lessonId" | "recallQuestionIds" | "practiceActivityId" | "scenarioId"> & {
  slug: string;
  howItWorks: string[];
  whereYouSeeIt: string[];
  commonProblems: string[];
  howItFails: string[];
  troubleshooting: string[];
  practicalKnowledge: string[];
  examCoverage: string[];
  interviewQuestions: string[];
}> = [
  {
    slug: "computer-hardware-basics", topicId: "topic-computer-hardware-basics",
    howItWorks: ["The CPU fetches instructions and operates on data held in RAM.", "The motherboard buses connect processing, memory, storage, and peripheral controllers.", "The PSU supplies regulated power while cooling moves heat away from components."],
    whereYouSeeIt: ["Desktop workstations, laptops, servers, point-of-sale terminals, and repair benches."],
    commonProblems: ["Loose power or data cables", "Insufficient RAM under workload", "Thermal throttling from blocked airflow"],
    howItFails: ["A failed PSU may produce no power or sudden shutdowns.", "Faulty RAM may cause crashes or corrupted calculations.", "A failing drive may become slow, report errors, or stop booting."],
    troubleshooting: ["Confirm the symptom and recent changes.", "Check power, cables, indicators, and temperatures.", "Test one suspected component at a time and document the result."],
    practicalKnowledge: ["Match RAM generation and form factor to the motherboard.", "Use antistatic precautions and disconnect power before internal work."],
    examCoverage: ["Component purposes and compatibility", "Storage, memory, power, and cooling symptoms", "Safe hardware procedures"],
    interviewQuestions: ["How would you distinguish a RAM shortage from a storage-capacity problem?", "What would you check first when a desktop has no signs of power?"],
  },
  {
    slug: "operating-systems-overview", topicId: "topic-operating-systems-overview",
    howItWorks: ["The kernel schedules CPU time, allocates memory, and controls privileged hardware access.", "Drivers translate operating-system requests for specific devices.", "Filesystems, accounts, and permissions organize data and limit actions."],
    whereYouSeeIt: ["Windows endpoints, Linux servers, macOS workstations, and Android or iOS mobile devices."],
    commonProblems: ["Failed updates", "Incompatible or missing drivers", "Insufficient permissions", "Runaway processes"],
    howItFails: ["Boot files can become damaged.", "A driver can crash the kernel or leave hardware unavailable.", "Full storage can prevent updates and normal application writes."],
    troubleshooting: ["Identify whether the failure affects one application, one account, or the whole OS.", "Check logs, storage space, updates, drivers, and permissions.", "Use recovery or safe-start tools before reinstalling."],
    practicalKnowledge: ["Know where to inspect processes, services, devices, disks, and logs.", "Use standard accounts for routine work and elevate only when necessary."],
    examCoverage: ["OS functions and editions", "Filesystems and permissions", "Update, driver, and boot troubleshooting"],
    interviewQuestions: ["What does an operating system do between an application and hardware?", "How would you investigate an application that works for an administrator but not a standard user?"],
  },
  {
    slug: "basic-networking-concepts", topicId: "topic-basic-networking-concepts",
    howItWorks: ["Clients and servers exchange data according to protocols.", "Switches forward local frames, routers move packets between networks, and access points bridge wireless clients.", "Layering lets each part of the path solve a defined delivery problem."],
    whereYouSeeIt: ["Home Wi-Fi, office LANs, cloud applications, printers, cameras, and internet services."],
    commonProblems: ["Disconnected links", "Wrong network selection", "Unavailable gateway", "Remote service outage"],
    howItFails: ["A device may have a local Wi-Fi connection but no routed internet path.", "A switch loop or failed uplink can disrupt many local devices.", "A server can be down while the network remains healthy."],
    troubleshooting: ["Define who and what is affected.", "Check link, local configuration, gateway reachability, and remote service in order.", "Compare a working device on the same network."],
    practicalKnowledge: ["Draw the path before changing settings.", "Separate local-network, internet-path, and application-service tests."],
    examCoverage: ["Client-server roles", "Switch, router, and access-point functions", "Basic layered troubleshooting"],
    interviewQuestions: ["What is the difference between a switch and a router?", "A laptop shows connected to Wi-Fi but websites fail. What would you test?"],
  },
  {
    slug: "command-line-fundamentals", topicId: "topic-command-line-fundamentals",
    howItWorks: ["A shell parses the command name, options, and arguments, then asks the OS to run it.", "The working directory provides the base for relative paths.", "Exit status and output report whether the operation succeeded."],
    whereYouSeeIt: ["PowerShell administration, Linux shells, remote support, network tools, cloud consoles, and automation."],
    commonProblems: ["Wrong working directory", "Misspelled command or path", "Missing permission", "Unsafe wildcard or destructive option"],
    howItFails: ["A command may not exist in the current shell or PATH.", "Quoting errors can split one argument into several.", "Elevated commands can change the wrong target immediately."],
    troubleshooting: ["Read the exact error and confirm the current directory.", "Use built-in help and verify command syntax.", "Run a read-only inspection before a modifying command."],
    practicalKnowledge: ["Use pwd/Get-Location, ls/Get-ChildItem, cd/Set-Location, and help safely.", "Quote paths containing spaces and use least privilege."],
    examCoverage: ["Commands, options, arguments, and paths", "Navigation and file inspection", "Safe administrative practice"],
    interviewQuestions: ["What is the difference between an absolute and relative path?", "How do you approach an unfamiliar command safely?"],
  },
  {
    slug: "virtualization-basics", topicId: "topic-virtualization-basics",
    howItWorks: ["A hypervisor presents virtual CPU, memory, disks, and network adapters to each guest.", "The host schedules real resources among active guests.", "Virtual switches connect VMs to one another or external networks."],
    whereYouSeeIt: ["Server consolidation, learner labs, software testing, cloud compute, and disaster-recovery environments."],
    commonProblems: ["Overallocated RAM or CPU", "No virtual network connectivity", "Insufficient disk space", "Stale snapshots"],
    howItFails: ["Host resource exhaustion slows every guest.", "A detached virtual adapter isolates one VM.", "Snapshot growth can fill the datastore."],
    troubleshooting: ["Check host capacity and guest allocation.", "Verify VM power state, virtual hardware, and network attachment.", "Inspect both guest symptoms and hypervisor events."],
    practicalKnowledge: ["Leave enough resources for the host.", "Treat snapshots as short-term rollback points, not backups."],
    examCoverage: ["Host, guest, and hypervisor roles", "VM resource planning", "Snapshots, networking, and containers"],
    interviewQuestions: ["How is a virtual machine different from a container?", "Why can assigning more RAM to every VM make performance worse?"],
  },
  {
    slug: "it-career-overview", topicId: "topic-it-career-overview",
    howItWorks: ["Service desks triage incidents and requests, then resolve or escalate according to ownership and risk.", "Specialist teams operate systems, networks, cloud services, and security controls.", "Tickets and change records preserve evidence and accountability."],
    whereYouSeeIt: ["Help desks, managed service providers, internal IT teams, operations centers, and security teams."],
    commonProblems: ["Incomplete ticket notes", "Unverified user identity", "Premature escalation", "Changes made outside authority"],
    howItFails: ["Poor handoffs force users to repeat information.", "Undocumented changes create repeat incidents.", "Ignoring escalation rules can increase security or business impact."],
    troubleshooting: ["Clarify the request, impact, scope, and urgency.", "Collect evidence and try approved low-risk steps.", "Escalate with a concise record of symptoms, tests, and results."],
    practicalKnowledge: ["Write notes with symptom, evidence, action, and result.", "Protect confidential information and verify identity before account changes."],
    examCoverage: ["Professional communication", "Incident, request, SLA, and escalation concepts", "Documentation and change discipline"],
    interviewQuestions: ["When should a support technician escalate an issue?", "What makes a useful ticket note?"],
  },
  {
    slug: "networking-basics", topicId: "topic-networking-basics",
    howItWorks: ["The subnet mask tells a host whether a destination is local.", "Local traffic is delivered over Ethernet or Wi-Fi; remote traffic goes to the default gateway.", "TCP or UDP carries application data while DHCP can supply addressing."],
    whereYouSeeIt: ["Endpoint address settings, home routers, enterprise VLANs, server ports, and connectivity tests."],
    commonProblems: ["Self-assigned 169.254 address", "Wrong subnet mask or gateway", "DHCP failure", "Blocked application port"],
    howItFails: ["A valid link with no DHCP response leaves the host without usable routed settings.", "A wrong gateway breaks remote access while local peers may still work.", "A firewall can block one service even when ping succeeds."],
    troubleshooting: ["Check physical or wireless link.", "Inspect IP, mask, gateway, and DHCP source.", "Test local stack, local peer, gateway, remote IP, then application port."],
    practicalKnowledge: ["Recognize private IPv4 and APIPA ranges.", "Use ipconfig/ifconfig/ip and ping as evidence, not as automatic fixes."],
    examCoverage: ["IPv4 configuration and private ranges", "TCP, UDP, DHCP, Ethernet, and Wi-Fi", "Layered connectivity troubleshooting"],
    interviewQuestions: ["What does a default gateway do?", "What does a 169.254.x.x address suggest?"],
  },
  {
    slug: "dns-fundamentals", topicId: "topic-dns-fundamentals",
    howItWorks: ["A client sends a query to a recursive resolver.", "On a cache miss, the resolver follows referrals toward an authoritative server.", "The returned typed record is cached for its TTL."],
    whereYouSeeIt: ["Website access, email routing, service aliases, domain verification, and reverse lookups."],
    commonProblems: ["Wrong record value", "Stale cache", "Missing zone record", "Unreachable resolver", "Record-type confusion"],
    howItFails: ["A service can work by IP but fail by hostname.", "Some users can receive an old cached answer after a record change.", "A broken delegation can prevent resolvers from finding authority."],
    troubleshooting: ["Confirm basic IP connectivity first.", "Query the expected record type with nslookup or dig.", "Compare resolvers, inspect authority, and account for TTL."],
    practicalKnowledge: ["Use A/AAAA for addresses, CNAME for aliases, MX for mail, and TXT for published text.", "Separate resolver, cache, authoritative record, and service failures."],
    examCoverage: ["Recursive and authoritative resolution", "Common DNS record types", "TTL, caching, and name-resolution troubleshooting"],
    interviewQuestions: ["What is the difference between a recursive resolver and an authoritative server?", "A site works by IP but not name. What does that indicate?"],
  },
];

const authoredModules: LearningModule[] = [...moduleData.map((item) => ({
  ...item,
  id: `module-${item.slug}`,
  lessonId: `lesson-${item.slug}-core`,
  recallQuestionIds: [`recall-${item.slug}-1`, `recall-${item.slug}-2`],
  practiceActivityId: `practice-${item.slug}`,
  scenarioId: `scenario-${item.slug}`,
})), ...expansionModules];

const recallSeed: Array<[string, string, string[], string, string, string[], string]> = [
  ["computer-hardware-basics", "Why does a running program use RAM instead of only the SSD?", ["fast", "temporary", "active"], "RAM provides fast temporary working space for active instructions and data.", "Name two checks for a desktop with no power.", ["power", "cable", "psu", "outlet"], "Check the outlet/cable and PSU connections or indicators before replacing parts."],
  ["operating-systems-overview", "What job does the kernel perform?", ["hardware", "resource", "cpu", "memory"], "The kernel controls privileged access and manages CPU, memory, and devices.", "Why might software work as administrator but fail for a standard user?", ["permission", "access", "rights"], "The standard user may lack a required file, service, or configuration permission."],
  ["basic-networking-concepts", "How does a switch differ from a router?", ["local", "between networks", "frames", "packets"], "A switch forwards local frames; a router forwards packets between networks.", "Why can Wi-Fi show connected while the internet is unavailable?", ["local", "gateway", "internet", "router"], "The local wireless link can work while the gateway or upstream internet path fails."],
  ["command-line-fundamentals", "What is a relative path relative to?", ["working directory", "current directory"], "A relative path starts from the shell's current working directory.", "What should you do before running an unfamiliar modifying command?", ["help", "verify", "read", "target"], "Read help, verify syntax and targets, and prefer a read-only inspection first."],
  ["virtualization-basics", "What does a hypervisor do?", ["virtual machine", "resource", "allocate", "manage"], "A hypervisor creates and manages VMs and allocates physical resources.", "Why is a snapshot not a complete backup?", ["depends", "original", "storage", "host"], "Snapshots commonly depend on the original VM disks and datastore."],
  ["it-career-overview", "What information belongs in a useful escalation?", ["symptom", "evidence", "action", "result"], "Include symptoms, scope, evidence, actions attempted, and results.", "When should a technician escalate instead of continuing?", ["authority", "risk", "specialist", "scope"], "Escalate when risk, authority, ownership, or specialist expertise requires it."],
  ["networking-basics", "What does a default gateway provide?", ["other networks", "remote", "route", "router"], "It is the router used to reach destinations outside the local network.", "What does a 169.254 address usually indicate?", ["dhcp", "automatic", "failed", "apipa"], "It usually means the host self-assigned APIPA because DHCP did not answer."],
  ["dns-fundamentals", "What is the role of a recursive resolver?", ["query", "cache", "answer", "authoritative"], "It obtains answers for clients, using cache or querying the DNS hierarchy.", "Why can users receive an old address after a DNS change?", ["cache", "ttl", "expire"], "Resolvers may retain the previous answer until its TTL expires."],
];

const authoredRecall: RecallQuestion[] = recallSeed.flatMap(([slug, p1, c1, e1, p2, c2, e2]) => [
  { id: `recall-${slug}-1`, topicId: `topic-${slug}`, prompt: p1, acceptedConcepts: c1, explanation: e1 },
  { id: `recall-${slug}-2`, topicId: `topic-${slug}`, prompt: p2, acceptedConcepts: c2, explanation: e2 },
]).concat(expansionRecall);

const activitySeed: Array<[string, string, string, string[], number, string]> = [
  ["computer-hardware-basics", "Isolate a hardware symptom", "A PC shuts down only during heavy workloads and feels very hot. What should you check first?", ["Replace the SSD", "Inspect fans, vents, and CPU temperature", "Add a second monitor", "Reinstall the browser"], 1, "Load-related heat points first to cooling or thermal contact."],
  ["operating-systems-overview", "Narrow an OS problem", "One user cannot open a protected folder, but an administrator can. Which area should you inspect?", ["Display resolution", "File permissions", "CPU clock speed", "DNS records"], 1, "Different behavior by account points to permissions."],
  ["basic-networking-concepts", "Locate the network layer", "Every device on one office switch loses access, while another floor works. What is the best first focus?", ["Each browser cache", "The affected switch or its uplink", "The public website", "Every user's password"], 1, "A shared local failure suggests common switching infrastructure."],
  ["command-line-fundamentals", "Choose a safe command", "You need to inspect files in the current Linux directory without changing them. Which command fits?", ["rm -rf *", "ls -la", "sudo reboot", "mv * /tmp"], 1, "ls -la is read-only inspection; the others modify or disrupt the system."],
  ["virtualization-basics", "Allocate a lab VM", "A host has 8 GB RAM and needs to remain usable. Which initial allocation is most sensible for one light Linux VM?", ["8 GB", "12 GB", "2 GB", "0 GB"], 2, "A 2 GB starting allocation leaves capacity for the host and can be adjusted."],
  ["it-career-overview", "Handle a security-sensitive ticket", "A caller requests a password reset but cannot pass identity verification. What should you do?", ["Reset it to save time", "Ask for their old password", "Follow verification policy and escalate", "Send a shared account"], 2, "Identity and escalation policy take priority over speed."],
  ["networking-basics", "Interpret address evidence", "A laptop has 169.254.22.9 and cannot reach its gateway. What should you investigate first?", ["DHCP availability", "Monitor cable", "DNS MX record", "Browser bookmarks"], 0, "APIPA strongly suggests the client did not receive a DHCP lease."],
  ["dns-fundamentals", "Separate DNS from connectivity", "A server answers by IP but its hostname fails. Which test is most direct?", ["Replace the network cable", "Query its A or AAAA record", "Add RAM", "Reinstall the OS"], 1, "Direct record queries test name resolution without confusing it with reachability."],
];
const authoredPractice: PracticeActivity[] = activitySeed.map(([slug, title, prompt, choices, answerIndex, explanation]) => ({ id: `practice-${slug}`, topicId: `topic-${slug}`, title, prompt, choices, answerIndex, explanation })).concat(expansionPractice).concat(extraPracticeActivities);

const scenarioSeed: Array<[string, string, string, string, string[], string]> = [
  ["computer-hardware-basics", "Intermittent workstation shutdown", "A design workstation powers off during rendering but runs normally at idle. Dust is visible around the rear vents.", "What is your first decision, and what evidence will you collect before replacing hardware?", ["temperature", "cooling", "fan", "power"], "Prioritize safe cooling and temperature checks, then verify power if heat is not the cause."],
  ["operating-systems-overview", "Update failure after restart", "After an OS update, a laptop boots but its wireless adapter is missing from the network settings.", "Explain how you would determine whether the driver, service, or hardware is responsible.", ["driver", "device", "service", "rollback"], "Inspect device state and logs, verify the service, and consider a driver rollback before blaming hardware."],
  ["basic-networking-concepts", "One room offline", "Users in one meeting room lose wired and wireless access, but the rest of the building remains online.", "Where would you begin and why?", ["scope", "switch", "access point", "uplink"], "Use the limited scope to investigate shared room infrastructure and uplinks first."],
  ["command-line-fundamentals", "Unknown cleanup command", "A forum suggests an elevated recursive-delete command to free disk space, but you do not recognize its target path.", "What should you do before deciding whether to run it?", ["help", "path", "backup", "read-only"], "Do not run it blindly. Read help, resolve the path, inspect safely, and confirm recovery options."],
  ["virtualization-basics", "Slow host and guests", "Three VMs each have 6 GB assigned on a host with 16 GB, and all systems become slow when they run together.", "What resource decision would you make, and what would you measure?", ["memory", "host", "allocation", "usage"], "Measure actual demand and reduce or stagger allocations so the host retains sufficient memory."],
  ["it-career-overview", "Potential breach report", "A user says a strange login alert appeared and asks you to investigate their mailbox yourself.", "What should you document and when should you escalate?", ["identity", "evidence", "security", "escalate"], "Verify identity, preserve the report and timing, avoid exceeding access authority, and escalate promptly to security."],
  ["networking-basics", "Local works, remote fails", "A PC reaches a printer on its subnet but cannot reach the default gateway or internet. Its address and mask look valid.", "What is your next test and reasoning?", ["gateway", "route", "switch", "configuration"], "Test gateway reachability and compare its configured value; local success already proves part of the link."],
  ["dns-fundamentals", "Partial outage after a change", "A site's A record changed this morning. Some users reach the new server and others still reach the old one.", "What is the likely cause, and what evidence would confirm it?", ["ttl", "cache", "resolver", "record"], "Compare resolver answers and TTLs; mixed cached responses are likely until the old TTL expires."],
];
export const realWorldScenarios: RealWorldScenario[] = scenarioSeed.map(([slug, title, situation, decisionPrompt, expectedConcepts, guidance]) => ({ id: `scenario-${slug}`, topicId: `topic-${slug}`, title, situation, decisionPrompt, expectedConcepts, guidance })).concat(expansionScenarios);

export const realWorldScenariosActive: RealWorldScenario[] = domainOverlay ? domainOverlay.scenarios : realWorldScenarios;

export const learningModules: LearningModule[] = domainOverlay?.modules ?? authoredModules;
export const recallQuestions: RecallQuestion[] = domainOverlay?.recall ?? authoredRecall;
export const practiceActivities: PracticeActivity[] = domainOverlay?.practice ?? authoredPractice;

export function getLearningModule(topicId: string) { return learningModules.find((item) => item.topicId === topicId); }
export function getRecallQuestions(topicId: string) { return recallQuestions.filter((item) => item.topicId === topicId); }
export function getPracticeActivity(topicId: string) { return practiceActivities.find((item) => item.topicId === topicId); }
/** Every practice question available on a topic, in a stable order. */
export function getPracticeActivities(topicId: string) { return practiceActivities.filter((item) => item.topicId === topicId); }
export function getRealWorldScenario(topicId: string) { return realWorldScenariosActive.find((item) => item.topicId === topicId); }
