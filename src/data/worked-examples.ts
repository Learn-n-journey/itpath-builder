/**
 * Worked examples: step-by-step demonstrations of the calculations and
 * procedures a learner has to be able to perform, followed by practice items
 * with answers. Content lives here, never in the UI.
 */
import type { EntityId } from "@/lib/app-data/types";
import { ownerWorkedExamplesFor } from "@/lib/owner-lesson-store";

export interface WorkedExampleStep {
  label: string;
  detail: string;
}

export interface PracticeItem {
  prompt: string;
  answer: string;
}

export interface WorkedExample {
  id: EntityId;
  title: string;
  topicIds: EntityId[];
  certificationId: EntityId;
  question: string;
  steps: WorkedExampleStep[];
  answer: string;
  tryIt: PracticeItem[];
}

export const workedExamples: WorkedExample[] = [
  {
    id: "example-binary-to-decimal",
    title: "Convert binary to decimal",
    topicIds: ["topic-basic-networking-concepts", "topic-networking-basics", "topic-binary-and-number-systems"],
    certificationId: "cert-comptia-a-plus",
    question: "Convert the 8-bit binary number 11000000 to decimal.",
    steps: [
      {
        label: "1. Write the place values",
        detail: "An 8-bit number has fixed place values, left to right: 128, 64, 32, 16, 8, 4, 2, 1.",
      },
      {
        label: "2. Line the bits up under the place values",
        detail: "128→1, 64→1, 32→0, 16→0, 8→0, 4→0, 2→0, 1→0.",
      },
      {
        label: "3. Keep only the place values above a 1",
        detail: "The 128 column and the 64 column hold a 1. Every other column holds 0 and contributes nothing.",
      },
      { label: "4. Add them", detail: "128 + 64 = 192." },
    ],
    answer: "11000000 = 192. This is why a /24 subnet mask octet of 11000000 reads as 192 in dotted decimal.",
    tryIt: [
      { prompt: "Convert 10101010 to decimal.", answer: "128 + 32 + 8 + 2 = 170" },
      { prompt: "Convert 11111111 to decimal.", answer: "128+64+32+16+8+4+2+1 = 255 (all bits on)" },
      { prompt: "Convert 00011100 to decimal.", answer: "16 + 8 + 4 = 28" },
    ],
  },
  {
    id: "example-decimal-to-binary",
    title: "Convert decimal to binary",
    topicIds: ["topic-basic-networking-concepts", "topic-networking-basics", "topic-binary-and-number-systems"],
    certificationId: "cert-comptia-a-plus",
    question: "Convert the decimal number 172 to 8-bit binary.",
    steps: [
      {
        label: "1. Start at the largest place value",
        detail: "Ask: does 128 fit into 172? Yes. Write a 1 and subtract: 172 − 128 = 44.",
      },
      { label: "2. Next column, 64", detail: "64 does not fit into 44. Write 0. Remainder stays 44." },
      { label: "3. Next column, 32", detail: "32 fits into 44. Write 1. 44 − 32 = 12." },
      { label: "4. Continue down", detail: "16 into 12? No → 0. 8 into 12? Yes → 1, remainder 4. 4 into 4? Yes → 1, remainder 0. 2 → 0. 1 → 0." },
      { label: "5. Read the bits in order", detail: "1, 0, 1, 0, 1, 1, 0, 0." },
    ],
    answer: "172 = 10101100. Check it by adding the on-bits back: 128 + 32 + 8 + 4 = 172.",
    tryIt: [
      { prompt: "Convert 200 to binary.", answer: "11001000 (128 + 64 + 8)" },
      { prompt: "Convert 19 to binary.", answer: "00010011 (16 + 2 + 1)" },
      { prompt: "Convert 255 to binary.", answer: "11111111" },
    ],
  },
  {
    id: "example-binary-to-hex",
    title: "Convert binary to hexadecimal",
    topicIds: ["topic-basic-networking-concepts", "topic-binary-and-number-systems", "topic-networking-basics"],
    certificationId: "cert-comptia-a-plus",
    question: "Convert 11011110 to hexadecimal (the form used by MAC and IPv6 addresses).",
    steps: [
      { label: "1. Split into 4-bit groups", detail: "11011110 becomes 1101 and 1110." },
      {
        label: "2. Convert each group with place values 8, 4, 2, 1",
        detail: "1101 = 8 + 4 + 1 = 13. 1110 = 8 + 4 + 2 = 14.",
      },
      {
        label: "3. Replace values over 9 with letters",
        detail: "10=A, 11=B, 12=C, 13=D, 14=E, 15=F. So 13 = D and 14 = E.",
      },
      { label: "4. Join the digits", detail: "D followed by E." },
    ],
    answer: "11011110 = DE in hex, which is 222 in decimal. Each pair of hex digits is exactly one byte, which is why a MAC address is six hex pairs.",
    tryIt: [
      { prompt: "Convert 10101111 to hex.", answer: "1010 = A, 1111 = F → AF" },
      { prompt: "Convert hex 3C to binary.", answer: "3 = 0011, C = 1100 → 00111100" },
      { prompt: "Convert hex FF to decimal.", answer: "15×16 + 15 = 255" },
    ],
  },
  {
    id: "example-subnet-mask",
    title: "Work out a network address and host range",
    topicIds: ["topic-networking-basics", "topic-basic-networking-concepts"],
    certificationId: "cert-comptia-network-plus",
    question: "A host is configured as 192.168.10.77 with the mask 255.255.255.192 (/26). What is its network address, broadcast address and usable host range?",
    steps: [
      {
        label: "1. Find the interesting octet",
        detail: "The first three octets of the mask are 255, so only the fourth octet matters. 192 in binary is 11000000, so 2 host-network bits are borrowed.",
      },
      { label: "2. Find the block size", detail: "256 − 192 = 64. Subnets step in blocks of 64: 0, 64, 128, 192." },
      { label: "3. Place the host", detail: "77 falls between 64 and 127, so the host sits in the 192.168.10.64 subnet." },
      { label: "4. Name the boundaries", detail: "Network address = 192.168.10.64. Broadcast = one below the next block = 192.168.10.127." },
      { label: "5. Usable hosts", detail: "Everything between the two boundaries: .65 through .126." },
    ],
    answer: "Network 192.168.10.64, broadcast 192.168.10.127, usable range 192.168.10.65–192.168.10.126 (62 usable addresses).",
    tryIt: [
      { prompt: "Same question for 10.0.0.200 /26.", answer: "Block 64 → network 10.0.0.192, broadcast 10.0.0.255, usable .193–.254" },
      { prompt: "What mask is /28 in dotted decimal, and what is its block size?", answer: "255.255.255.240, block size 16" },
      { prompt: "How many usable hosts in a /29?", answer: "2^3 − 2 = 6" },
    ],
  },
  {
    id: "example-host-count",
    title: "Count usable hosts from a CIDR prefix",
    topicIds: ["topic-networking-basics", "topic-basic-networking-concepts"],
    certificationId: "cert-comptia-network-plus",
    question: "How many usable host addresses does a /22 network provide?",
    steps: [
      { label: "1. Count host bits", detail: "An IPv4 address is 32 bits. 32 − 22 = 10 host bits." },
      { label: "2. Raise 2 to that power", detail: "2^10 = 1024 total addresses in the block." },
      { label: "3. Remove the two reserved addresses", detail: "The lowest address is the network address and the highest is the broadcast address: 1024 − 2." },
    ],
    answer: "1022 usable host addresses. The general formula is 2^(32 − prefix) − 2.",
    tryIt: [
      { prompt: "Usable hosts in a /30?", answer: "2^2 − 2 = 2 (a point-to-point link)" },
      { prompt: "You need 500 hosts on one subnet. What is the smallest prefix?", answer: "/23 gives 510 usable; /24 gives only 254" },
      { prompt: "Total addresses in a /16?", answer: "2^16 = 65,536 (65,534 usable)" },
    ],
  },
  {
    id: "example-dns-resolution",
    title: "Trace a DNS lookup step by step",
    topicIds: ["topic-dns-fundamentals", "topic-networking-basics"],
    certificationId: "cert-comptia-network-plus",
    question: "A workstation opens www.example.com for the first time. What happens before the first packet reaches the web server?",
    steps: [
      { label: "1. Local checks", detail: "The resolver checks its own cache, then the hosts file. A stale entry here explains a machine that reaches the wrong server while everyone else is fine." },
      { label: "2. Recursive resolver", detail: "The query goes to the configured DNS server, usually learned by DHCP. If that server has a cached answer within its TTL, it replies immediately." },
      { label: "3. Root and TLD", detail: "With no cache, the resolver asks a root server, which refers it to the .com name servers, which refer it to the authoritative servers for example.com." },
      { label: "4. Authoritative answer", detail: "The authoritative server returns the A record (IPv4) or AAAA record (IPv6) for www.example.com." },
      { label: "5. Cache and connect", detail: "The answer is cached for its TTL, then the workstation opens a TCP connection to that IP on port 443." },
    ],
    answer: "Name resolution is a chain: cache → hosts file → recursive resolver → root → TLD → authoritative. Test the chain with nslookup or dig; if the IP is correct but the page fails, the fault is below DNS.",
    tryIt: [
      { prompt: "A site works by IP but not by name. Where is the fault?", answer: "Name resolution, resolver, cache, hosts file or record, not the web server" },
      { prompt: "Which record type maps a name to an IPv6 address?", answer: "AAAA" },
      { prompt: "Why does a record change take hours to appear everywhere?", answer: "Caches hold the old answer until its TTL expires" },
    ],
  },
  {
    id: "example-linux-permissions",
    title: "Read and set Linux file permissions",
    topicIds: ["topic-command-line-fundamentals", "topic-operating-systems-overview"],
    certificationId: "cert-comptia-linux-plus",
    question: "A script shows as -rwxr-xr-- . What are its numeric permissions, and what command would make it rwxr-x---?",
    steps: [
      { label: "1. Split the string", detail: "Ignore the leading file-type character, then take three groups: owner rwx, group r-x, others r--." },
      { label: "2. Score each group", detail: "read = 4, write = 2, execute = 1. Owner 4+2+1 = 7. Group 4+0+1 = 5. Others 4+0+0 = 4." },
      { label: "3. Read the number", detail: "The permissions are 754." },
      { label: "4. Build the target", detail: "rwx = 7, r-x = 5, --- = 0, so the goal is 750." },
    ],
    answer: "-rwxr-xr-- is 754; chmod 750 script.sh produces rwxr-x---. A 'Permission denied' on your own script is usually a missing execute bit (chmod +x).",
    tryIt: [
      { prompt: "What is rw-r--r-- numerically?", answer: "644" },
      { prompt: "What does chmod 600 key.pem allow?", answer: "Owner read and write only, required for SSH private keys" },
      { prompt: "Which command changes the owning user?", answer: "chown" },
    ],
  },
  {
    id: "example-storage-math",
    title: "Explain a 'missing' drive capacity",
    topicIds: ["topic-computer-hardware-basics", "topic-operating-systems-overview"],
    certificationId: "cert-comptia-a-plus",
    question: "A customer buys a 1 TB drive and Windows reports 931 GB. Has the shop cheated them?",
    steps: [
      { label: "1. Manufacturer units", detail: "Drive makers use decimal units: 1 TB = 1,000,000,000,000 bytes." },
      { label: "2. Operating system units", detail: "Windows reports binary units but labels them GB: 1 GiB = 1,073,741,824 bytes." },
      { label: "3. Do the division", detail: "1,000,000,000,000 ÷ 1,073,741,824 ≈ 931." },
      { label: "4. Account for formatting", detail: "The filesystem and recovery partitions then consume a further few gigabytes." },
    ],
    answer: "No. The bytes are all there; the two sides count in different units. Say this to the customer in plain terms rather than quoting powers of two.",
    tryIt: [
      { prompt: "How much usable space would a 2 TB drive report?", answer: "Roughly 1863 GB before formatting" },
      { prompt: "How many bytes in 1 MiB?", answer: "1,048,576" },
      { prompt: "Why does a phone advertise 128 GB but show around 112 GB?", answer: "Same unit difference plus the operating system's own files" },
    ],
  },
  {
    id: "example-psu-sizing",
    title: "Size a power supply for a build",
    topicIds: ["topic-computer-hardware-basics"],
    certificationId: "cert-comptia-a-plus",
    question: "A desktop has a 125 W CPU, a 220 W graphics card, 2 SSDs, 4 fans and a 60 W motherboard load. What power supply do you fit?",
    steps: [
      { label: "1. Add the big consumers", detail: "CPU 125 W plus graphics card 220 W is 345 W under load. These two dominate every desktop total." },
      { label: "2. Add the small ones", detail: "Motherboard and RAM about 60 W, each SSD about 5 W, each fan about 3 W. That is 82 W more, so 427 W total." },
      { label: "3. Leave headroom", detail: "Supplies run most efficiently near half load, and peak draw is spikier than the average. Add roughly 30 percent: 427 x 1.3 is about 555 W." },
      { label: "4. Check the connectors, not just the watts", detail: "Confirm the unit has the 24-pin board connector, the CPU 8-pin, and the PCIe connectors the card actually requires." },
    ],
    answer: "A quality 650 W unit. Undersized supplies do not fail politely: you get random reboots under load, which look like software faults until you measure the power.",
    tryIt: [
      { prompt: "Same build with no graphics card. What size fits?", answer: "About 210 W of load, so a 400 to 450 W unit is ample" },
      { prompt: "A machine reboots only while gaming. First suspect?", answer: "Power delivery or heat, both load-dependent, rather than the operating system" },
      { prompt: "Why not simply fit a 1200 W supply to everything?", answer: "It costs more and runs at poor efficiency at low load; headroom past about 30 percent buys nothing" },
    ],
  },
  {
    id: "example-ram-compatibility",
    title: "Check a RAM upgrade before you order it",
    topicIds: ["topic-computer-hardware-basics"],
    certificationId: "cert-comptia-a-plus",
    question: "A laptop has 8 GB and two slots, one filled with a DDR4-3200 SODIMM. The customer wants 32 GB. What do you order?",
    steps: [
      { label: "1. Match the generation and form factor", detail: "DDR4 will not fit a DDR5 slot, and a desktop DIMM will not fit a laptop. Read the existing module label or the board specification." },
      { label: "2. Check the board and chipset maximum", detail: "Two slots at 16 GB each gives 32 GB, but only if the specification lists 32 GB as supported. Many older boards cap at 16." },
      { label: "3. Decide add versus replace", detail: "The 8 GB module plus one 16 GB module gives 24 GB and breaks dual channel pairing. Two matched 16 GB modules give 32 GB and keep both channels." },
      { label: "4. Confirm the speed the system will run", detail: "Mixed speeds all run at the slowest module, so ordering a matched pair avoids quiet performance loss." },
    ],
    answer: "Order a matched pair of 16 GB DDR4-3200 SODIMMs and retire the original module. Capacity, generation, form factor and board maximum all have to agree before the order goes out.",
    tryIt: [
      { prompt: "A machine shows 16 GB installed and 8 GB usable. Likely cause?", answer: "A module or slot is not being seated or detected, or memory is reserved by integrated graphics" },
      { prompt: "Why fit modules in matched pairs?", answer: "Dual channel needs a pair; a single module halves memory bandwidth" },
      { prompt: "A DDR5 module will not go into a DDR4 board. Why?", answer: "The notch position differs by generation, which physically prevents the wrong fit" },
    ],
  },
  {
    id: "example-vm-sizing",
    title: "Size virtual machines on a host",
    topicIds: ["topic-virtualization-basics", "topic-operating-systems-overview"],
    certificationId: "cert-comptia-a-plus",
    question: "A host has 16 GB RAM and 8 CPU cores. How many 4 GB lab VMs can safely run at once?",
    steps: [
      { label: "1. Reserve for the host", detail: "The host operating system and hypervisor need their own memory, reserve about 4 GB." },
      { label: "2. Divide what remains", detail: "16 − 4 = 12 GB available. 12 ÷ 4 = 3 VMs." },
      { label: "3. Check CPU", detail: "Cores can be oversubscribed; memory generally cannot. Two virtual CPUs each across 3 VMs is 6 of 8 cores, comfortable." },
      { label: "4. Check disk", detail: "Dynamically expanding disks grow over time; confirm free space on the host volume before you build." },
    ],
    answer: "Three 4 GB VMs. Memory is the hard limit: overcommit it and the host swaps to disk and everything crawls.",
    tryIt: [
      { prompt: "Same host, VMs need 6 GB each. How many?", answer: "Two (12 ÷ 6)" },
      { prompt: "Why does a container need less memory than a VM?", answer: "It shares the host kernel instead of running a full guest OS" },
      { prompt: "Which resource can you safely oversubscribe?", answer: "CPU cores, within reason" },
    ],
  },
  {
    id: "example-cli-pipeline",
    title: "Build a command line pipeline",
    topicIds: ["topic-command-line-fundamentals"],
    certificationId: "cert-comptia-linux-plus",
    question: "Find every failed SSH login in /var/log/auth.log and count them per source address.",
    steps: [
      { label: "1. Filter the lines", detail: "grep 'Failed password' /var/log/auth.log narrows thousands of lines to the ones that matter." },
      { label: "2. Extract the field", detail: "Pipe into awk '{print $(NF-3)}' to pull the source IP from each line." },
      { label: "3. Group them", detail: "sort groups identical addresses together; uniq -c then counts each group." },
      { label: "4. Rank them", detail: "sort -nr puts the noisiest address at the top." },
    ],
    answer: "grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr, each command does one job and the pipe passes text along.",
    tryIt: [
      { prompt: "How would you keep the output for a ticket?", answer: "Redirect it: ... > failed-logins.txt" },
      { prompt: "Which command shows a log as it is being written?", answer: "tail -f" },
      { prompt: "What does | actually do?", answer: "Sends the standard output of one command to the standard input of the next" },
    ],
  },
  {
    id: "example-ticket-priority",
    title: "Prioritise a support queue",
    topicIds: ["topic-it-career-overview"],
    certificationId: "cert-comptia-a-plus",
    question: "Four tickets arrive at once. Which do you take first?",
    steps: [
      { label: "1. List impact and urgency", detail: "A: one user's mouse. B: the finance team of 12 cannot print payroll, due today. C: a director's laptop is slow. D: the shared file server is offline for everyone." },
      { label: "2. Score impact", detail: "Impact is how many people are stopped: D = whole site, B = 12, A and C = 1 each." },
      { label: "3. Score urgency", detail: "Urgency is how time-bound it is: B has a same-day deadline; C has none beyond annoyance." },
      { label: "4. Combine, do not let seniority decide", detail: "Priority = impact × urgency. Rank: D, B, then A (blocking one person's work) then C (degraded, still working)." },
    ],
    answer: "D, B, A, C, and set expectations with everyone in the queue. A job title is not a priority level; a documented matrix is what you defend the order with.",
    tryIt: [
      { prompt: "One user cannot log in at all versus ten users with slow email. Which first?", answer: "Judge by impact × urgency; a total block on one user often outranks mild degradation for ten, unless the ten are deadline-bound" },
      { prompt: "What do you do with the ticket you cannot start yet?", answer: "Update it with an honest expected time, silence generates escalations" },
      { prompt: "What goes in the ticket when you close it?", answer: "Symptom, cause, fix, and the verification you performed" },
    ],
  },
];

/** A topic the owner wrote Worked examples rows for shows only those. */
export function getWorkedExamples(topicId: string): WorkedExample[] {
  const owned = ownerWorkedExamplesFor(topicId);
  if (owned.length) return owned;
  return workedExamples.filter((example) => example.topicIds.includes(topicId));
}

export function getCertificationWorkedExamples(
  certificationId: string,
  topicIds: string[] = [],
): WorkedExample[] {
  const ids = new Set(topicIds);
  const matched = workedExamples.filter(
    (example) =>
      example.certificationId === certificationId ||
      example.topicIds.some((id) => ids.has(id)),
  );
  if (matched.length > 0) return matched;
  // Every certification builds on the same numeracy, so fall back to it rather
  // than showing an empty section.
  return workedExamples.filter((example) => foundationExampleIds.includes(example.id));
}

const foundationExampleIds = [
  "example-binary-to-decimal",
  "example-decimal-to-binary",
  "example-binary-to-hex",
  "example-subnet-mask",
  "example-host-count",
];
