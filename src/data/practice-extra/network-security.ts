/** Additional practice questions: network-security. */
import type { PracticeSeed } from "./types";

export const network_securityPractice: PracticeSeed[] = [
  // networking-basics
  {
    slug: "networking-basics",
    title: "Identify a private address",
    prompt: "Which of these addresses is a private IPv4 address commonly used inside a home or office network?",
    choices: ["8.8.8.8", "192.168.1.20", "1.1.1.1", "203.0.113.5"],
    answerIndex: 1,
    explanation: "Addresses in the 192.168.0.0/16 range are reserved for private local networks and are not routed on the public internet.",
  },
  {
    slug: "networking-basics",
    title: "Plan a subnet mask check",
    prompt: "A user says their computer at 10.0.1.15 with mask 255.255.255.0 cannot reach a server at 10.0.2.20. What is the most likely reason?",
    choices: ["The mask puts the server on a different subnet, so traffic must go through the gateway", "The server has a bad power supply", "The user typed the wrong username", "The monitor cable is loose"],
    answerIndex: 0,
    explanation: "With a /24 mask, 10.0.1.x and 10.0.2.x are different subnets, so the traffic needs a working gateway to route between them.",
  },
  {
    slug: "networking-basics",
    title: "Choose the right transport protocol",
    prompt: "A developer is building an app that streams live video and can tolerate a little data loss but needs low delay. Which protocol fits best?",
    choices: ["TCP, because it guarantees delivery", "UDP, because it favors speed over guaranteed delivery", "DHCP, because it assigns addresses", "DNS, because it resolves names"],
    answerIndex: 1,
    explanation: "UDP skips the overhead of acknowledgments and retransmission, which suits live streaming where speed matters more than perfect delivery.",
  },
  {
    slug: "networking-basics",
    title: "Troubleshoot a port-level failure",
    prompt: "A user can ping a file server by IP address, but the file-sharing application still cannot connect. What should you check next?",
    choices: ["Restart the user's monitor", "Whether a firewall is blocking the specific application port", "Whether the DNS server is authoritative", "Whether the keyboard is plugged in"],
    answerIndex: 1,
    explanation: "A successful ping shows basic network reachability, so a failed application connection often points to a blocked port or firewall rule rather than a routing problem.",
  },

  // dns-fundamentals
  {
    slug: "dns-fundamentals",
    title: "Match the record to its job",
    prompt: "Which DNS record type maps a domain name directly to an IPv4 address?",
    choices: ["MX", "CNAME", "A", "TXT"],
    answerIndex: 2,
    explanation: "An A record points a hostname to an IPv4 address, while AAAA is used for IPv6 addresses.",
  },
  {
    slug: "dns-fundamentals",
    title: "Explain a caching symptom",
    prompt: "A company changes its website's IP address. Some employees reach the new site right away, but others still land on the old one for a while. What best explains this?",
    choices: ["Their resolvers are serving cached answers until the TTL expires", "Their computers have no network cable", "The website no longer has a domain name", "Their browsers are using the wrong language setting"],
    answerIndex: 0,
    explanation: "DNS resolvers cache answers for the length of the record's TTL, so different resolvers can hold onto the old address for different amounts of time.",
  },
  {
    slug: "dns-fundamentals",
    title: "Pick the right lookup tool",
    prompt: "You need to check what MX record is currently published for a domain before troubleshooting email delivery. What should you do?",
    choices: ["Run a lookup tool like dig or nslookup and query the MX record", "Restart the mail server", "Ping the domain and read the response time", "Clear the browser's saved passwords"],
    answerIndex: 0,
    explanation: "Tools such as dig or nslookup let you query a specific record type directly, which confirms what is actually published before you look elsewhere.",
  },
  {
    slug: "dns-fundamentals",
    title: "Diagnose a broken delegation",
    prompt: "Internal testing shows the domain's authoritative name servers never respond to queries for its records, even though the domain registration is active. What is the most likely cause?",
    choices: ["The office printer is offline", "A broken delegation or misconfigured name server records", "The user's antivirus is out of date", "The webpage has a broken image link"],
    answerIndex: 1,
    explanation: "If authoritative servers cannot be reached or the delegation is misconfigured, resolvers cannot find an authority to answer the query, which breaks resolution for everyone.",
  },
];
