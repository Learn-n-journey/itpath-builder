/** SecurityX CAS-005 gap closers: risk and compliance strategy, threat modelling, secure SDLC and access design, complex troubleshooting and legacy systems, automation and monitoring analysis with emerging technology risk. */
import type { TopicSeed } from "./builder";

const SX = "cert-comptia-securityx";

export const securityxGapSeeds: TopicSeed[] = [
  {
    slug: "risk-analysis-compliance-and-threat-modelling",
    title: "Risk Analysis, Compliance-Driven Strategy and Threat Modelling",
    summary: "Quantitative and qualitative risk analysis, how regulatory and contractual compliance shapes security strategy, and structured threat modelling.",
    cert: SX, month: 23, week: 1, difficulty: "challenging", minutes: 55,
    prereqs: ["enterprise-risk-and-security-program"],
    objectives: [
      "Perform and interpret quantitative risk calculations such as ALE.",
      "Explain how compliance obligations constrain and direct security strategy.",
      "Apply a structured threat modelling method to a system design.",
    ],
    lesson: {
      title: "Turning uncertainty into a decision",
      body: "Senior security work is judged on whether risk decisions can be defended with numbers and a method, not just instinct. This lesson connects risk analysis, compliance and threat modelling into one strategic discipline.",
      definition: "Quantitative risk analysis expresses exposure in money, using single loss expectancy multiplied by annualised rate of occurrence to give annualised loss expectancy, which is then weighed against the cost of a control. Qualitative analysis ranks risk by likelihood and impact where hard numbers are not available. Compliance requirements from regulation, contract or industry framework set a floor beneath which strategy cannot go, and often dictate specific controls, evidence and timelines. Threat modelling, using a method such as STRIDE, walks a system diagram to identify spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege for each component and data flow.",
      whyItMatters: "A strategy built only on compliance checklists misses risks the framework never anticipated, and a strategy built only on technical judgement fails an audit. Combining both is what CAS-005 expects of a security architect.",
      keyTerms: [
        ["Annualised loss expectancy", "Single loss expectancy multiplied by annualised rate of occurrence, giving expected yearly loss."],
        ["Risk appetite", "The amount of risk an organisation is willing to accept in pursuit of its objectives."],
        ["Compliance framework", "A named set of mandatory requirements such as a regulation or standard the organisation must meet."],
        ["STRIDE", "A threat modelling mnemonic covering spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege."],
        ["Data flow diagram", "A diagram of components and the data moving between them, used as the basis for threat modelling."],
        ["Risk register", "The recorded list of identified risks, their analysis and their treatment."],
      ],
      examples: [
        "A control costing more per year than the ALE it would prevent is a poor investment unless a regulator mandates it regardless.",
        "Walking a payment flow diagram with STRIDE surfaces a tampering risk on a step nobody had previously reviewed.",
      ],
      misconceptions: [
        "Being compliant is not the same as being secure; a framework sets a minimum, not a ceiling.",
        "Threat modelling is not a one-off diagram exercise; it is repeated as the design changes.",
      ],
      summary: "Quantify what can be quantified, respect the floor compliance sets, and walk every design with a structured method before it is built.",
      nextSteps: [
        "Calculate ALE for one asset in your own environment using a plausible SLE and ARO.",
        "Run a STRIDE pass over a data flow diagram for a system you know.",
      ],
    },
    module: {
      howItWorks: [
        "Risk analysis produces a ranked or costed view of exposures that strategy then prioritises against.",
        "Compliance requirements are mapped onto the risk register so mandatory items are never treated as optional.",
        "Threat modelling is repeated at each significant design change, not only at project start.",
      ],
      whereYouSeeIt: [
        "Enterprise risk registers reviewed by governance boards.",
        "Audit and regulatory assessment cycles.",
        "Architecture review boards evaluating new system designs.",
      ],
      commonProblems: ["Risk decisions made without any quantification", "Compliance treated as the entire security programme", "Threat models produced once and never revisited", "Risk appetite never formally agreed", "Controls chosen before the threat model exists"],
      howItFails: [
        "A control is purchased because a competitor has it, with no analysis of the risk it addresses.",
        "A system passes its compliance audit yet is compromised through a path the framework never covered.",
        "A redesigned data flow ships without a new threat model, reintroducing a risk that was previously mitigated.",
      ],
      troubleshooting: [
        "Ask what risk a proposed control is meant to reduce and by how much.",
        "Check whether a compliance requirement has been treated as a ceiling rather than a floor.",
        "Confirm the threat model matches the current architecture, not an earlier version.",
      ],
      practicalKnowledge: [
        "Keep ALE calculations simple and defensible rather than falsely precise.",
        "Tie every mandatory compliance control to a named owner and evidence source.",
        "Re-run threat modelling whenever a data flow or trust boundary changes.",
      ],
      examCoverage: ["Quantitative and qualitative risk analysis", "Compliance-driven security strategy", "Threat modelling methods", "Risk appetite and treatment"],
      interviewQuestions: ["How would you justify a security investment in financial terms?", "Walk through how you would threat model a new service before launch."],
    },
    recall: [
      ["What three figures combine to give annualised loss expectancy?", ["asset value", "exposure factor", "single loss expectancy", "annualised rate of occurrence"], "Single loss expectancy, which itself derives from asset value and exposure factor, multiplied by the annualised rate of occurrence."],
      ["What does STRIDE stand for in threat modelling?", ["spoofing", "tampering", "repudiation", "information disclosure", "denial of service", "elevation of privilege"], "Spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege."],
    ],
    practice: {
      title: "Weigh the control",
      prompt: "A control costs more each year than the annualised loss expectancy of the risk it addresses, and no regulation mandates it. What is the most defensible action?",
      choices: ["Decline or defer the control unless the risk appetite says otherwise", "Implement it immediately regardless of cost", "Ignore the calculation and follow instinct", "Delegate the decision to the vendor selling the control"],
      answerIndex: 0,
      explanation: "When cost exceeds expected loss and there is no mandatory driver, the analysis supports declining or deferring the control, subject to the organisation's documented risk appetite.",
    },
    scenario: {
      title: "The audit that passed anyway",
      situation: "A system recently passed its compliance audit with no findings. Weeks later it is compromised through a data flow the compliance framework never addressed.",
      decisionPrompt: "Explain what the organisation should have done differently and what you would do now.",
      expectedConcepts: ["compliance floor", "threat model", "STRIDE", "risk register", "review"],
      guidance: "Recognise compliance as a floor, not full assurance. Run a proper threat model over the actual data flows, add the newly identified risk to the register with treatment, and repeat modelling whenever the design changes.",
    },
  },
  {
    slug: "secure-sdlc-and-access-design",
    title: "Security in the SDLC and Designing Access, Authentication and Authorisation",
    summary: "Embedding security through every phase of the development lifecycle and designing identity, authentication and authorisation for enterprise systems.",
    cert: SX, month: 23, week: 3, difficulty: "challenging", minutes: 55,
    prereqs: ["secure-software-supply-chain-and-devsecops"],
    objectives: [
      "Place security activities correctly across each SDLC phase.",
      "Design an authentication approach appropriate to the risk of the system.",
      "Design an authorisation model that enforces least privilege at scale.",
    ],
    lesson: {
      title: "Building it in, not bolting it on",
      body: "Security added after release is expensive and incomplete. The SDLC gives every phase a security task, and identity design decides who can do what before a single line of enforcement code is written.",
      definition: "The secure SDLC places threat modelling and secure requirements at design, static and dependency analysis at build, dynamic and penetration testing before release, and monitoring plus patching after release. Authentication design chooses factors, protocols such as SAML or OIDC, and step-up requirements based on the sensitivity of the action. Authorisation design chooses a model such as role-based, attribute-based or policy-based access control and defines how privilege is granted, reviewed and revoked.",
      whyItMatters: "A flaw found at design costs a conversation; the same flaw found in production costs an incident. Identity design is the same trade: it is far cheaper to define who should have access before the system is built than to unpick excessive privilege afterwards.",
      keyTerms: [
        ["Secure requirements", "Security expectations captured alongside functional requirements before design begins."],
        ["Static analysis", "Automated review of source code for known weak patterns without running it."],
        ["Attribute-based access control", "Authorisation decided by evaluating attributes of the user, resource and context against policy."],
        ["Step-up authentication", "Requiring a stronger authentication factor before a higher risk action."],
        ["Federation", "Trusting another party's authentication so users do not hold separate credentials per system."],
        ["Privilege review", "Periodic confirmation that granted access still matches genuine need."],
      ],
      examples: [
        "A design review adds a threat model step before any code is written, catching a missing authorisation check early.",
        "A high value transaction requires step-up multi-factor authentication even though the user is already logged in.",
      ],
      misconceptions: [
        "Security testing at the end of a project is not the same as a secure SDLC; the earlier phases cannot be skipped.",
        "Role-based access control is not automatically sufficient in a large, dynamic environment; attribute or policy based models cope better with context.",
      ],
      summary: "Put a security task in every SDLC phase, and design authentication and authorisation deliberately rather than defaulting to whatever the platform ships with.",
      nextSteps: [
        "Map the security activities your own team performs onto each SDLC phase and find the gap.",
        "Pick one system and describe what step-up authentication would suit its highest risk action.",
      ],
    },
    module: {
      howItWorks: [
        "Requirements and design phases produce secure requirements and a threat model before code exists.",
        "Build and test phases run static analysis, dependency checks and dynamic testing before release.",
        "Authentication protocols establish identity, then an authorisation engine evaluates policy for each request.",
      ],
      whereYouSeeIt: [
        "Continuous integration pipelines with embedded security gates.",
        "Single sign-on and federation across enterprise applications.",
        "Access review campaigns and privileged access management systems.",
      ],
      commonProblems: ["Security testing only at the end of the pipeline", "Authorisation logic scattered across many services", "Excess privilege never reviewed", "Authentication strength fixed regardless of action sensitivity", "No revocation process when roles change"],
      howItFails: [
        "A vulnerability reaches production because static analysis was disabled to meet a deadline.",
        "A user retains administrative access from a previous role because no review ever ran.",
        "Every action requires the same weak authentication, so a low risk login compromise reaches high risk functions.",
      ],
      troubleshooting: [
        "Trace which SDLC phase a released vulnerability should have been caught in.",
        "Check whether authorisation decisions are centralised or duplicated inconsistently across services.",
        "Confirm privilege reviews actually run on schedule and produce revocations.",
      ],
      practicalKnowledge: [
        "Fail a pipeline on a security gate rather than merely warning.",
        "Centralise authorisation policy so it is consistent and auditable.",
        "Tie authentication strength to the sensitivity of the action, not just to login.",
      ],
      examCoverage: ["Secure SDLC phases", "Authentication protocols and step-up", "Authorisation models", "Privilege management and review"],
      interviewQuestions: ["Where in the SDLC would you place threat modelling and why?", "How would you design authorisation for a system with thousands of resources and users?"],
    },
    recall: [
      ["At which SDLC phase should threat modelling and secure requirements be produced?", ["design", "requirements"], "Early, at requirements and design, before code is written."],
      ["What decides an authorisation outcome in attribute-based access control?", ["attributes", "policy", "context"], "Attributes of the user, resource and context evaluated against policy, rather than a fixed role alone."],
    ],
    practice: {
      title: "Choose the model",
      prompt: "An enterprise needs access decisions that consider the user's department, the resource's classification and the time of the request. Which authorisation model fits best?",
      choices: ["Attribute-based access control", "Discretionary access control set by each file owner", "A single shared administrator account", "Role-based access control using only job title"],
      answerIndex: 0,
      explanation: "Attribute-based access control evaluates multiple contextual attributes, matching the requirement. A fixed role alone or an owner's discretion cannot express classification and time context, and a shared account defeats accountability entirely.",
    },
    scenario: {
      title: "The gate that was skipped",
      situation: "A release deadline led a team to disable the static analysis gate in the pipeline. A vulnerability that the gate would have caught reaches production and is later exploited.",
      decisionPrompt: "Explain what should have happened at each stage and how you would prevent a repeat.",
      expectedConcepts: ["SDLC phase", "gate", "static analysis", "risk acceptance", "governance"],
      guidance: "The gate exists precisely for this class of flaw; disabling it should require a documented, approved risk acceptance rather than silent bypass. Reinstate the gate, require sign-off for any future exception, and review the incident against each SDLC phase to see where else the process broke down.",
    },
  },
  {
    slug: "complex-troubleshooting-legacy-and-specialised-systems",
    title: "Troubleshooting Complex Security Issues in Legacy and Specialised Systems",
    summary: "Working through layered identity, network and hardware security problems, and securing specialised, embedded and legacy systems that cannot be treated like standard endpoints.",
    cert: SX, month: 24, week: 1, difficulty: "challenging", minutes: 55,
    prereqs: ["cryptography-and-key-management-at-scale"],
    objectives: [
      "Work through a layered identity, network or hardware security issue methodically.",
      "Identify constraints that make legacy and specialised systems harder to secure.",
      "Choose compensating approaches suited to systems that cannot be patched or replaced.",
    ],
    lesson: {
      title: "When the usual fix is not available",
      body: "Senior troubleshooting is rarely one obvious fault. It is several plausible causes across identity, network and hardware layers, on a system that may be too old or too specialised to change directly.",
      definition: "Complex identity issues include federation trust failures, clock skew breaking token validity, and conflicting policy across identity providers. Complex network issues include asymmetric routing, certificate pinning mismatches and segmentation that blocks a required but undocumented flow. Complex hardware issues include firmware level compromise, side channel exposure and trusted platform components misconfigured or unsupported. Specialised and legacy systems include industrial control systems, embedded devices, SCADA, and unsupported operating systems that cannot take standard patches or agents.",
      whyItMatters: "These are exactly the systems where the safe fix is not available, so a security architect has to reason from first principles and apply compensating controls rather than reaching for a patch that does not exist.",
      keyTerms: [
        ["Clock skew", "A time difference between systems large enough to break time-based token or certificate validation."],
        ["Segmentation gap", "A missing or overly permissive network boundary rule discovered only when something breaks."],
        ["Firmware compromise", "Malicious modification below the operating system, surviving reinstalls."],
        ["Industrial control system", "Operational technology controlling physical processes, often with long lifecycles and limited patchability."],
        ["Air gap", "Physical isolation of a network from other networks, including the internet."],
        ["Compensating architecture", "A design, such as isolation and monitoring, that manages risk on a system that cannot be directly hardened."],
      ],
      examples: [
        "A federated login intermittently fails because one identity provider's clock has drifted, invalidating tokens before their intended expiry.",
        "A legacy SCADA controller cannot run an agent, so it is placed on an isolated segment with a monitored one-way data diode out.",
      ],
      misconceptions: [
        "Not every access failure is a permissions problem; clock skew and certificate trust issues produce identical symptoms.",
        "Legacy systems are not made safe simply by adding a firewall rule; the whole architecture around them needs review.",
      ],
      summary: "Separate identity, network and hardware layers when troubleshooting, and treat legacy and specialised systems as a design problem requiring isolation and monitoring rather than a patching problem.",
      nextSteps: [
        "List any legacy or specialised systems in your environment and how each is currently isolated.",
        "Practice a layered troubleshooting approach on a real or simulated identity failure.",
      ],
    },
    module: {
      howItWorks: [
        "Layered troubleshooting isolates whether the fault sits in identity, network or hardware before attempting a fix.",
        "Legacy and specialised systems are managed through isolation, strict access control and monitoring rather than direct hardening.",
        "Compensating architecture documents why the primary control cannot apply and what stands in for it.",
      ],
      whereYouSeeIt: [
        "Operational technology and industrial environments.",
        "Federated single sign-on across partner organisations.",
        "Environments still running unsupported operating systems for a specific application.",
      ],
      commonProblems: ["Clock synchronisation ignored as a cause", "Segmentation rules undocumented", "Firmware never verified after physical access", "Legacy systems connected directly to general networks", "No monitoring on isolated segments"],
      howItFails: [
        "An intermittent authentication failure is repeatedly treated as a password problem when the real cause is time drift.",
        "A segmentation rule blocking a required flow is removed entirely rather than corrected precisely, reopening broader access.",
        "A legacy control system is bridged onto the general network for convenience, removing its only real protection.",
      ],
      troubleshooting: [
        "Check time synchronisation before investigating identity or certificate failures further.",
        "Trace the exact path and rule that a blocked flow needs, rather than opening broad access.",
        "Verify firmware integrity after any physical access to hardware that handles sensitive functions.",
      ],
      practicalKnowledge: [
        "Keep a documented map of every legacy or specialised system and its compensating controls.",
        "Prefer narrow, specific rule changes over broad exceptions when resolving a segmentation problem.",
        "Monitor isolated segments actively rather than assuming isolation alone is sufficient.",
      ],
      examCoverage: ["Layered identity, network and hardware troubleshooting", "Legacy and specialised system risk", "Industrial control and embedded system security", "Compensating architecture"],
      interviewQuestions: ["How would you approach an intermittent authentication failure with no obvious cause?", "How would you secure a system that cannot be patched or replaced?"],
    },
    recall: [
      ["What commonly causes token or certificate validation to fail intermittently across systems?", ["clock skew", "time drift"], "Clock skew between systems, which breaks time-based validity checks even when credentials are correct."],
      ["What is the usual approach to securing a legacy system that cannot be patched?", ["isolation", "segmentation", "monitoring", "compensating control"], "Isolate it, restrict access tightly, monitor it closely, and document the arrangement as a compensating control."],
    ],
    practice: {
      title: "Diagnose the pattern",
      prompt: "Users across a federated partnership intermittently fail authentication with valid credentials, and the failures correlate with certain hours of the day. What should be checked first?",
      choices: ["Time synchronisation and clock skew between the identity providers", "Whether users have forgotten their passwords", "The colour scheme of the login page", "Whether the marketing website is online"],
      answerIndex: 0,
      explanation: "Intermittent failures tied to time of day, with valid credentials, strongly suggest clock skew affecting token or certificate validity rather than a credential or unrelated issue.",
    },
    scenario: {
      title: "The controller that could not be patched",
      situation: "An industrial control system running an unsupported operating system cannot take a critical patch without breaking certified functionality, and it currently shares a network with general office systems.",
      decisionPrompt: "Explain how you would reduce the risk without breaking the controller.",
      expectedConcepts: ["segment", "isolate", "monitor", "compensating control", "access restriction"],
      guidance: "Move the controller onto its own isolated segment away from general office traffic, restrict access tightly to only what the process requires, add monitoring for anomalous activity, and record the arrangement as a documented compensating control with a review date.",
    },
  },
  {
    slug: "automation-monitoring-and-emerging-technology-risk",
    title: "Automation to Secure the Enterprise, Monitoring Analysis and Emerging Technology Risk",
    summary: "Using automation and orchestration to secure the enterprise, analysing data and artefacts for monitoring and incident response, and managing risk from emerging technology such as AI.",
    cert: SX, month: 24, week: 3, difficulty: "challenging", minutes: 55,
    prereqs: ["advanced-incident-response-and-forensics"],
    objectives: [
      "Explain where automation and orchestration reduce enterprise security risk.",
      "Analyse monitoring data and artefacts to support detection and incident response.",
      "Assess the security risk introduced by emerging technology such as AI.",
    ],
    lesson: {
      title: "Scaling defence and reading the evidence",
      body: "An enterprise cannot rely on manual effort to keep pace with its own scale or with new technology adoption. Automation extends the team's reach, and disciplined analysis of monitoring data is what turns activity into a defensible response.",
      definition: "Automation and orchestration apply to enrichment of alerts, automatic containment actions, provisioning and de-provisioning of access, and continuous compliance checking, typically coordinated through a security orchestration, automation and response platform. Monitoring analysis draws on log correlation, endpoint and network telemetry, and forensic artefacts such as memory captures and file metadata to build a timeline and support attribution. Emerging technology risk covers AI systems specifically: data poisoning, model manipulation, prompt injection against AI-driven tools, and over-reliance on AI output without verification.",
      whyItMatters: "Automation is what allows a security team to keep pace with enterprise scale, and rigorous artefact analysis is what makes an incident response defensible afterwards. Emerging technology like AI introduces new risk categories that established frameworks have not yet fully absorbed, so it has to be reasoned about deliberately.",
      keyTerms: [
        ["Security orchestration, automation and response", "A platform coordinating automated enrichment and response actions across security tools."],
        ["Playbook", "A defined, often automated sequence of response steps for a given alert type."],
        ["Chain of custody", "The documented handling of evidence from collection through analysis, preserving its integrity."],
        ["Data poisoning", "Corrupting training data so a model learns a flawed or exploitable behaviour."],
        ["Prompt injection", "Malicious input crafted to manipulate an AI system into ignoring its intended constraints."],
        ["Model output verification", "Independently checking AI-generated output before acting on it, especially in security decisions."],
      ],
      examples: [
        "An orchestration platform automatically isolates a host and revokes a session the moment a high confidence indicator fires, without waiting for an analyst.",
        "An AI-assisted triage tool is manipulated by crafted log content, so its summaries are checked against raw evidence before any action is taken.",
      ],
      misconceptions: [
        "Automation does not remove the need for human oversight; playbooks need review and exceptions still need a person.",
        "AI output is not inherently trustworthy evidence; it needs the same verification as any other unauthenticated source.",
      ],
      summary: "Automate the repeatable and the urgent, keep evidence handling rigorous enough to support a response, and treat AI systems as a new attack surface rather than an infallible tool.",
      nextSteps: [
        "Identify one manual security task in your environment that a playbook could safely automate.",
        "List what you would independently verify before acting on the output of an AI-driven security tool.",
      ],
    },
    module: {
      howItWorks: [
        "Orchestration platforms trigger playbooks that enrich alerts and execute approved containment actions automatically.",
        "Monitoring analysis correlates logs, telemetry and forensic artefacts into a timeline that supports a defensible response.",
        "AI systems are assessed for training data integrity, input manipulation and the verification of their output before use in security decisions.",
      ],
      whereYouSeeIt: [
        "Security operations centres running orchestration platforms.",
        "Digital forensics and incident response investigations.",
        "Deployments of AI-assisted security and business tools across the enterprise.",
      ],
      commonProblems: ["Automated actions with no human review path", "Evidence handled without a maintained chain of custody", "AI tool output trusted without verification", "No monitoring of the AI system's own inputs and behaviour", "Playbooks never updated as the environment changes"],
      howItFails: [
        "An automated containment action isolates a legitimate critical system because a playbook lacked a safeguard.",
        "A case is weakened because evidence collection was not documented and its integrity cannot be demonstrated.",
        "A crafted input manipulates an AI-assisted tool into producing a misleading summary that goes unchallenged.",
      ],
      troubleshooting: [
        "Review playbook logic for missing exceptions before assuming the automation is simply wrong.",
        "Check whether every step of evidence handling is logged and attributable.",
        "Verify AI-generated conclusions against the underlying raw data before acting further.",
      ],
      practicalKnowledge: [
        "Build a human review step into any playbook capable of disruptive action.",
        "Maintain chain of custody documentation as a routine part of every investigation, not an afterthought.",
        "Treat AI tools used in security workflows as systems requiring their own monitoring and validation.",
      ],
      examCoverage: ["Automation and orchestration for enterprise security", "Monitoring data and artefact analysis", "Incident response timelines and chain of custody", "Emerging technology and AI risk"],
      interviewQuestions: ["What safeguards would you build into an automated containment playbook?", "How would you assess the security risk of adopting an AI-driven tool?"],
    },
    recall: [
      ["What must be preserved when handling forensic evidence through an investigation?", ["chain of custody"], "The chain of custody, showing who handled the evidence and when, so its integrity can be demonstrated."],
      ["What is prompt injection?", ["malicious input", "manipulate AI", "crafted input"], "Malicious input crafted to manipulate an AI system into ignoring its intended constraints or instructions."],
    ],
    practice: {
      title: "Choose the safeguard",
      prompt: "An organisation wants to automate containment of hosts showing high confidence compromise indicators, but is concerned about disrupting critical systems by mistake. What should the playbook include?",
      choices: ["An exception list and human review step for critical systems before automated isolation", "No safeguards, since speed matters more than accuracy", "Manual containment only, with no automation permitted anywhere", "Automatic isolation of every host with no exceptions"],
      answerIndex: 0,
      explanation: "An exception list with a human review step for critical systems preserves the speed benefit of automation while preventing an automated action from disrupting essential services. Removing all automation loses its value, and blanket automatic isolation ignores the stated risk.",
    },
    scenario: {
      title: "The summary that was wrong",
      situation: "An AI-assisted triage tool summarises an incident as low severity based on log content. An analyst later finds the underlying logs show a serious compromise the summary understated.",
      decisionPrompt: "Explain what should have happened before the summary was acted on, and what you would change going forward.",
      expectedConcepts: ["verification", "raw evidence", "prompt injection", "over-reliance", "monitoring"],
      guidance: "AI-generated conclusions should have been checked against the raw evidence before being relied upon, especially for severity decisions. Investigate whether the input was manipulated, adjust the workflow to require verification of AI output on significant findings, and monitor the tool's own inputs and behaviour going forward.",
    },
  },
];
