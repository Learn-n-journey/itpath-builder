/** Read-only curriculum registry. User activity is never stored here. */
import { weeks as curriculumWeeks } from "./week-content";
import type {
  Assignment,
  CareerSkill,
  Certification,
  CertificationObjective,
  Lesson,
  Resource,
  Topic,
  Track,
} from "@/lib/app-data/types";
import { assignments } from "@/data/assignment-content";
import { expansionLessons, expansionTopics } from "@/data/curriculum";
import { certifications, certificationObjectives } from "@/data/certification-content";
import { incidents } from "@/data/incident-content";
import { labs } from "@/data/lab-content";
import { questions, quizzes } from "@/data/quiz-content";
import { tickets } from "@/data/ticket-content";

export type {
  Assignment,
  CareerSkill,
  Certification,
  CertificationObjective,
  Lab,
  Lesson,
  Question,
  Quiz,
  Resource,
  ResourceLink,
  Topic,
  Track,
} from "@/lib/app-data/types";

export const tracks: Track[] = [
  {
    id: "track-year-1-foundations",
    title: "IT Foundations",
    description:
      "Core knowledge for understanding, operating, and supporting modern computer systems.",
    year: 1,
  },
  {
    id: "track-year-2-specialisation",
    title: "Systems, Cloud and Security Specialisation",
    description:
      "Second-year progression through Linux, systems administration, cloud, and defensive and offensive security.",
    year: 2,
  },
];


