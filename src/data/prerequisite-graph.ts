/**
 * Static prerequisite graph. Skills are the smallest referenceable capability;
 * some map onto a curriculum topic, others are sub-skills that will gain topics later.
 * Edges only ever point from a skill to the skills it depends on.
 */

export interface SkillNode {
  id: string;
  title: string;
  /** Curriculum topic that teaches this skill, when one exists yet. */
  topicId?: string;
  /** Skills that must be solid before this one is worth studying. */
  prerequisiteSkillIds: string[];
  summary: string;
}

export const skillNodes: SkillNode[] = [
  {
    id: "skill-computer-hardware",
    title: "Computer Hardware",
    topicId: "topic-computer-hardware-basics",
    prerequisiteSkillIds: [],
    summary: "Components, power, storage, memory and how a machine is assembled.",
  },
  {
    id: "skill-binary",
    title: "Binary and Number Systems",
    prerequisiteSkillIds: [],
    summary: "Bits, bytes, powers of two, and converting between binary and decimal.",
  },
  {
    id: "skill-windows",
    title: "Windows and Operating Systems",
    topicId: "topic-operating-systems-overview",
    prerequisiteSkillIds: ["skill-computer-hardware"],
    summary: "Kernel, processes, file systems, users, permissions and system services.",
  },
  {
    id: "skill-command-line",
    title: "Command Line Fundamentals",
    topicId: "topic-command-line-fundamentals",
    prerequisiteSkillIds: ["skill-windows"],
    summary: "Shells, paths, arguments, redirection and safe destructive-command habits.",
  },
  {
    id: "skill-networking-fundamentals",
    title: "Networking Fundamentals",
    topicId: "topic-basic-networking-concepts",
    prerequisiteSkillIds: ["skill-computer-hardware"],
    summary: "Packets, the OSI layers, switches, routers and the client/server model.",
  },
  {
    id: "skill-ipv4",
    title: "IPv4 Addressing",
    prerequisiteSkillIds: ["skill-binary", "skill-networking-fundamentals"],
    summary: "Dotted-decimal addresses, address classes, private ranges and host identity.",
  },
  {
    id: "skill-subnet-masks",
    title: "Subnet Masks",
    prerequisiteSkillIds: ["skill-ipv4"],
    summary: "Masks, CIDR prefixes, and separating the network portion from the host portion.",
  },
  {
    id: "skill-subnetting",
    title: "Subnetting",
    prerequisiteSkillIds: ["skill-subnet-masks"],
    summary: "Splitting address space into usable subnets and calculating ranges.",
  },
  {
    id: "skill-networking",
    title: "Networking in Practice",
    topicId: "topic-networking-basics",
    prerequisiteSkillIds: ["skill-windows", "skill-networking-fundamentals"],
    summary: "Applying addressing, routing and services to real network behaviour.",
  },
  {
    id: "skill-dns",
    title: "DNS",
    topicId: "topic-dns-fundamentals",
    prerequisiteSkillIds: ["skill-networking"],
    summary: "Resolvers, record types, caching, TTLs and name-resolution failure modes.",
  },
  {
    id: "skill-authentication",
    title: "Authentication",
    prerequisiteSkillIds: ["skill-dns"],
    summary: "Credentials, tickets, tokens, MFA and how identity is proven on a network.",
  },
  {
    id: "skill-active-directory",
    title: "Active Directory",
    prerequisiteSkillIds: ["skill-authentication"],
    summary: "Domains, objects, group policy and centralized directory administration.",
  },
  {
    id: "skill-logs",
    title: "Logs and Telemetry",
    prerequisiteSkillIds: ["skill-networking", "skill-command-line"],
    summary: "Where events are written, how to read them, and what normal looks like.",
  },
  {
    id: "skill-security",
    title: "Security Fundamentals",
    prerequisiteSkillIds: ["skill-logs"],
    summary: "Threats, controls, least privilege and defence in depth.",
  },
  {
    id: "skill-siem",
    title: "SIEM Operations",
    prerequisiteSkillIds: ["skill-security"],
    summary: "Aggregating log sources, writing detections and triaging alerts.",
  },
  {
    id: "skill-iam",
    title: "Identity and Access Management",
    prerequisiteSkillIds: ["skill-networking"],
    summary: "Accounts, roles, policies and provisioning across systems.",
  },
  {
    id: "skill-virtualization",
    title: "Virtualization",
    topicId: "topic-virtualization-basics",
    prerequisiteSkillIds: ["skill-iam"],
    summary: "Hypervisors, virtual machines, snapshots and resource allocation.",
  },
  {
    id: "skill-cloud",
    title: "Cloud Fundamentals",
    prerequisiteSkillIds: ["skill-virtualization"],
    summary: "Service models, regions, shared responsibility and cloud networking.",
  },
  {
    id: "skill-cloud-security",
    title: "Cloud Security",
    prerequisiteSkillIds: ["skill-cloud"],
    summary: "Cloud identity boundaries, key management, logging and misconfiguration risk.",
  },
  {
    id: "skill-it-career",
    title: "IT Career Awareness",
    topicId: "topic-it-career-overview",
    prerequisiteSkillIds: [],
    summary: "Role families, expectations, and how skills map to jobs.",
  },
];

export function getSkill(id: string): SkillNode | undefined {
  return skillNodes.find((node) => node.id === id);
}

export function getSkillByTopic(topicId: string): SkillNode | undefined {
  return skillNodes.find((node) => node.topicId === topicId);
}

/** Direct and indirect prerequisites, nearest first, cycle-safe. */
export function getPrerequisiteChain(skillId: string): SkillNode[] {
  const seen = new Set<string>([skillId]);
  const ordered: SkillNode[] = [];
  let frontier = getSkill(skillId)?.prerequisiteSkillIds ?? [];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      const node = getSkill(id);
      if (!node) continue;
      ordered.push(node);
      next.push(...node.prerequisiteSkillIds);
    }
    frontier = next;
  }
  return ordered;
}

/** Skills that depend on this one. Never recommended as remediation. */
export function getDependentSkills(skillId: string): SkillNode[] {
  return skillNodes.filter((node) => node.prerequisiteSkillIds.includes(skillId));
}
