/**
 * Extra CompTIA Server+ aligned seeds covering virtualization capacity planning,
 * server networking and hardening, and data center facilities.
 */
import type { TopicSeed } from "./builder";

const SV = "cert-comptia-server-plus";

export const serverExtraSeeds: TopicSeed[] = [
  {
    slug: "server-virtualization-and-capacity-planning",
    title: "Server Virtualization and Capacity Planning",
    summary: "Design and size virtualization hosts and clusters, balancing consolidation ratios against performance headroom and failover capacity.",
    cert: SV, month: 16, week: 2, difficulty: "challenging", minutes: 55,
    prereqs: ["server-hardware-and-storage-arrays", "virtualization-basics"],
    objectives: [
      "Calculate CPU, memory, and storage headroom needed to survive a host failure in a cluster.",
      "Explain how overcommitment, ballooning, and resource pools affect guest performance.",
      "Plan capacity using current utilization trends rather than nameplate hardware specifications.",
    ],
    lesson: {
      title: "Sizing a cluster that can lose a host",
      body: "Virtualization lets one physical server run many workloads, but that efficiency creates a planning trap. A cluster that looks fully utilized on paper may have no room left to absorb the loss of a single host, turning a routine failure into an outage for every guest that needed to migrate.",
      definition: "Capacity planning for virtualization means tracking CPU, memory, storage, and network utilization across a cluster over time, then reserving enough spare capacity, known as N+1 or N+2 headroom, so that remaining hosts can absorb the workloads from a failed host without severe performance degradation. Overcommitment allows allocating more virtual resources than physically exist, relying on the fact that guests rarely peak simultaneously, but requires monitoring to avoid contention.",
      whyItMatters: "Undersized clusters fail quietly at first, with slow guests and delayed migrations, then fail loudly when a host actually goes down and there is nowhere for its workloads to land. Planning headroom before deployment is far cheaper than an emergency hardware order during an outage.",
      keyTerms: [
        ["N+1 redundancy", "Enough spare cluster capacity to lose one host and still run all workloads."],
        ["Overcommitment", "Allocating more virtual CPU or memory than the host physically has."],
        ["Ballooning", "A hypervisor technique that reclaims memory from guests under host memory pressure."],
        ["Resource pool", "A logical grouping of CPU and memory reservations and limits applied to a set of virtual machines."],
        ["Consolidation ratio", "The number of virtual machines running per physical host."],
      ],
      examples: [
        "A three-host cluster reserves one host's worth of CPU and memory so that a host failure triggers automatic failover without overloading the survivors.",
        "A hypervisor's ballooning driver reclaims 2 gigabytes from an idle guest so a busier guest can get the memory it actually needs right now.",
      ],
      misconceptions: [
        "More virtual CPUs assigned to a guest does not always mean better performance; excessive vCPU counts can increase scheduling overhead.",
        "A cluster running at 60 percent average utilization can still fail over poorly if that average hides a few hosts running near 95 percent.",
      ],
      summary: "Track real utilization trends, size clusters to survive a host failure, use overcommitment deliberately with monitoring in place, and treat vCPU and memory allocation as a budget rather than an unlimited resource.",
      nextSteps: [
        "Pull 30 days of CPU and memory utilization from a virtualization cluster and identify its busiest host at peak.",
        "Calculate how much spare capacity that cluster would need to safely lose its largest host.",
      ],
    },
    module: {
      howItWorks: [
        "The hypervisor scheduler allocates physical CPU cycles and memory pages to guests based on shares, reservations, and limits.",
        "Cluster-aware features monitor host health and automatically migrate or restart virtual machines when a host fails or becomes overloaded.",
        "Capacity planning tools trend historical utilization and project when a cluster will exhaust available headroom.",
      ],
      whereYouSeeIt: ["Enterprise virtualization clusters, private cloud platforms, and any shared hosting environment running many guests per physical server."],
      commonProblems: ["Memory or CPU contention during peak hours", "A cluster too full to complete failover after a host failure", "Storage latency spikes from over-provisioned shared storage", "Noisy neighbor virtual machines starving others on the same host"],
      howItFails: [
        "A cluster sized only for average load has no headroom when several guests peak at the same time.",
        "Aggressive overcommitment without monitoring leads to ballooning and swapping that silently degrades every guest on a host.",
        "Failover is configured but never tested, so the actual behavior during a real host failure is unknown until it happens.",
      ],
      troubleshooting: [
        "Check host-level CPU ready time and memory ballooning statistics before assuming a slow guest has an application problem.",
        "Compare configured reservations and limits against actual usage to find guests holding resources they do not need.",
        "Review cluster admission control settings to confirm failover capacity is actually enforced, not just configured.",
      ],
      practicalKnowledge: [
        "Set alerting thresholds on host CPU ready time and memory contention, not only on raw CPU and memory percentage.",
        "Right-size virtual machines periodically instead of leaving initial guesses in place for years.",
      ],
      examCoverage: ["Virtualization host and cluster sizing", "Resource allocation, overcommitment, and ballooning", "High availability and failover capacity planning"],
      interviewQuestions: ["How would you determine if a virtualization cluster has enough spare capacity to survive a host failure?", "What is the difference between a reservation and a limit on a virtual machine, and when would you use each?"],
    },
    recall: [
      ["What does N+1 redundancy mean for a virtualization cluster?", ["spare", "one host", "failover", "headroom"], "It means the cluster keeps enough spare capacity to lose one host and still run every workload without severe degradation."],
      ["What is ballooning used for?", ["memory", "reclaim", "pressure", "guest"], "It reclaims unused memory from guests so the hypervisor can give it to guests under actual memory pressure."],
      ["Why can average cluster utilization be misleading?", ["average", "hides", "peak", "imbalance"], "An average can hide imbalance where one host is nearly full while others are lightly loaded, so failover may still fail."],
    ],
    practice: {
      title: "Evaluate cluster headroom",
      prompt: "A three-host virtualization cluster runs at 70 percent average CPU utilization across all hosts, evenly balanced. Each host has identical capacity. What is the most accurate assessment of its failover readiness?",
      choices: [
        "The cluster is safe because 70 percent leaves ample headroom on any single host",
        "The cluster cannot survive a host failure because redistributing that host's load would push the remaining two hosts over 100 percent combined capacity",
        "The cluster is safe as long as vCPU overcommitment is disabled",
        "Failover readiness cannot be determined from CPU utilization alone and requires no further calculation",
      ],
      answerIndex: 1,
      explanation: "Three hosts each at 70 percent means total demand equals 210 percent of one host's capacity. If one host fails, its load must move to the remaining two, which only have 200 percent combined capacity, so the cluster cannot fully absorb the failure.",
    },
    scenario: {
      title: "The failover that did not fail over",
      situation: "A four-host virtualization cluster loses a host to a hardware fault at 2 a.m. Automated failover is configured, but half the affected virtual machines fail to restart, and the ones that do restart run noticeably slower than usual the next morning.",
      decisionPrompt: "What should the administrator check first, and what capacity change would prevent a repeat of this incident?",
      expectedConcepts: ["admission control", "headroom", "reservation", "N+1"],
      guidance: "Check whether cluster admission control was enforcing reserved failover capacity; if it was disabled or set too low, the cluster had no guaranteed room to restart every workload. Reconfigure the cluster to reserve at least one host's worth of capacity and validate failover with a planned test.",
    },
  },
  {
    slug: "server-networking-remote-access-and-hardening",
    title: "Server Networking, Remote Access and Hardening",
    summary: "Configure server network interfaces, remote administration protocols, and hardening baselines that reduce attack surface without breaking operations.",
    cert: SV, month: 17, week: 2, difficulty: "challenging", minutes: 60,
    prereqs: ["server-hardware-and-storage-arrays", "windows-server-and-active-directory"],
    objectives: [
      "Configure NIC teaming, VLAN tagging, and network segmentation appropriate to server roles.",
      "Select and secure remote administration methods including SSH, RDP, and out-of-band access.",
      "Apply a hardening baseline that disables unnecessary services without breaking dependent applications.",
    ],
    lesson: {
      title: "Every open port is a promise you have to keep",
      body: "A freshly built server usually has far more running than it needs: default services, unused protocols, and management interfaces reachable from networks that have no business touching them. Hardening is the deliberate process of closing that gap between what a server can do and what it actually needs to do.",
      definition: "Server network hardening combines correct network design, such as NIC teaming for redundancy and VLAN segmentation to isolate management traffic, with reducing attack surface by disabling unused services, enforcing key-based or certificate-based remote access, and applying least-privilege firewall rules. Remote access protocols like SSH and RDP must be configured with strong authentication, restricted source addresses, and, where possible, placed behind a jump host or VPN rather than exposed directly.",
      whyItMatters: "Most server compromises do not start with a novel exploit; they start with a default password, an unpatched exposed service, or a management port reachable from the internet. Hardening closes the easy paths before an attacker ever needs a sophisticated one.",
      keyTerms: [
        ["NIC teaming", "Combining multiple network interfaces for redundancy or increased throughput."],
        ["Jump host", "A hardened intermediary server used to reach other systems, reducing direct exposure."],
        ["Attack surface", "The total set of points where an unauthorized user could attempt to enter a system."],
        ["Least privilege", "Granting only the access and services required to perform a specific function."],
        ["Baseline", "A documented, approved configuration standard that servers are built and audited against."],
      ],
      examples: [
        "Disabling SSH password authentication in favor of key-based authentication removes an entire class of brute-force attacks.",
        "Placing out-of-band management interfaces on an isolated VLAN reachable only through a jump host prevents them from being scanned from the general network.",
      ],
      misconceptions: [
        "Changing a service to a nonstandard port is not real security; it only slightly delays a determined scan.",
        "A firewall allowing inbound traffic on a port does not confirm the service behind it is patched or configured securely.",
      ],
      summary: "Design server networking with redundancy and segmentation in mind, restrict remote access to strong authentication over minimal exposed paths, and apply and audit a hardening baseline rather than relying on default configurations.",
      nextSteps: [
        "Run a port scan against a lab server and list every listening service, then decide which are actually required.",
        "Configure key-based SSH authentication on a test server and disable password login once the key works.",
      ],
    },
    module: {
      howItWorks: [
        "NIC teaming presents multiple physical adapters as one logical interface, providing failover or aggregated bandwidth depending on mode.",
        "VLAN tagging separates traffic types, such as production, storage, and management, onto isolated logical networks over shared physical links.",
        "Host-based and network firewalls enforce least-privilege rules limiting which sources can reach which services.",
      ],
      whereYouSeeIt: ["Data center server racks, virtualization hosts, cloud virtual machines, and any internet-facing server infrastructure."],
      commonProblems: ["Management interfaces reachable from the general network", "Default credentials left unchanged after deployment", "Overly permissive firewall rules copied from a template and never trimmed", "Unpatched exposed remote access services"],
      howItFails: [
        "An out-of-band management interface left on the production VLAN becomes visible to every compromised device on that network.",
        "A hardening baseline is applied at build time but drifts as administrators install tools and open ports for troubleshooting and never close them again.",
        "Password-based remote access with no lockout policy allows a slow brute-force attack to eventually succeed.",
      ],
      troubleshooting: [
        "Run a port scan from both inside and outside the network to compare what is actually reachable versus what documentation claims.",
        "Review firewall logs for repeated connection attempts to remote access services from unexpected source addresses.",
        "Check whether NIC teaming failover actually works by testing a link failure, not just confirming the configuration exists.",
      ],
      practicalKnowledge: [
        "Automate hardening baseline checks so configuration drift is caught quickly rather than discovered during an audit.",
        "Segment management traffic onto its own VLAN and require a jump host or VPN for administrative access.",
      ],
      examCoverage: ["Network interface configuration and teaming", "Remote access security and out-of-band management", "Server hardening and attack surface reduction"],
      interviewQuestions: ["How would you securely provide remote administrative access to a server without exposing it directly to the internet?", "What steps would you take to harden a newly built server before it goes into production?"],
    },
    recall: [
      ["What is the purpose of NIC teaming?", ["redundancy", "failover", "throughput", "interfaces"], "It combines multiple physical network interfaces into one logical interface to provide redundancy or increased throughput."],
      ["Why place management interfaces on an isolated VLAN?", ["isolate", "management", "exposure", "segment"], "It prevents management interfaces from being reachable by general network traffic, reducing exposure to compromised devices."],
      ["What is attack surface?", ["points", "entry", "exposed", "unauthorized"], "It is the total set of points where an unauthorized user could attempt to gain access to a system."],
    ],
    practice: {
      title: "Choose the strongest remote access design",
      prompt: "A team needs remote administrative access to a fleet of Linux servers. Which configuration provides the strongest balance of security and usability?",
      choices: [
        "Allow SSH with password authentication from any source address, changing the default port to reduce automated scans",
        "Require SSH key-based authentication, restrict source addresses through a jump host, and disable direct root login",
        "Disable SSH entirely and require physical console access for every administrative task",
        "Allow SSH from any address but require a complex password changed every 30 days",
      ],
      answerIndex: 1,
      explanation: "Key-based authentication removes password brute-forcing risk, restricting access through a jump host limits exposure, and disabling direct root login forces accountable, named logins before privilege escalation.",
    },
    scenario: {
      title: "The forgotten management port",
      situation: "A security audit finds that a data center's out-of-band management interfaces are reachable from the general corporate network, and several still use default administrator credentials from the manufacturer.",
      decisionPrompt: "What immediate and longer-term changes would you recommend to close this exposure?",
      expectedConcepts: ["VLAN", "segmentation", "default credentials", "jump host"],
      guidance: "Immediately change all default credentials and restrict access with firewall rules while a permanent fix is planned. Move management interfaces onto an isolated management VLAN reachable only through a jump host or VPN, and add credential and exposure checks to the standard server build process.",
    },
  },
  {
    slug: "data-center-power-cooling-and-physical-security",
    title: "Data Center Power, Cooling and Physical Security",
    summary: "Plan data center power redundancy, cooling capacity, and physical access controls that keep servers running and protected from unauthorized access.",
    cert: SV, month: 17, week: 4, difficulty: "standard", minutes: 50,
    prereqs: ["server-hardware-and-storage-arrays"],
    objectives: [
      "Explain data center power redundancy concepts including UPS, generators, and dual feeds.",
      "Describe cooling requirements and airflow management practices that prevent equipment overheating.",
      "Apply layered physical security controls appropriate to a data center environment.",
    ],
    lesson: {
      title: "Servers fail before software does",
      body: "Every layer of software redundancy in the world does not matter if the room loses power or overheats. Data center facilities work is unglamorous but foundational; it is the reason the racks stay powered, cool, and physically secure while everything above them runs.",
      definition: "Data center power design uses uninterruptible power supplies for short-term ride-through, generators for extended outages, and dual power feeds from separate utility paths or panels to avoid a single point of failure. Cooling uses hot aisle and cold aisle containment to separate intake and exhaust air, keeping equipment within safe operating temperatures, typically around 64 to 80 degrees Fahrenheit at the equipment intake. Physical security applies layered controls such as badge access, mantraps, security cameras, and visitor logging to restrict who can physically reach the equipment.",
      whyItMatters: "A brief power interruption without a UPS can crash every server in a rack simultaneously, and poor airflow management can cause thermal shutdowns on hot days even when total cooling capacity looks sufficient on paper. Physical access to a server often bypasses every network security control entirely.",
      keyTerms: [
        ["UPS", "Uninterruptible power supply providing short-term battery power during an outage."],
        ["Hot aisle containment", "A cooling design that separates hot exhaust air from cold intake air to improve cooling efficiency."],
        ["Dual power feed", "Two independent electrical paths supplying a rack so a single feed failure does not cause an outage."],
        ["Mantrap", "A physical security chamber with two interlocked doors that only allows one door open at a time."],
        ["PDU", "Power distribution unit that delivers power from a circuit to individual rack equipment."],
      ],
      examples: [
        "A UPS provides enough battery runtime to bridge the gap until a generator starts and stabilizes, typically a few minutes.",
        "Hot aisle and cold aisle containment prevents warm exhaust air from one server from being pulled into the intake of a neighboring server.",
      ],
      misconceptions: [
        "A generator alone is not sufficient protection because it takes time to start; a UPS is still needed to cover that gap.",
        "Redundant cooling units mean nothing if hot and cold air are allowed to mix, since local hot spots can still overheat equipment.",
      ],
      summary: "Design power with UPS, generator, and dual feed redundancy that avoids shared single points of failure, manage airflow deliberately rather than just adding cooling capacity, and layer physical security controls so no single failure grants floor access.",
      nextSteps: [
        "Trace a rack's power path back to the utility feed and identify every shared component along the way.",
        "Walk a server room, if available, and note whether hot and cold aisles are actually maintained or if airflow is mixed.",
      ],
    },
    module: {
      howItWorks: [
        "UPS units maintain a continuous charge and switch to battery power within milliseconds of a utility interruption.",
        "Generators start automatically on extended outages and take over the electrical load once at stable output.",
        "Containment systems physically separate hot exhaust airflow from cold supply airflow to improve cooling efficiency and reduce energy use.",
      ],
      whereYouSeeIt: ["Enterprise data centers, colocation facilities, and any dedicated server room supporting business-critical systems."],
      commonProblems: ["UPS batteries that fail load testing without warning", "Hot spots caused by mixed airflow in poorly arranged racks", "Single utility feed serving equipment believed to be dually fed", "Tailgating through badge-controlled doors"],
      howItFails: [
        "A UPS with degraded batteries passes a visual check but fails to hold load during an actual outage.",
        "Blanking panels missing from empty rack slots allow hot exhaust air to recirculate into the cold aisle, causing localized overheating.",
        "Two power feeds trace back to the same upstream transformer or panel, so a single upstream fault takes down both.",
      ],
      troubleshooting: [
        "Review UPS battery test logs and replacement schedules rather than assuming a green status light means full capacity.",
        "Use a thermal camera or intake thermometer to find hot spots rather than relying on the room's general temperature reading.",
        "Trace both power feeds to a rack back to their source to confirm true independence before calling it redundant.",
      ],
      practicalKnowledge: [
        "Install blanking panels in every unused rack slot to maintain proper hot aisle and cold aisle separation.",
        "Test generator failover and UPS battery load on a scheduled basis rather than waiting for a real outage to find out.",
      ],
      examCoverage: ["Power redundancy including UPS, generators, and dual feeds", "Cooling design including containment and airflow management", "Physical security controls for data center access"],
      interviewQuestions: ["How would you verify that a rack's dual power feeds are truly independent?", "What physical security layers would you expect in a well-designed data center, and why does each matter?"],
    },
    recall: [
      ["What does a UPS provide that a generator does not?", ["immediate", "battery", "gap", "bridge"], "It provides immediate battery power the instant utility power fails, bridging the gap before a generator starts and stabilizes."],
      ["Why do missing blanking panels cause overheating?", ["recirculate", "hot", "cold", "mix"], "They allow hot exhaust air to recirculate into the cold aisle, mixing air and creating local hot spots even when total cooling capacity is sufficient."],
      ["What is a mantrap used for?", ["one door", "physical", "access", "interlock"], "It is a physical security chamber with interlocked doors that only allows one door open at a time, preventing tailgating into a secure area."],
    ],
    practice: {
      title: "Diagnose a cooling problem",
      prompt: "A rack of servers is overheating on hot afternoons even though the data center's total cooling capacity report shows adequate headroom. What is the most likely explanation?",
      choices: [
        "The UPS batteries are undersized for the load",
        "Hot and cold air are mixing due to poor containment, creating a local hot spot despite adequate total capacity",
        "The dual power feeds are not truly independent",
        "The generator has not been load tested recently",
      ],
      answerIndex: 1,
      explanation: "Adequate total cooling capacity does not prevent local overheating if airflow management, such as missing blanking panels or poor containment, allows hot exhaust air to mix with cold intake air at that specific rack.",
    },
    scenario: {
      title: "The redundant feed that was not redundant",
      situation: "During a scheduled utility maintenance window, an entire row of racks loses power even though each rack is wired with two separate power feeds believed to provide redundancy.",
      decisionPrompt: "What should the facilities team investigate, and how would you prevent this from happening again?",
      expectedConcepts: ["dual feed", "single point of failure", "trace", "independence"],
      guidance: "Trace both feeds back to their source; they likely share an upstream panel, transformer, or utility connection that was never verified as independent. Document and physically verify true separation of power paths as part of any redundancy claim, rather than trusting labeling alone.",
    },
  },
];
