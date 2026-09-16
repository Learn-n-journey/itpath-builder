import type { TopicSeed } from "./builder";

const CY = "cert-comptia-cysa-plus";

export const cysaExtraSeeds: TopicSeed[] = [
  {
    slug: "incident-response-and-containment-playbooks",
    title: "Incident Response and Containment Playbooks",
    summary: "Run a structured incident from detection through containment, eradication, and recovery using a repeatable playbook.",
    cert: CY,
    month: 20,
    week: 2,
    difficulty: "challenging",
    minutes: 60,
    prereqs: ["security-monitoring-and-siem", "log-analysis-and-detection-engineering"],
    objectives: [
      "Follow the incident response lifecycle from preparation through lessons learned.",
      "Choose a containment strategy that limits attacker impact without destroying evidence.",
      "Write and execute a playbook step for a specific incident category.",
    ],
    lesson: {
      title: "Turning a confirmed incident into a controlled response",
      body: "A confirmed incident is not the time to improvise. Playbooks convert chaotic first hours into a sequence of decisions that have already been thought through, so the team acts fast without acting recklessly.",
      definition: "Incident response is the structured process of preparing for, detecting, containing, eradicating, and recovering from a security incident, followed by a lessons learned review. A containment playbook is a documented, repeatable set of steps for a specific incident category, such as ransomware or a compromised account, that specifies who acts, what evidence to preserve, and which containment action to take first.",
      whyItMatters: "Untrained improvisation during an incident causes lost evidence, uncontrolled spread, and inconsistent communication. A rehearsed playbook lets an analyst act correctly under pressure and lets the organisation learn from every incident instead of repeating the same mistakes.",
      keyTerms: [
        ["Containment", "Actions that stop an incident from spreading further while preserving evidence."],
        ["Eradication", "Removing the attacker's foothold, such as malware, backdoors, or rogue accounts."],
        ["Chain of custody", "Documented handling of evidence so it remains admissible and trustworthy."],
        ["Playbook", "A predefined, repeatable set of response steps for a specific incident type."],
        ["Lessons learned review", "A post-incident meeting that captures what worked and what to change."],
      ],
      examples: [
        "For a ransomware incident, the playbook isolates the host from the network at the switch port rather than powering it off, preserving memory for forensic capture.",
        "For a compromised account, the playbook disables sign-in, revokes active sessions and tokens, and forces a password reset before investigating scope.",
      ],
      misconceptions: [
        "Pulling the power cable on an infected machine destroys volatile evidence in memory; network isolation is usually the safer first step.",
        "Containment is not the same as eradication; isolating a host stops the spread but the attacker's access still needs to be removed afterward.",
      ],
      summary: "Effective incident response depends on rehearsed playbooks that specify containment, evidence handling, and eradication steps in advance, so the team responds consistently and captures lessons for the next incident.",
      nextSteps: [
        "Draft a one-page containment playbook for a phishing-delivered malware incident.",
        "Run a tabletop exercise where the team walks through the playbook against a sample scenario.",
      ],
    },
    module: {
      howItWorks: [
        "Preparation defines roles, communication channels, tooling access, and playbooks before an incident occurs.",
        "Detection and analysis confirm scope and severity using the same evidence discipline as triage.",
        "Containment isolates affected systems, eradication removes the attacker's foothold, and recovery restores normal operation with monitoring for reinfection.",
      ],
      whereYouSeeIt: ["Security operations centres, incident response retainers, ransomware response, and regulatory breach handling."],
      commonProblems: ["No predefined roles during a live incident", "Evidence lost through premature shutdown", "Containment that alerts the attacker before eradication is ready", "Recovery without confirming eradication"],
      howItFails: [
        "A team without a communication plan leaks incident details internally, tipping off an insider threat.",
        "Restoring from backup without confirming the entry point reintroduces the same vulnerability.",
        "Containing one compromised host while a second, undiscovered host keeps the attacker's access alive.",
      ],
      troubleshooting: [
        "Confirm full scope before declaring containment complete; check for lateral movement indicators.",
        "Verify backups are clean and predate the compromise before using them for recovery.",
        "Preserve logs and memory captures before any remediation action that could overwrite them.",
      ],
      practicalKnowledge: [
        "Keep an out-of-band communication channel in case the primary network is compromised.",
        "Maintain a running incident timeline from the first alert so the lessons learned review has accurate data.",
      ],
      examCoverage: ["Incident response process and lifecycle", "Containment, eradication, and recovery strategies", "Communication and reporting during incidents"],
      interviewQuestions: ["Walk me through your first ten minutes after confirming a ransomware infection.", "How do you decide between isolating a host and letting it run for evidence collection?"],
    },
    recall: [
      ["Why is network isolation usually preferred over powering off an infected host?", ["memory", "evidence", "volatile", "isolate"], "Powering off destroys volatile memory evidence; network isolation stops spread while preserving it."],
      ["What must be confirmed before using a backup to recover a system?", ["clean", "entry point", "predate", "vulnerability"], "The backup must predate the compromise and the entry point must be fixed, or the same attack succeeds again."],
      ["What does a lessons learned review capture?", ["what worked", "gaps", "timeline", "improve"], "It captures what worked, what failed, and concrete changes to playbooks and controls."],
    ],
    practice: {
      title: "Choose the first containment action",
      prompt: "A workstation is actively encrypting files on a shared network drive. What is the best first containment action?",
      choices: [
        "Power off the workstation immediately to stop encryption",
        "Disconnect the workstation from the network while leaving it powered on",
        "Wait until the incident commander approves any action",
        "Run a full antivirus scan on the workstation before doing anything else",
      ],
      answerIndex: 1,
      explanation: "Disconnecting from the network stops the spread and further encryption while keeping the machine powered on to preserve memory for forensic analysis; powering off loses volatile evidence.",
    },
    scenario: {
      title: "Recovery that reintroduced the attacker",
      situation: "A team restored a compromised server from a backup taken the night before the intrusion was detected. Three days later the same web shell reappears because the backup already contained it and the vulnerable web application was never patched.",
      decisionPrompt: "What steps were skipped in eradication and recovery, and how should the playbook change?",
      expectedConcepts: ["eradication", "vulnerable", "clean backup", "verify"],
      guidance: "Eradication must remove the root cause, here the vulnerable application, before recovery. Backups must be verified as free of the compromise, not just recent, and recovery should include monitoring for reinfection.",
    },
  },
  {
    slug: "endpoint-detection-and-malware-analysis",
    title: "Endpoint Detection and Malware Analysis Basics",
    summary: "Use endpoint detection and response tooling and basic static and dynamic analysis to identify and understand malware behaviour.",
    cert: CY,
    month: 21,
    week: 2,
    difficulty: "challenging",
    minutes: 55,
    prereqs: ["security-monitoring-and-siem", "log-analysis-and-detection-engineering"],
    objectives: [
      "Use EDR telemetry to identify suspicious process and file activity on an endpoint.",
      "Distinguish static and dynamic malware analysis and know when each applies.",
      "Extract and document indicators of compromise from a suspicious file or process tree.",
    ],
    lesson: {
      title: "Reading what a suspicious file actually does",
      body: "An alert naming a file as malicious answers almost nothing. Analysts need to know what the file does, what it touches, and what it talks to, so containment and eradication target the right things.",
      definition: "Endpoint detection and response tools continuously record process creation, file writes, registry changes, and network connections on a host and let analysts search that history and isolate the machine remotely. Malware analysis examines a suspicious file to determine its behaviour and capability. Static analysis inspects the file without running it, such as hashes, strings, and imported functions. Dynamic analysis runs the file in an isolated sandbox and observes its actions.",
      whyItMatters: "Analysts who cannot read EDR telemetry or perform basic malware triage depend entirely on vendor labels, which are often generic or delayed. Being able to confirm what a file actually does speeds containment and produces indicators that improve future detection.",
      keyTerms: [
        ["Indicator of compromise", "An observable artifact, such as a hash, domain, or file path, tied to an intrusion."],
        ["Sandbox", "An isolated environment used to safely execute and observe suspicious files."],
        ["Static analysis", "Examining a file's properties and code without executing it."],
        ["Dynamic analysis", "Executing a file in a controlled environment and observing its behaviour."],
        ["Persistence mechanism", "A technique malware uses to survive reboot, such as a registry run key or scheduled task."],
      ],
      examples: [
        "A hash lookup against a threat intelligence source instantly confirms a known malware family without running the file.",
        "Detonating a suspicious attachment in a sandbox reveals it drops a second-stage payload and creates a scheduled task for persistence.",
      ],
      misconceptions: [
        "A clean antivirus scan does not prove a file is safe; many tools evade signature-based detection while still being malicious.",
        "Static analysis alone is not enough for packed or obfuscated malware, which often requires dynamic execution to reveal true behaviour.",
      ],
      summary: "EDR telemetry shows what happened on a host, static analysis reveals a file's properties without running it, and dynamic analysis reveals behaviour by execution in a sandbox. Combining all three produces reliable indicators and a fast, accurate response.",
      nextSteps: [
        "Practice pulling a file hash and checking it against a reputation source before deeper analysis.",
        "Review an EDR process tree for a sample alert and identify the parent-child chain that looks abnormal.",
      ],
    },
    module: {
      howItWorks: [
        "Lightweight agents on endpoints record process, file, registry, and network events and stream them to a central console.",
        "Analysts query this telemetry to reconstruct what a suspicious file or process did on the host.",
        "Static analysis inspects file properties and code, while dynamic analysis detonates the file in an isolated sandbox to observe live behaviour.",
      ],
      whereYouSeeIt: ["Security operations centres, incident response, threat intelligence teams, and malware research labs."],
      commonProblems: ["EDR agent missing from a critical endpoint", "Packed or obfuscated malware resisting static analysis", "Sandbox evasion by malware that detects virtualisation", "Incomplete indicator extraction that misses secondary payloads"],
      howItFails: [
        "Malware that checks for a sandbox environment behaves benignly during analysis and only activates on a real user's machine.",
        "An EDR agent disabled by the attacker leaves a visibility gap that looks like inactivity rather than compromise.",
        "Analysts stop at the first indicator found and miss a dropped second-stage payload with its own command and control channel.",
      ],
      troubleshooting: [
        "Confirm the EDR agent is running and reporting before concluding a host is clean.",
        "If static analysis is inconclusive due to packing, move to dynamic analysis in an isolated sandbox.",
        "Trace the full process tree and network connections rather than stopping at the first suspicious artifact.",
      ],
      practicalKnowledge: [
        "Always hash a suspicious file before any other action so the original artifact is provable later.",
        "Document every indicator of compromise found, including hashes, domains, file paths, and registry keys, for detection and threat intelligence sharing.",
      ],
      examCoverage: ["Endpoint detection and response fundamentals", "Static versus dynamic malware analysis", "Indicator of compromise identification and use"],
      interviewQuestions: ["How would you determine whether a suspicious file is malicious without running it?", "What indicators would you pull from a malware sample and how would you use them?"],
    },
    recall: [
      ["What is the key difference between static and dynamic malware analysis?", ["without running", "execute", "sandbox", "behaviour"], "Static analysis examines the file without executing it, while dynamic analysis runs it in a sandbox to observe behaviour."],
      ["Why is a clean antivirus scan not sufficient proof a file is safe?", ["evade", "signature", "bypass"], "Malware can evade signature-based detection while still performing malicious actions."],
      ["What should an analyst do before performing any analysis on a suspicious file?", ["hash", "preserve", "original"], "Hash the file first to preserve a provable record of the original artifact."],
    ],
    practice: {
      title: "Pick the right analysis approach",
      prompt: "A suspicious executable is heavily packed and static analysis reveals almost nothing useful about its behaviour. What is the best next step?",
      choices: [
        "Delete the file immediately since packing indicates malware",
        "Detonate the file in an isolated sandbox to observe its behaviour",
        "Rely on the antivirus vendor label alone and close the alert",
        "Rename the file extension and rerun the same static analysis",
      ],
      answerIndex: 1,
      explanation: "When static analysis is inconclusive due to packing or obfuscation, dynamic analysis in an isolated sandbox reveals actual runtime behaviour that static inspection cannot.",
    },
    scenario: {
      title: "The sandbox that saw nothing",
      situation: "A suspicious attachment is detonated in the sandbox and appears completely benign, producing no network activity or file changes. The same attachment later executes on a user's laptop and establishes a command and control connection.",
      decisionPrompt: "Why might the sandbox have missed the malicious behaviour, and what should the analyst do differently?",
      expectedConcepts: ["sandbox evasion", "virtualisation detection", "dynamic analysis", "indicators"],
      guidance: "The malware likely detected the sandbox or virtualised environment and suppressed its behaviour to avoid analysis. Analysts should use sandboxes configured to resemble real endpoints, extend observation time, and combine dynamic results with EDR telemetry from the affected host to confirm actual behaviour.",
    },
  },
];
