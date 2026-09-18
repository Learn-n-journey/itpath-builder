/** CySA+ gap closers: AI-assisted detection tooling, vulnerability scanning and output analysis, attack frameworks and vulnerability reporting. */
import type { TopicSeed } from "./builder";

const CY = "cert-comptia-cysa-plus";

export const cysaGapSeeds: TopicSeed[] = [
  {
    slug: "ai-assisted-threat-detection-and-indicators",
    title: "AI-Assisted Threat Detection and Indicators of Malicious Activity",
    summary: "Tools and telemetry used to spot malicious activity, and how to use AI assistance in security operations responsibly.",
    cert: CY, month: 20, week: 1, difficulty: "demanding", minutes: 45,
    prereqs: ["threat-intelligence-and-hunting"],
    objectives: [
      "Identify indicators of malicious activity across network, endpoint and application telemetry.",
      "Select the right tool for a given detection question.",
      "Apply AI assistance to security operations while validating its output.",
    ],
    lesson: {
      title: "Finding the signal in a flood of telemetry",
      body: "An analyst rarely lacks data; the challenge is turning packet captures, logs and alerts into a confident statement that something malicious happened. Tooling narrows the search, and AI assistance can speed that narrowing, but a human still has to confirm the finding.",
      definition: "Indicators of malicious activity include unusual account behaviour, unexpected outbound connections, abnormal process trees, unauthorised scheduled tasks and unexplained resource consumption. Tools that surface these include packet analysers, endpoint detection and response agents, SIEM correlation rules, and generative or predictive AI models that summarise logs or flag anomalies for review.",
      whyItMatters: "The exam and the job both test whether you can match a symptom to the tool that will actually confirm it, and whether you treat an AI-generated suggestion as a lead rather than a verdict.",
      keyTerms: [
        ["Indicator of compromise", "Observable evidence that a system may be compromised, such as a known bad hash."],
        ["Indicator of attack", "Behaviour suggesting an attack is under way, such as credential dumping activity."],
        ["Anomaly detection", "Flagging activity that deviates from an established baseline."],
        ["Generative AI assistant", "A model that drafts summaries, queries or explanations from prompts and data."],
        ["Model hallucination", "A confident but incorrect output produced by an AI model."],
        ["Human in the loop", "A required human review step before an AI-assisted finding is acted on."],
      ],
      examples: [
        "An AI assistant summarises a week of authentication logs and highlights a login pattern for a terminated account, which the analyst then verifies against HR records.",
        "A packet analyser shows beaconing to a rare external address at a fixed interval, a classic indicator of command and control.",
      ],
      misconceptions: [
        "An AI summary of logs is a starting point, not a confirmed finding; it can miss context or invent detail.",
        "A single indicator rarely proves compromise on its own; correlation across sources is what builds confidence.",
      ],
      summary: "Match the indicator to the right tool, use AI assistance to speed up triage, and always close the loop with human validation before acting.",
      nextSteps: [
        "List the tools available in your own environment and the indicator each one is best placed to reveal.",
        "Try asking an AI assistant to summarise a log sample and check its output against the raw data.",
      ],
    },
    module: {
      howItWorks: [
        "Telemetry from network, endpoint and application sources is collected and normalised, usually into a SIEM.",
        "Detection rules and baselines flag deviations, which analysts triage using the appropriate tool for that data type.",
        "AI assistants can draft summaries, suggest queries or cluster similar alerts, but the analyst confirms before escalation.",
      ],
      whereYouSeeIt: [
        "Security operations centre triage queues.",
        "Threat hunting exercises that start from a hypothesis rather than an alert.",
        "Reviews of AI-assisted tooling procurement and its data handling.",
      ],
      commonProblems: ["Alert fatigue from noisy rules", "Treating AI output as verified fact", "Wrong tool used for the data type", "No baseline to compare against", "Sensitive data sent to an external AI service without review"],
      howItFails: [
        "An analyst escalates an AI-drafted summary that misstates a timestamp, sending the response team down the wrong path.",
        "A genuine beacon is missed because the analyst only checked host logs and never looked at network flow.",
        "Log data containing customer information is pasted into a public AI tool outside policy.",
      ],
      troubleshooting: [
        "Cross check any AI-generated summary against the underlying raw data before acting.",
        "Confirm which data sources cover which stage of the attack before ruling something out.",
        "Check organisational policy on what data may be shared with AI tools.",
      ],
      practicalKnowledge: [
        "Keep a short reference of which tool answers which question: packet capture for network behaviour, EDR for process activity, SIEM for correlation across sources.",
        "Treat AI assistance as a force multiplier for triage speed, never as the final authority on a finding.",
      ],
      examCoverage: ["Indicators of malicious activity", "Detection and analysis tools", "Responsible use of AI in security operations", "Human validation of automated findings"],
      interviewQuestions: ["What is the difference between an indicator of compromise and an indicator of attack?", "How would you validate an AI-generated log summary before escalating it?"],
    },
    recall: [
      ["What must always follow an AI-generated security finding before action is taken?", ["human", "validation", "verify", "confirm"], "A human review step to confirm the finding against raw data before it is acted on."],
      ["What is beaconing an indicator of?", ["command and control", "c2", "outbound"], "Regular outbound connections to an external address, a classic sign of command and control activity."],
    ],
    practice: {
      title: "Choose the right tool",
      prompt: "An analyst needs to confirm whether a workstation process spawned an unexpected child process. Which tool is best suited?",
      choices: ["Endpoint detection and response agent", "Packet capture analyser", "Vulnerability scanner", "Email gateway log"],
      answerIndex: 0,
      explanation: "EDR tracks process trees and parent-child relationships on the endpoint, which is exactly what is needed here. The other tools cover different data.",
    },
    scenario: {
      title: "The helpful summary",
      situation: "An AI assistant integrated into the SIEM produces a summary claiming a server was accessed from an unusual country at 3 a.m., recommending immediate isolation.",
      decisionPrompt: "Explain the steps you would take before acting on the recommendation.",
      expectedConcepts: ["verify", "raw logs", "correlate", "confirm", "human review"],
      guidance: "Pull the raw authentication and network logs to confirm the timestamp, source and account, correlate with other data sources, and only isolate once the finding is verified rather than acting on the summary alone.",
    },
  },
  {
    slug: "vulnerability-scanning-methods-and-output-analysis",
    title: "Vulnerability Scanning Methods and Output Analysis",
    summary: "Credentialed versus uncredentialed and agent versus network scanning, CVSS scoring, and separating real findings from false positives.",
    cert: CY, month: 20, week: 3, difficulty: "demanding", minutes: 45,
    prereqs: ["vulnerability-management"],
    objectives: [
      "Compare credentialed, uncredentialed, agent based and network based scanning.",
      "Interpret a CVSS score and its component metrics.",
      "Validate scanner findings and identify likely false positives.",
    ],
    lesson: {
      title: "A scan is a claim, not a fact",
      body: "A vulnerability scanner produces a list of suspected weaknesses based on what it could see and how it looked. Reading that output well means understanding the scanning method used and treating every finding as something to validate, not something to trust blindly.",
      definition: "Credentialed scanning logs into the target to inspect configuration and installed software directly, giving fewer false positives and deeper coverage. Uncredentialed scanning probes from outside like an attacker would, seeing less but requiring no access. Agent based scanning runs a small local process that reports continuously, while network based scanning sweeps hosts from a central point on a schedule. CVSS scores severity using metrics such as attack vector, complexity, privileges required and impact, producing a number that guides but does not replace judgement.",
      whyItMatters: "Choosing the wrong scanning method misses real weaknesses or floods the team with noise, and misreading CVSS leads to the wrong things being fixed first.",
      keyTerms: [
        ["Credentialed scan", "A scan that authenticates to the target for deeper visibility."],
        ["Uncredentialed scan", "A scan that probes from outside without authentication."],
        ["Agent based scanning", "A lightweight local agent that reports vulnerability data continuously."],
        ["CVSS base score", "A numeric severity rating derived from exploitability and impact metrics."],
        ["False positive", "A reported finding that does not actually exist on validation."],
        ["Scan validation", "Manually or programmatically confirming a finding before remediation."],
      ],
      examples: [
        "A credentialed scan finds an outdated library installed on a server that an uncredentialed scan could never see because it is not exposed on the network.",
        "A finding rated critical by CVSS score turns out, on validation, to require local physical access, which changes its real world priority.",
      ],
      misconceptions: [
        "A high CVSS score does not automatically mean urgent action; environmental factors such as exposure and compensating controls matter too.",
        "An uncredentialed scan is not a full assessment; it only shows what an outsider could see, not everything present.",
      ],
      summary: "Pick the scanning method that matches the question being asked, read CVSS as one input among several, and validate before you remediate or report.",
      nextSteps: [
        "Compare a credentialed and uncredentialed scan result for the same host if you have access to one.",
        "Practise reading the metric breakdown behind a CVSS score, not just the final number.",
      ],
    },
    module: {
      howItWorks: [
        "Scan scope and method are chosen based on what access is available and what question needs answering.",
        "The scanner compares discovered software and configuration against a vulnerability database.",
        "Findings are scored with CVSS and then triaged against exposure, exploitability and compensating controls before remediation is prioritised.",
      ],
      whereYouSeeIt: [
        "Recurring vulnerability management cycles.",
        "Compliance assessments requiring authenticated scanning.",
        "Prioritisation meetings where CVSS scores are debated against business context.",
      ],
      commonProblems: ["Scanning without credentials when depth is needed", "Treating CVSS as the only prioritisation factor", "No process to confirm findings before remediation tickets are raised", "Agents not deployed to all endpoints", "Scan results not deduplicated across tools"],
      howItFails: [
        "An uncredentialed scan reports a system as clean when a credentialed scan would have found an outdated internal service.",
        "A low exploitability finding with high impact is deprioritised purely because its overall score looks moderate.",
        "Remediation effort is spent chasing a finding that validation would have shown was a false positive.",
      ],
      troubleshooting: [
        "Check whether the scan that produced a result was credentialed before trusting its depth.",
        "Break a CVSS score into its component metrics before deciding priority.",
        "Reproduce or manually verify a sample of findings before bulk remediation.",
      ],
      practicalKnowledge: [
        "Use credentialed scanning for internal assets and combine it with uncredentialed scanning for an outside view.",
        "Adjust CVSS with environmental context: exposure, data sensitivity and existing compensating controls.",
        "Keep a validation step in the workflow so false positives do not consume remediation time.",
      ],
      examCoverage: ["Scanning methods", "CVSS metrics and scoring", "False positive identification", "Scan output analysis"],
      interviewQuestions: ["When would you prefer agent based scanning over network based scanning?", "How do you decide priority when two findings share the same CVSS score?"],
    },
    recall: [
      ["What does a credentialed scan do that an uncredentialed scan cannot?", ["authenticate", "log in", "deeper visibility"], "It authenticates to the target, giving deeper visibility into installed software and configuration."],
      ["What should happen to a scanner finding before remediation begins?", ["validate", "confirm", "verify"], "It should be validated to rule out a false positive before effort is spent fixing it."],
    ],
    practice: {
      title: "Read the scan output",
      prompt: "A network based uncredentialed scan reports no vulnerabilities on an internal server, while a credentialed scan of the same server finds several outdated packages. Which statement is accurate?",
      choices: [
        "The uncredentialed scan simply could not see what it lacked access to inspect",
        "The credentialed scan produced false positives",
        "The server has no real vulnerabilities",
        "CVSS scoring is unreliable for this host",
      ],
      answerIndex: 0,
      explanation: "Uncredentialed scanning only sees what is exposed externally, so it commonly misses internal configuration issues that a credentialed scan can inspect directly.",
    },
    scenario: {
      title: "The critical that was not",
      situation: "A scan reports a critical CVSS score for a finding on a server. On review, the vulnerable service is only reachable from a tightly controlled internal segment with no direct network path from untrusted networks.",
      decisionPrompt: "Explain how you would prioritise this finding and what you would document.",
      expectedConcepts: ["environmental", "exposure", "compensating control", "validate", "priority"],
      guidance: "Validate the finding is real, then adjust priority using environmental context such as restricted exposure and existing compensating controls, documenting the reasoning rather than reflexively treating the base score as final.",
    },
  },
  {
    slug: "attack-frameworks-and-vulnerability-reporting",
    title: "Attack Frameworks, Vulnerability Management and Incident Reporting",
    summary: "MITRE ATT&CK, the Cyber Kill Chain and the Diamond Model, plus communicating vulnerability and incident findings to technical and business audiences.",
    cert: CY, month: 21, week: 1, difficulty: "demanding", minutes: 45,
    prereqs: ["vulnerability-scanning-methods-and-output-analysis"],
    objectives: [
      "Compare MITRE ATT&CK, the Cyber Kill Chain and the Diamond Model.",
      "Apply a framework to describe an observed attack.",
      "Communicate vulnerability and incident findings appropriately to technical and business audiences.",
    ],
    lesson: {
      title: "A shared language for describing attacks",
      body: "Frameworks give analysts a common vocabulary for what happened during an attack, which speeds up investigation and makes reports comparable across incidents. The framework only helps if the resulting report is then explained clearly to the audience that needs to act on it.",
      definition: "MITRE ATT&CK catalogues real world adversary tactics and techniques in a matrix, useful for mapping observed behaviour and checking detection coverage. The Cyber Kill Chain describes a linear sequence from reconnaissance through to actions on objectives. The Diamond Model relates the adversary, capability, infrastructure and victim for a single event, useful for pivoting during investigation. Vulnerability management is the ongoing cycle of identifying, prioritising, remediating and verifying weaknesses, and reporting translates technical findings for both engineers who need specifics and executives who need risk and business impact.",
      whyItMatters: "Analysts who cannot describe an attack in a shared framework struggle to hand off investigations, and analysts who cannot translate findings for a non-technical audience struggle to get remediation funded.",
      keyTerms: [
        ["MITRE ATT&CK", "A knowledge base of adversary tactics and techniques organised into a matrix."],
        ["Cyber Kill Chain", "A linear model of attack stages from reconnaissance to actions on objectives."],
        ["Diamond Model", "A model relating adversary, capability, infrastructure and victim for an event."],
        ["Tactics, techniques and procedures", "The behaviours and methods attributed to an adversary or campaign."],
        ["Risk based reporting", "Presenting findings in terms of business impact rather than only technical detail."],
        ["Remediation SLA", "The agreed timeframe within which a finding of a given severity must be fixed."],
      ],
      examples: [
        "An investigation maps observed behaviour to ATT&CK technique identifiers to check whether existing detections would have caught it.",
        "A vulnerability report for executives states the business risk and cost of inaction in a paragraph, with the technical detail in an appendix for engineers.",
      ],
      misconceptions: [
        "The Cyber Kill Chain assumes a linear attack, which does not fit every incident; modern intrusions can loop back to earlier stages.",
        "A technical vulnerability report is not automatically useful to leadership; it needs to be reframed around business risk to drive a decision.",
      ],
      summary: "Use ATT&CK to describe technique, the Kill Chain to describe stage, and the Diamond Model to describe relationships, then report findings twice, once in detail and once in terms the business audience can act on.",
      nextSteps: [
        "Map a recent alert or incident you know about to at least three ATT&CK techniques.",
        "Rewrite a technical vulnerability finding as a two sentence business risk statement.",
      ],
    },
    module: {
      howItWorks: [
        "Observed behaviour during an incident is mapped against a framework to identify technique, stage or relationships.",
        "Vulnerability management runs continuously: identify, prioritise by risk, remediate, and verify the fix.",
        "Reports are tailored, with technical detail for the team doing the work and a risk summary for decision makers.",
      ],
      whereYouSeeIt: [
        "Incident post mortems and threat intelligence reports.",
        "Detection coverage reviews mapped against ATT&CK.",
        "Board and management reporting on security posture.",
      ],
      commonProblems: ["Frameworks used inconsistently across a team", "Reports written for the wrong audience", "Vulnerability findings closed without verification", "No mapping between detections and known technique coverage", "Business impact omitted from executive summaries"],
      howItFails: [
        "Two analysts describe the same incident differently because they are not using a shared framework, slowing handoff.",
        "A remediation is marked complete without verifying the fix actually removed the vulnerability.",
        "An executive report full of technical jargon is skimmed and the funding request is declined.",
      ],
      troubleshooting: [
        "Ask which framework the team has standardised on before writing up an incident.",
        "Check whether a closed vulnerability finding has a verification step recorded.",
        "Read a report aloud and ask whether a non-technical reader would know what decision is being asked of them.",
      ],
      practicalKnowledge: [
        "Keep an ATT&CK mapping of your detection rules so gaps in coverage are visible.",
        "Write the risk statement before the technical detail, then let the detail support it.",
        "Always close the vulnerability management loop with a verification step.",
      ],
      examCoverage: ["MITRE ATT&CK, Cyber Kill Chain and Diamond Model", "Vulnerability management lifecycle", "Incident and vulnerability reporting for technical and business audiences"],
      interviewQuestions: ["How would you use the Diamond Model to pivot from one indicator to related infrastructure?", "How do you adjust a technical finding for a non-technical stakeholder?"],
    },
    recall: [
      ["Which framework relates adversary, capability, infrastructure and victim?", ["diamond model"], "The Diamond Model, useful for pivoting to related indicators during investigation."],
      ["What must happen after a vulnerability is remediated?", ["verify", "verification", "confirm fix"], "Verification, to confirm the fix actually removed the vulnerability rather than assuming it did."],
    ],
    practice: {
      title: "Match the framework",
      prompt: "An analyst wants to check whether existing detection rules would catch a specific adversary technique such as credential dumping. Which resource fits best?",
      choices: ["MITRE ATT&CK", "The Cyber Kill Chain", "The Diamond Model", "A CVSS scoring rubric"],
      answerIndex: 0,
      explanation: "ATT&CK catalogues specific techniques, making it the right tool for checking coverage against a named technique. The other options describe stages or relationships, not detection coverage.",
    },
    scenario: {
      title: "Two reports, one incident",
      situation: "An incident is contained after credential theft led to lateral movement. Leadership wants a briefing and the engineering team wants the full technical timeline.",
      decisionPrompt: "Explain how you would structure the two reports differently.",
      expectedConcepts: ["business risk", "technical detail", "framework", "timeline", "remediation"],
      guidance: "For leadership, lead with business impact, what was affected, what it cost and what is being done, in plain language. For engineering, provide the technical timeline mapped to a framework such as ATT&CK, indicators, and the remediation and verification steps.",
    },
  },
];