export const topics: Topic[] = [
  {
    id: "topic-computer-hardware-basics",
    trackId: "track-year-1-foundations",
    title: "Computer Hardware Basics",
    summary:
      "Identify the components inside a computer and explain how they cooperate to process, store, and move data.",
    certificationId: "cert-comptia-a-plus",
    year: 1,
    month: 1,
    week: 1,
    difficulty: "gentle",
    prerequisiteTopicIds: [],
    learningObjectives: [
      "Identify the purpose of the CPU, RAM, motherboard, storage, power supply, and cooling system.",
      "Distinguish temporary working memory from persistent storage.",
      "Trace the basic path data follows while a program runs.",
    ],
    estimatedMinutes: 45,
  },
  {
    id: "topic-operating-systems-overview",
    trackId: "track-year-1-foundations",
    title: "Operating Systems Overview",
    summary:
      "Understand how an operating system manages hardware, applications, files, users, and security boundaries.",
    certificationId: "cert-comptia-a-plus",
    year: 1,
    month: 1,
    week: 1,
    difficulty: "gentle",
    prerequisiteTopicIds: ["topic-computer-hardware-basics"],
    learningObjectives: [
      "Explain the operating system's role between applications and hardware.",
      "Compare the everyday uses of Windows, macOS, Linux, Android, and iOS.",
      "Recognize processes, filesystems, user accounts, drivers, and permissions.",
    ],
    estimatedMinutes: 50,
  },
  {
    id: "topic-basic-networking-concepts",
    trackId: "track-year-1-foundations",
    title: "Basic Networking Concepts",
    summary:
      "Build a mental model of how devices exchange data through local networks, the internet, and shared protocols.",
    certificationId: "cert-comptia-network-plus",
    year: 1,
    month: 1,
    week: 2,
    difficulty: "gentle",
    prerequisiteTopicIds: ["topic-computer-hardware-basics"],
    learningObjectives: [
      "Describe clients, servers, network interfaces, switches, routers, and access points.",
      "Explain why protocols and layered communication are necessary.",
      "Follow a request from a local device toward a remote service.",
    ],
    estimatedMinutes: 50,
  },
  {
    id: "topic-command-line-fundamentals",
    trackId: "track-year-1-foundations",
    title: "Command Line Fundamentals",
    summary:
      "Use a shell safely to navigate files, inspect a system, and understand command structure.",
    certificationId: "cert-comptia-a-plus",
    year: 1,
    month: 1,
    week: 2,
    difficulty: "standard",
    prerequisiteTopicIds: ["topic-operating-systems-overview"],
    learningObjectives: [
      "Read a prompt and distinguish a command, option, argument, and path.",
      "Navigate directories and inspect files without relying on a graphical interface.",
      "Use help output and cautious habits before running unfamiliar commands.",
    ],
    estimatedMinutes: 60,
  },
  {
    id: "topic-virtualization-basics",
    trackId: "track-year-1-foundations",
    title: "Virtualization Basics",
    summary:
      "Learn how virtual machines share physical hardware while remaining isolated as separate computer systems.",
    certificationId: "cert-comptia-a-plus",
    year: 1,
    month: 1,
    week: 3,
    difficulty: "standard",
    prerequisiteTopicIds: ["topic-computer-hardware-basics", "topic-operating-systems-overview"],
    learningObjectives: [
      "Distinguish a host, hypervisor, guest, virtual machine, and container.",
      "Explain common benefits and limits of virtualization.",
      "Choose sensible CPU, memory, storage, and network resources for a small lab VM.",
    ],
    estimatedMinutes: 55,
  },
  {
    id: "topic-it-career-overview",
    trackId: "track-year-1-foundations",
    title: "IT Career Overview",
    summary:
      "Understand common entry-level IT roles, how teams work together, and the habits employers expect.",
    certificationId: "cert-comptia-a-plus",
    year: 1,
    month: 1,
    week: 3,
    difficulty: "gentle",
    prerequisiteTopicIds: [],
    learningObjectives: [
      "Compare support, systems, networking, cloud, and cybersecurity responsibilities.",
      "Explain escalation, documentation, service levels, and professional communication.",
      "Connect foundational study to realistic entry-level career paths.",
    ],
    estimatedMinutes: 40,
  },
  {
    id: "topic-networking-basics",
    trackId: "track-year-1-foundations",
    title: "Networking Basics",
    summary:
      "Move from a network overview into addressing, local traffic, routing, transport protocols, and basic troubleshooting.",
    certificationId: "cert-comptia-network-plus",
    year: 1,
    month: 1,
    week: 4,
    difficulty: "standard",
    prerequisiteTopicIds: ["topic-basic-networking-concepts"],
    learningObjectives: [
      "Recognize IPv4 addresses, subnet masks, default gateways, and private address ranges.",
      "Explain the different jobs of Ethernet, Wi-Fi, IP, TCP, UDP, and DHCP.",
      "Apply a layered checklist to a basic connectivity problem.",
    ],
    estimatedMinutes: 65,
  },
  {
    id: "topic-dns-fundamentals",
    trackId: "track-year-1-foundations",
    title: "DNS Fundamentals",
    summary:
      "Understand how readable domain names are resolved into records that computers can use to locate services.",
    certificationId: "cert-comptia-network-plus",
    year: 1,
    month: 1,
    week: 4,
    difficulty: "standard",
    prerequisiteTopicIds: ["topic-networking-basics"],
    learningObjectives: [
      "Describe recursive and authoritative DNS resolution.",
      "Recognize A, AAAA, CNAME, MX, NS, TXT, and PTR records.",
      "Use DNS-specific reasoning to separate name-resolution failures from connectivity failures.",
    ],
    estimatedMinutes: 60,
  },
  ...expansionTopics,
];

export const lessons: Lesson[] = [
  {
    id: "lesson-computer-hardware-basics-core",
    topicId: "topic-computer-hardware-basics",
    title: "How computer components work together",
    body: "A computer is a coordinated system: input arrives, instructions are processed, working data is held temporarily, and results are stored or sent elsewhere. Knowing each component's responsibility makes hardware faults easier to isolate.",
    definition:
      "Computer hardware is the physical equipment that runs software. The motherboard connects components; the CPU executes instructions; RAM holds active data; storage retains files when power is off; the power supply converts incoming electricity; and cooling removes heat. Input, output, and network devices let the system interact with people and other computers.",
    whyItMatters:
      "Support technicians must translate symptoms into likely component failures. A computer that powers off under load may have heat or power trouble, while a machine that slows when many applications open may lack RAM. Hardware knowledge also prevents unsafe upgrades: components must fit the motherboard, power budget, physical case, and intended workload.",
    keyTerms: [
      { term: "CPU", meaning: "The processor that fetches and executes program instructions." },
      {
        term: "RAM",
        meaning: "Fast, volatile memory used by programs that are currently running.",
      },
      {
        term: "Storage",
        meaning: "Persistent media, commonly an SSD or HDD, that retains data without power.",
      },
      {
        term: "Motherboard",
        meaning: "The main circuit board that connects and coordinates system components.",
      },
      {
        term: "PSU",
        meaning: "The power supply unit that converts wall power into regulated voltages.",
      },
    ],
    realWorldExamples: [
      "Opening a browser loads program files from an SSD into RAM, then the CPU executes its instructions.",
      "Installing a graphics card requires a compatible slot, enough case space, adequate cooling, and sufficient PSU capacity.",
    ],
    commonMisconceptions: [
      "More storage does not automatically make processing faster; storage capacity and CPU performance solve different problems.",
      "RAM is not permanent storage. Its contents normally disappear when the computer loses power.",
    ],
    summary:
      "Hardware components have distinct jobs but operate as one system. CPU, RAM, storage, motherboard, power, cooling, and peripherals form the basic map used to explain performance and diagnose faults.",
    nextSteps: [
      "Locate each major component in a desktop or teardown diagram.",
      "Compare the installed RAM, CPU, and storage reported by an operating system.",
    ],
  },
  {
    id: "lesson-operating-systems-overview-core",
    topicId: "topic-operating-systems-overview",
    title: "The operating system as system manager",
    body: "An operating system turns raw hardware into a usable platform. It schedules programs, organizes data, controls devices, and enforces boundaries between users and processes.",
    definition:
      "An operating system, or OS, is the core software that manages hardware resources and provides services to applications. Its kernel controls low-level access to CPU time, memory, storage, and devices. User interfaces, system utilities, drivers, filesystems, and security services build on that core.",
    whyItMatters:
      "Nearly every IT task happens through an operating system. Installing software, creating accounts, applying updates, reading logs, configuring networks, and recovering files all depend on OS concepts. Understanding the shared principles makes it easier to move between Windows, macOS, Linux, Android, and iOS even though their tools differ.",
    keyTerms: [
      {
        term: "Kernel",
        meaning: "The privileged core that manages hardware and system resources.",
      },
      { term: "Process", meaning: "A running instance of a program with allocated resources." },
      {
        term: "Filesystem",
        meaning: "The rules and structures an OS uses to name and organize stored data.",
      },
      {
        term: "Driver",
        meaning: "Software that lets the OS communicate with a particular hardware device.",
      },
      {
        term: "Permission",
        meaning: "A rule defining what a user or process may read, change, or execute.",
      },
    ],
    realWorldExamples: [
      "When a printer is connected, the OS uses a driver to translate print requests into instructions the device understands.",
      "A standard user account can run everyday applications while administrator approval protects system-wide settings.",
    ],
    commonMisconceptions: [
      "The desktop is not the entire operating system; it is one interface layered over many background services.",
      "Closing a window does not always stop its process because some applications continue running in the background.",
    ],
    summary:
      "The OS coordinates hardware, applications, files, users, and security. Different operating systems present different interfaces, but all solve similar resource-management problems.",
    nextSteps: [
      "Open the system's process viewer and identify active applications and background services.",
      "Find the filesystem location of your user profile and a system directory.",
    ],
  },
  {
    id: "lesson-basic-networking-concepts-core",
    topicId: "topic-basic-networking-concepts",
    title: "How connected devices communicate",
    body: "A network lets devices exchange information by agreeing on formats, addresses, and delivery rules. Communication crosses several devices and protocol layers before a response reaches the application that requested it.",
    definition:
      "A computer network is a group of connected devices that exchange data. End devices such as laptops and servers use network interfaces. Switches move local traffic, access points connect wireless clients, and routers move packets between networks. Protocols define how participants format, send, receive, and acknowledge information.",
    whyItMatters:
      "Modern applications depend on networks even when they appear local. IT professionals need to know where a communication path can fail: the device, its local link, a switch or access point, the router, an internet provider, or the remote service. A clear mental model prevents random troubleshooting.",
    keyTerms: [
      { term: "Client", meaning: "A device or program that requests a service." },
      { term: "Server", meaning: "A device or program that provides a service to clients." },
      {
        term: "Switch",
        meaning: "A device that forwards frames between devices on a local network.",
      },
      { term: "Router", meaning: "A device that forwards packets between separate networks." },
      { term: "Protocol", meaning: "An agreed set of rules for communication." },
    ],
    realWorldExamples: [
      "A laptop sends a web request through Wi-Fi to an access point, then through a router toward a remote web server.",
      "An office switch connects workstations and printers on the same local network while the router provides access to other networks.",
    ],
    commonMisconceptions: [
      "Wi-Fi and the internet are not the same thing. Wi-Fi is one local access method; internet service is the wider connection.",
      "A switch and router are not interchangeable: they normally make forwarding decisions at different layers and scopes.",
    ],
    summary:
      "Networks connect clients and servers through interfaces, switches, access points, and routers. Protocol layers divide a complex exchange into manageable responsibilities.",
    nextSteps: [
      "Draw the path from one device in your home to a public website.",
      "Identify which device provides Wi-Fi and which device routes traffic to the internet.",
    ],
  },
  {
    id: "lesson-command-line-fundamentals-core",
    topicId: "topic-command-line-fundamentals",
    title: "Working safely in a shell",
    body: "A command-line interface accepts precise text instructions. It is efficient, repeatable, and essential when a graphical interface is unavailable, but it rewards careful reading because commands can change a system immediately.",
    definition:
      "A shell is a program that reads commands and asks the operating system to perform them. A command usually contains an executable name followed by options that change behavior and arguments that name targets. Paths locate files or directories; absolute paths begin from the filesystem root, while relative paths begin from the current directory.",
    whyItMatters:
      "Support, networking, cloud, and security tools frequently expose their full capability through a shell. Commands are easy to document and repeat, work over remote connections, and reveal exact output. Understanding command structure is more valuable than memorizing a long list because built-in help can explain unfamiliar tools.",
    keyTerms: [
      { term: "Shell", meaning: "The command interpreter, such as PowerShell, Bash, or zsh." },
      { term: "Prompt", meaning: "The indicator that a shell is ready to accept input." },
      { term: "Option", meaning: "A modifier that changes how a command behaves." },
      { term: "Argument", meaning: "A value or target supplied to a command." },
      {
        term: "Working directory",
        meaning: "The directory used as the starting point for relative paths.",
      },
    ],
    realWorldExamples: [
      "A technician lists a log directory, changes into it, and reads a recent file without opening a desktop session.",
      "A network command displays the machine's address configuration so the result can be copied into a support ticket.",
    ],
    commonMisconceptions: [
      "The command line is not inherently more powerful than the OS; it is another interface to system capabilities.",
      "Commands are not universal. PowerShell, Command Prompt, Bash, and zsh use overlapping but different syntax and tools.",
    ],
    summary:
      "A shell combines commands, options, arguments, and paths into precise instructions. Safe operators inspect their location, read help, verify targets, and avoid elevated privileges unless required.",
    nextSteps: [
      "Practice displaying the current directory and listing its contents.",
      "Use a command's built-in help before trying options you do not recognize.",
    ],
  },
  {
    id: "lesson-virtualization-basics-core",
    topicId: "topic-virtualization-basics",
    title: "One computer, multiple isolated systems",
    body: "Virtualization uses software to present simulated hardware to guest operating systems. It lets one physical computer run multiple separated environments for servers, testing, and safe practice.",
    definition:
      "A virtual machine, or VM, is a software-defined computer with virtual CPU, memory, storage, and network hardware. A hypervisor allocates physical resources to VMs. The physical system is the host; each installed operating system is a guest. Containers instead share the host kernel and isolate applications rather than emulating a complete computer.",
    whyItMatters:
      "Organizations consolidate servers, reproduce test environments, recover systems from images, and isolate workloads with virtualization. Learners can build a lab without buying several computers. Resource planning still matters: every guest consumes real host CPU, RAM, storage space, and network capacity.",
    keyTerms: [
      { term: "Hypervisor", meaning: "The layer that creates and manages virtual machines." },
      { term: "Host", meaning: "The physical system and base environment providing resources." },
      { term: "Guest", meaning: "An operating system running inside a virtual machine." },
      { term: "Snapshot", meaning: "A record of VM state used to return to an earlier point." },
      {
        term: "Container",
        meaning: "An isolated application environment that shares the host OS kernel.",
      },
    ],
    realWorldExamples: [
      "A student runs a Linux guest on a Windows laptop to practice commands without replacing the host OS.",
      "A company runs several lightly used servers as separate VMs on one larger physical host.",
    ],
    commonMisconceptions: [
      "A VM is isolated, not invulnerable. It still requires updates, secure configuration, and careful network access.",
      "A snapshot is not a complete backup strategy because it often depends on the original VM storage and host.",
    ],
    summary:
      "Hypervisors divide physical resources among isolated guest systems. VMs provide full operating systems; containers isolate applications while sharing a kernel. Both trade overhead for flexibility and repeatability.",
    nextSteps: [
      "Check whether virtualization support is enabled on your computer.",
      "Plan a small lab VM without assigning more RAM or CPU than the host can spare.",
    ],
  },
  {
    id: "lesson-it-career-overview-core",
    topicId: "topic-it-career-overview",
    title: "Roles, responsibilities, and professional practice",
    body: "IT is a collection of connected disciplines rather than one job. Entry-level professionals solve user and system problems, document their work, protect data, and escalate issues when another team owns the risk or technology.",
    definition:
      "Information technology roles design, operate, support, and secure computing services. Service desk staff handle user incidents and requests; system administrators manage endpoints and servers; network teams maintain connectivity; cloud teams operate hosted platforms; and security teams reduce, detect, and respond to risk. Job titles vary, so responsibilities matter more than labels.",
    whyItMatters:
      "A realistic view of the field helps learners choose skills and communicate their value. Technical knowledge alone is not enough: employers need people who gather evidence, explain clearly, respect access controls, document changes, protect confidential information, and know when to escalate instead of guessing.",
    keyTerms: [
      {
        term: "Incident",
        meaning: "An unplanned interruption or reduction in the quality of a service.",
      },
      {
        term: "Service request",
        meaning: "A routine user request, such as software access or account help.",
      },
      {
        term: "Escalation",
        meaning: "Transferring an issue to the appropriate authority or specialist.",
      },
      {
        term: "SLA",
        meaning: "A service-level agreement defining expected response or resolution targets.",
      },
      {
        term: "Documentation",
        meaning: "A durable record of symptoms, evidence, actions, and outcomes.",
      },
    ],
    realWorldExamples: [
      "A service desk analyst verifies a user's identity, records an account-lockout incident, restores access, and documents the result.",
      "A support technician recognizes a suspected data breach and escalates it immediately rather than investigating beyond their authority.",
    ],
    commonMisconceptions: [
      "Cybersecurity is rarely a first step with no IT foundation; operating systems, networking, support, and documentation are core security skills.",
      "Entry-level does not mean unimportant. Frontline staff protect users, collect evidence, and often notice widespread failures first.",
    ],
    summary:
      "IT careers span support, systems, networking, cloud, and security. Reliable professionals combine technical foundations with communication, documentation, ethical judgment, and disciplined escalation.",
    nextSteps: [
      "Compare three entry-level job descriptions by their responsibilities rather than titles.",
      "Practice writing a short ticket note with symptom, evidence, action, and result.",
    ],
  },
  {
    id: "lesson-networking-basics-core",
    topicId: "topic-networking-basics",
    title: "Addressing and delivering network traffic",
    body: "Useful network troubleshooting requires more than knowing the devices. Addresses identify interfaces and networks, protocols divide delivery responsibilities, and each layer provides evidence about where communication stopped.",
    definition:
      "An IPv4 configuration normally includes an address, subnet mask, and default gateway. The address identifies an interface; the mask determines which destinations are local; the gateway routes traffic elsewhere. Ethernet or Wi-Fi carries local frames, IP moves packets across networks, and TCP or UDP transports application data. DHCP can supply configuration automatically.",
    whyItMatters:
      "Most IT services depend on correct addressing and a working path. A valid local link does not prove the gateway or internet works. By testing from the nearest layer outward—interface, address, local peer, gateway, remote address, then application—a technician can narrow the fault instead of changing unrelated settings.",
    keyTerms: [
      {
        term: "IPv4 address",
        meaning: "A 32-bit logical address commonly written as four decimal numbers.",
      },
      {
        term: "Subnet mask",
        meaning: "A value that separates the network portion of an address from the host portion.",
      },
      {
        term: "Default gateway",
        meaning: "The router a device uses for destinations outside its local network.",
      },
      {
        term: "TCP",
        meaning: "A connection-oriented transport protocol with ordered, reliable delivery.",
      },
      {
        term: "UDP",
        meaning: "A lightweight transport protocol without TCP's delivery guarantees.",
      },
      { term: "DHCP", meaning: "A service that automatically leases network settings to clients." },
    ],
    realWorldExamples: [
      "A laptop with a self-assigned 169.254.x.x address may have a working interface but no response from a DHCP server.",
      "A video call may favor timely UDP traffic, while a file transfer uses TCP to ensure ordered delivery.",
    ],
    commonMisconceptions: [
      "Devices on the same Wi-Fi name are not guaranteed to communicate; segmentation and client-isolation rules can still separate them.",
      "A successful connection to the default gateway proves only part of the path, not that every remote service is available.",
    ],
    summary:
      "Address, mask, and gateway information determine local and routed delivery. Link, internet, transport, and application protocols have separate jobs, which creates a practical order for troubleshooting.",
    nextSteps: [
      "Inspect your current IPv4 address, subnet mask, default gateway, and DHCP status.",
      "Sketch a layered connectivity checklist from physical link to application.",
    ],
  },
  {
    id: "lesson-dns-fundamentals-core",
    topicId: "topic-dns-fundamentals",
    title: "Resolving names into usable records",
    body: "The Domain Name System is a distributed directory. It lets people use stable names while services publish records that point to changing addresses and other destinations.",
    definition:
      "DNS maps names to typed records. A client usually asks a recursive resolver, which checks its cache and, when necessary, follows referrals from root servers to top-level-domain servers and authoritative servers. The authoritative server holds the source records for a DNS zone. Time to live, or TTL, tells caches how long a response may be reused.",
    whyItMatters:
      "A service can be reachable by IP address but fail by name, making DNS a distinct troubleshooting layer. Administrators also use DNS for mail routing, service aliases, verification, and reverse lookups. Understanding caches and authority explains why a correct record change may not appear everywhere immediately.",
    keyTerms: [
      {
        term: "Resolver",
        meaning:
          "A service that obtains DNS answers for clients, often using recursion and caching.",
      },
      {
        term: "Authoritative server",
        meaning: "A server that holds the official records for a DNS zone.",
      },
      { term: "A / AAAA", meaning: "Records mapping a name to an IPv4 or IPv6 address." },
      { term: "CNAME", meaning: "A record making one name an alias of another name." },
      { term: "MX", meaning: "A record identifying mail servers for a domain." },
      { term: "TTL", meaning: "The period a resolver may cache a DNS response." },
    ],
    realWorldExamples: [
      "A browser asks its configured resolver for a site's address before it can start the web connection.",
      "After an A record changes, some users may receive the older cached address until its previous TTL expires.",
    ],
    commonMisconceptions: [
      "DNS does not carry the website itself. It provides records used before or during connection to the service.",
      "One DNS server does not store every name. The system is distributed across resolvers and authoritative zones.",
    ],
    summary:
      "DNS resolves names through cached, distributed queries and returns typed records. Resolver, authority, record type, and TTL are the key ideas for understanding normal behavior and diagnosing failures.",
    nextSteps: [
      "Query A, AAAA, and MX records for a domain and compare the answers.",
      "When testing a failure, compare access by hostname with access by a known IP address.",
    ],
  },
  ...expansionLessons,
];
export const resources: Resource[] = [
  {
    id: "resource-comptia-a-plus-core-1",
    title: "CompTIA A+ Core 1 Certification",
    provider: "CompTIA",
    url: "https://www.comptia.org/en-us/certifications/a/core-1-v15/",
    topicIds: [
      "topic-computer-hardware-basics",
      "topic-basic-networking-concepts",
      "topic-virtualization-basics",
    ],
    certificationId: "cert-comptia-a-plus",
    kind: "learning-path",
    difficulty: "standard",
    access: "paid",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-microsoft-explore-computers",
    title: "Explore computers",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/training/modules/explore-computers/",
    topicIds: ["topic-computer-hardware-basics", "topic-basic-networking-concepts"],
    certificationId: "cert-comptia-a-plus",
    kind: "course",
    difficulty: "gentle",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-microsoft-windows-architecture",
    title: "Explore Windows architecture",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/training/modules/explore-windows-architecture/",
    topicIds: ["topic-operating-systems-overview", "topic-computer-hardware-basics"],
    certificationId: "cert-comptia-a-plus",
    kind: "course",
    difficulty: "gentle",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-cisco-networking-basics",
    title: "Networking Basics",
    provider: "Cisco Networking Academy",
    url: "https://skillsforall.com/course/networking-basics?courseLang=en-US",
    topicIds: ["topic-basic-networking-concepts", "topic-networking-basics"],
    certificationId: "cert-comptia-network-plus",
    kind: "course",
    difficulty: "gentle",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-microsoft-bash-introduction",
    title: "Introduction to Bash",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/training/modules/bash-introduction/",
    topicIds: ["topic-command-line-fundamentals", "topic-operating-systems-overview"],
    certificationId: "cert-comptia-a-plus",
    kind: "course",
    difficulty: "gentle",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-microsoft-hyper-v-overview",
    title: "Hyper-V virtualization overview",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/overview",
    topicIds: ["topic-virtualization-basics", "topic-operating-systems-overview"],
    certificationId: "cert-comptia-a-plus",
    kind: "docs",
    difficulty: "standard",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-comptia-explore-careers",
    title: "Explore tech careers",
    provider: "CompTIA",
    url: "https://www.comptia.org/en-us/explore-careers/",
    topicIds: ["topic-it-career-overview"],
    certificationId: "cert-comptia-a-plus",
    kind: "learning-path",
    difficulty: "gentle",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-cisco-networking-essentials",
    title: "Networking Essentials",
    provider: "Cisco Networking Academy",
    url: "https://www.netacad.com/courses/networking-essentials",
    topicIds: [
      "topic-networking-basics",
      "topic-basic-networking-concepts",
      "topic-dns-fundamentals",
    ],
    certificationId: "cert-comptia-network-plus",
    kind: "course",
    difficulty: "standard",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-cloudflare-dns-concepts",
    title: "DNS concepts",
    provider: "Cloudflare Docs",
    url: "https://developers.cloudflare.com/dns/concepts/",
    topicIds: ["topic-dns-fundamentals", "topic-networking-basics"],
    certificationId: "cert-comptia-network-plus",
    kind: "docs",
    difficulty: "gentle",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-professor-messer-video-training",
    title: "Free CompTIA certification video training",
    provider: "Professor Messer",
    url: "https://www.professormesser.com/",
    topicIds: [
      "topic-computer-hardware-basics",
      "topic-operating-systems-overview",
      "topic-virtualization-basics",
      "topic-it-career-overview",
    ],
    certificationId: "cert-comptia-a-plus",
    kind: "video",
    difficulty: "gentle",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-professor-messer-youtube",
    title: "Professor Messer video channel",
    provider: "Professor Messer",
    url: "https://www.youtube.com/@professormesser",
    topicIds: [
      "topic-basic-networking-concepts",
      "topic-networking-basics",
      "topic-dns-fundamentals",
    ],
    certificationId: "cert-comptia-network-plus",
    kind: "video",
    difficulty: "standard",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-microsoft-learn-shows",
    title: "Microsoft Learn shows and video series",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/shows/",
    topicIds: [
      "topic-operating-systems-overview",
      "topic-virtualization-basics",
      "topic-command-line-fundamentals",
      "topic-it-career-overview",
    ],
    certificationId: "cert-comptia-a-plus",
    kind: "video",
    difficulty: "standard",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
  {
    id: "resource-linux-foundation-videos",
    title: "Linux Foundation video channel",
    provider: "The Linux Foundation",
    url: "https://www.youtube.com/@LinuxfoundationOrg",
    topicIds: ["topic-command-line-fundamentals", "topic-operating-systems-overview"],
    certificationId: "cert-comptia-linux-plus",
    kind: "video",
    difficulty: "standard",
    access: "free",
    lastVerified: "2026-09-11",
    status: "verified",
  },
];
export { assignments };
export { labs };
export { incidents };
export { tickets };
export { questions, quizzes };
export { weeks } from "./week-content";
export { certifications, certificationObjectives };
export const careerSkills: CareerSkill[] = [];

export const staticContent = {
  tracks,
  weeks: curriculumWeeks,
  topics,
  lessons,
  resources,
  assignments,
  labs,
  incidents,
  tickets,
  quizzes,
  questions,
  certifications,
  certificationObjectives,
  careerSkills,
};

export type StaticContent = typeof staticContent;
