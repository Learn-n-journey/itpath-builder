/** Cloud+ CV0-004 gap closers: cloud databases and workload optimisation, scaling approaches, DevOps fundamentals, vulnerability and compliance troubleshooting. */
import type { TopicSeed } from "./builder";

const C = "cert-comptia-cloud-plus";

export const cloudGapSeeds: TopicSeed[] = [
  {
    slug: "cloud-database-concepts-and-workload-optimisation",
    title: "Cloud Database Concepts and Workload Optimisation",
    summary: "Managed relational and NoSQL services, read replicas, caching, right sizing and performance tuning.",
    cert: C, month: 18, week: 1, difficulty: "standard", minutes: 50,
    prereqs: ["cloud-storage-backup-and-migration"],
    objectives: [
      "Distinguish managed relational database services from NoSQL services and when each fits.",
      "Explain how read replicas and caching reduce load on a primary database.",
      "Apply right sizing to a database workload based on observed metrics.",
    ],
    lesson: {
      title: "The database is usually the bottleneck",
      body: "Compute and storage scale easily in the cloud, but a poorly tuned database is the most common reason an application still feels slow once everything else has been scaled up.",
      definition: "A managed relational database service, such as a hosted SQL database, handles structured data with fixed schemas and strong consistency, while the provider manages patching, backups and failover. A managed NoSQL service handles flexible or unstructured data at large scale, trading some consistency guarantees for speed and horizontal scale. A read replica is a copy of a database kept in sync with the primary and used to serve read-only queries, taking load off the primary. Caching stores frequently requested results in memory so repeated queries do not hit the database at all. Right sizing means matching the database instance's compute and memory to its actual observed workload rather than guessing.",
      whyItMatters: "Overpaying for an oversized database is common, and so is undersizing one that then throttles the whole application. Reading the real metrics before resizing is what separates a tuned environment from an expensive guess.",
      keyTerms: [
        ["Managed relational database", "A hosted SQL database service where the provider handles operational tasks."],
        ["NoSQL", "A database model for flexible or large scale data, often trading strict consistency for speed."],
        ["Read replica", "A synchronised copy of a database used to offload read queries from the primary."],
        ["Caching layer", "An in-memory store that serves repeated requests without querying the database."],
        ["Right sizing", "Matching resource allocation to actual measured demand."],
        ["Query tuning", "Improving how a query is written or indexed so it runs faster."],
      ],
      examples: [
        "A reporting dashboard is pointed at a read replica so heavy reports do not slow down the live application.",
        "A product catalogue that rarely changes is served from a cache, cutting database load dramatically."],
      misconceptions: [
        "NoSQL is not simply a faster version of a relational database; it is a different model suited to different data shapes.",
        "Adding more compute to a database instance does not fix a badly written query or a missing index.",
      ],
      summary: "Choose the database model that fits the data shape, offload read traffic with replicas and caching, and size instances against real metrics rather than assumption.",
      nextSteps: [
        "Review whether a workload you support would benefit from a read replica.",
        "Check a database instance's actual CPU and memory usage against its provisioned size.",
      ],
    },
    module: {
      howItWorks: [
        "Managed database services replicate data internally for durability and can be configured with additional read replicas for scale.",
        "Caching sits between the application and the database, intercepting repeat requests before they reach the database engine.",
        "Right sizing tools compare provisioned capacity against sustained utilisation and recommend an adjusted instance size.",
      ],
      whereYouSeeIt: [
        "E-commerce and content platforms with heavy read traffic.",
        "Cost optimisation reviews of cloud database spend.",
        "Application performance investigations that trace slowness back to the data layer.",
      ],
      commonProblems: ["Read and write traffic both hitting the primary with no replica", "Oversized database instances with low utilisation", "No caching layer for frequently repeated queries", "Missing indexes causing slow queries even on scaled up hardware", "NoSQL used for data that actually needs strong relational consistency"],
      howItFails: [
        "A reporting job run against the primary database slows down the live application during business hours.",
        "A database instance is left at a size chosen at launch and never revisited despite falling usage.",
        "An application caches data indefinitely and starts serving stale results after an update.",
      ],
      troubleshooting: [
        "Check whether read-heavy workloads are separated onto a replica.",
        "Review utilisation metrics before resizing a database instance in either direction.",
        "Look for missing indexes on slow queries before adding compute.",
        "Check cache expiry settings when users report stale data.",
      ],
      practicalKnowledge: [
        "Separate read and write traffic early rather than waiting for a performance incident.",
        "Revisit database instance sizing on a schedule, not only at initial deployment.",
        "Set sensible cache expiry so freshness and performance are both respected.",
      ],
      examCoverage: ["Managed relational and NoSQL services", "Read replicas", "Caching", "Right sizing", "Query and performance tuning"],
      interviewQuestions: ["When would you choose a NoSQL service over a relational one?", "How would you decide whether a database instance needs resizing?"],
    },
    recall: [
      ["What is the main purpose of a read replica?", ["offload reads", "reduce load on primary", "serve read only queries"], "It serves read-only queries so the primary database is not overloaded by them."],
      ["What should be checked before resizing a database instance?", ["actual usage", "utilisation metrics", "real metrics"], "Actual observed utilisation, so the new size matches real demand rather than a guess."],
    ],
    practice: {
      title: "Fix the slowdown",
      prompt: "A live application slows down every time an analytics job runs large reporting queries against the same database. What is the most direct fix?",
      choices: ["Point the reporting job at a read replica", "Switch the database to a NoSQL service", "Increase the application server's memory", "Disable caching on the application"],
      answerIndex: 0,
      explanation: "Moving the reporting workload to a read replica takes the load off the primary database that serves the live application. Switching database models, changing application memory or disabling caching do not address the root cause.",
    },
    scenario: {
      title: "The oversized instance",
      situation: "A cost review finds a production database instance running at under fifteen percent CPU and memory utilisation for the past three months, provisioned at a size chosen when the application launched.",
      decisionPrompt: "Explain how you would decide on a new size and what you would check before changing it.",
      expectedConcepts: ["right sizing", "utilisation metrics", "peak load", "test", "monitor"],
      guidance: "Review sustained and peak utilisation over a representative period, not just the average, choose a smaller instance size that still covers peak demand with headroom, test the change in a non-production environment if possible, and monitor closely after resizing.",
    },
  },
  {
    slug: "cloud-scaling-approaches",
    title: "Cloud Scaling Approaches",
    summary: "Vertical and horizontal scaling, auto scaling policies, load testing, elasticity and cost impact.",
    cert: C, month: 19, week: 1, difficulty: "standard", minutes: 50,
    prereqs: ["cloud-database-concepts-and-workload-optimisation", "cloud-automation-orchestration-and-cost-management"],
    objectives: [
      "Distinguish vertical scaling from horizontal scaling.",
      "Explain how an auto scaling policy responds to demand.",
      "Describe how load testing validates a scaling design and its cost impact.",
    ],
    lesson: {
      title: "Scaling is a design decision, not a reflex",
      body: "Adding capacity is easy in the cloud, but the right way to add it depends on the application, and getting it wrong either wastes money or leaves the service unable to keep up.",
      definition: "Vertical scaling increases the resources of a single instance, such as more CPU or memory, and has a ceiling set by the largest available instance size. Horizontal scaling adds more instances running the same workload, spreading load across them, and scales further but needs the application to support running multiple instances. Auto scaling policies add or remove instances automatically based on metrics such as CPU usage or request count, within defined minimum and maximum limits. Elasticity is the ability to scale both up and down automatically as demand changes, directly affecting cost since idle capacity is removed when it is not needed. Load testing simulates demand before launch to confirm scaling policies actually respond in time.",
      whyItMatters: "A scaling design that has never been load tested tends to fail exactly when it matters most, during a genuine spike in demand, and an elastic design that never scales down quietly wastes money every month it runs.",
      keyTerms: [
        ["Vertical scaling", "Increasing the resources of a single existing instance."],
        ["Horizontal scaling", "Adding more instances to share a workload."],
        ["Auto scaling policy", "Rules that add or remove instances automatically based on demand metrics."],
        ["Elasticity", "The ability to scale capacity up and down automatically as demand changes."],
        ["Load testing", "Simulating demand to validate that a system and its scaling policies perform as expected."],
        ["Scaling ceiling", "The upper limit vertical scaling hits once the largest instance size is reached."],
      ],
      examples: [
        "A web application behind a load balancer adds instances automatically when request rate rises past a threshold.",
        "A single legacy application that cannot run on multiple instances is scaled vertically until it reaches the largest available size.",
      ],
      misconceptions: [
        "Vertical scaling is not unlimited; every provider has a largest instance size, after which only horizontal scaling helps.",
        "Auto scaling does not remove the need for load testing; policies can still react too slowly or too aggressively without being tested.",
      ],
      summary: "Choose horizontal scaling where the application supports it for the greatest headroom, use vertical scaling where it does not, and always load test an auto scaling policy before relying on it in production.",
      nextSteps: [
        "Check whether an application you support could run across multiple instances.",
        "Review an auto scaling policy's thresholds against real traffic patterns.",
      ],
    },
    module: {
      howItWorks: [
        "Auto scaling monitors a chosen metric continuously and compares it against configured thresholds.",
        "When a threshold is crossed, new instances are launched or removed within the defined minimum and maximum bounds.",
        "Load testing generates synthetic traffic that ramps up to reveal how quickly scaling reacts and where bottlenecks appear.",
      ],
      whereYouSeeIt: [
        "Web application backends handling variable daily or seasonal traffic.",
        "Batch processing workloads that scale out for a job and back down afterwards.",
        "Cost reviews comparing always-on capacity against elastic scaling.",
      ],
      commonProblems: ["Auto scaling thresholds set too high, reacting too late", "No maximum limit set, allowing runaway cost during a traffic spike", "Application not designed to run statelessly across multiple instances", "Scaling policy never load tested before go live", "Scaling down too aggressively, causing performance dips"],
      howItFails: [
        "A sudden spike in traffic overwhelms the application before new instances finish starting.",
        "A missing maximum instance limit lets a runaway process scale out to an enormous and expensive number of instances.",
        "An application storing session data locally breaks when horizontal scaling spreads users across different instances.",
      ],
      troubleshooting: [
        "Check the metric and threshold driving an auto scaling policy against actual traffic behaviour.",
        "Confirm minimum and maximum instance limits are set deliberately.",
        "Verify the application supports statelessness before scaling horizontally.",
        "Load test scaling policies before trusting them with production traffic.",
      ],
      practicalKnowledge: [
        "Combine a small always-on baseline with auto scaling for burst demand.",
        "Set both minimum and maximum bounds on every auto scaling policy.",
        "Re-run load tests after significant application changes.",
      ],
      examCoverage: ["Vertical versus horizontal scaling", "Auto scaling policies", "Elasticity and cost impact", "Load testing"],
      interviewQuestions: ["When would vertical scaling be preferred over horizontal scaling?", "What could cause an auto scaling policy to react too slowly?"],
    },
    recall: [
      ["What is the main limitation of vertical scaling?", ["ceiling", "largest instance size", "upper limit"], "It is limited by the largest instance size available, after which no further vertical scaling is possible."],
      ["What does an auto scaling policy use to decide when to add instances?", ["metrics", "thresholds", "demand metrics"], "Defined metrics such as CPU usage or request count compared against configured thresholds."],
    ],
    practice: {
      title: "Choose the scaling approach",
      prompt: "An application is designed to run identically across many independent instances behind a load balancer, and traffic varies heavily by time of day. Which approach fits best?",
      choices: ["Horizontal auto scaling", "Vertical scaling only", "A single fixed-size instance", "Manual resizing once a week"],
      answerIndex: 0,
      explanation: "Since the application supports running across many instances and traffic is variable, horizontal auto scaling adds and removes instances automatically to match demand. The other options either ignore the variability or cannot scale as far.",
    },
    scenario: {
      title: "The scaling policy that reacted too late",
      situation: "During a promotional event, traffic spikes suddenly. The auto scaling policy does eventually add instances, but users experience slow responses for several minutes before capacity catches up.",
      decisionPrompt: "Explain what you would adjust and how you would validate the fix.",
      expectedConcepts: ["lower threshold", "baseline capacity", "load test", "scale faster", "predictive scaling"],
      guidance: "Lower the scaling threshold so instances launch earlier, consider a higher baseline of always-on capacity ahead of known events, and load test the revised policy against a simulated spike before the next event to confirm it reacts in time.",
    },
  },
  {
    slug: "devops-fundamentals-in-the-cloud",
    title: "DevOps Fundamentals in the Cloud",
    summary: "Source control, branching, CI/CD pipelines, artefacts, systems integration, infrastructure as code in the pipeline and DevOps tooling.",
    cert: C, month: 19, week: 2, difficulty: "standard", minutes: 55,
    prereqs: ["cloud-scaling-approaches"],
    objectives: [
      "Explain source control branching and how it supports collaborative development.",
      "Describe the stages of a CI/CD pipeline and what an artefact is.",
      "Explain how infrastructure as code fits into a deployment pipeline.",
    ],
    lesson: {
      title: "Cloud operations depend on how software actually moves",
      body: "Cloud platforms make infrastructure programmable, and DevOps is the discipline of moving code and infrastructure changes through build, test and release reliably instead of by hand.",
      definition: "Source control tracks every change to code in a shared repository, and branching lets separate lines of work happen without interfering with each other until they are merged. Continuous integration automatically builds and tests code whenever it is committed, and continuous delivery or deployment automatically pushes a tested build towards production. An artefact is the packaged, versioned output of a build, such as a container image, ready to be deployed. Systems integration connects a pipeline to the tools around it, such as ticketing, monitoring and notification systems. Infrastructure as code templates describing servers, networks and configuration are stored in source control and applied automatically as part of the same pipeline that deploys application code.",
      whyItMatters: "A cloud environment without a pipeline still works, but changes become manual, inconsistent and hard to reverse, which is exactly the kind of risk automation through CI/CD and infrastructure as code is meant to remove.",
      keyTerms: [
        ["Branching", "Maintaining separate parallel lines of code changes before merging them."],
        ["Continuous integration", "Automatically building and testing code on every commit."],
        ["Continuous deployment", "Automatically releasing a tested build to production without manual steps."],
        ["Artefact", "A versioned, packaged build output ready for deployment."],
        ["Pipeline", "The automated sequence of build, test and deployment stages."],
        ["Infrastructure as code", "Managing infrastructure through version-controlled, machine-readable templates."],
      ],
      examples: [
        "A developer's feature branch is merged only after automated tests pass in the pipeline.",
        "An infrastructure as code template provisions a new environment identically every time it runs.",
      ],
      misconceptions: [
        "Continuous integration is not the same as continuous deployment; integration is about building and testing, deployment is about releasing.",
        "Infrastructure as code is not just a script run manually once; it is version-controlled and reapplied through the same pipeline as application changes.",
      ],
      summary: "Use branching to isolate work safely, let a pipeline build, test and package artefacts automatically, and manage infrastructure the same way as application code through version-controlled templates.",
      nextSteps: [
        "Check where a pipeline you rely on stores its build artefacts.",
        "Review whether infrastructure changes in your environment go through source control.",
      ],
    },
    module: {
      howItWorks: [
        "A commit to a branch triggers the pipeline, which builds the code, runs automated tests and produces an artefact.",
        "The artefact moves through further stages such as staging deployment before reaching production.",
        "Infrastructure as code templates are validated and applied by the same or a linked pipeline, keeping infrastructure changes reviewable and repeatable.",
      ],
      whereYouSeeIt: [
        "Application release processes for cloud-hosted services.",
        "Environment provisioning for new development, test and production stacks.",
        "Incident response, where a bad release is rolled back to a previous artefact.",
      ],
      commonProblems: ["Long lived branches that are hard to merge", "No automated tests in the pipeline", "Manual infrastructure changes made outside of code", "Artefacts not versioned, making rollback difficult", "Pipeline stages not integrated with monitoring or ticketing"],
      howItFails: [
        "A feature branch left unmerged for months conflicts badly when it finally comes back together.",
        "A manual infrastructure change outside the pipeline is overwritten the next time the template runs.",
        "A bad release cannot be rolled back quickly because there is no clearly versioned previous artefact.",
      ],
      troubleshooting: [
        "Check how long branches have been open and merge frequently to reduce conflict risk.",
        "Confirm infrastructure changes go through the same reviewed pipeline as application code.",
        "Verify artefacts are versioned and previous versions are retained for rollback.",
      ],
      practicalKnowledge: [
        "Keep branches short lived and merge often.",
        "Store infrastructure templates in the same source control as application code.",
        "Retain enough previous artefacts to support a fast rollback.",
      ],
      examCoverage: ["Source control and branching", "CI/CD pipeline stages", "Artefacts", "Systems integration", "Infrastructure as code", "DevOps tooling"],
      interviewQuestions: ["What is the difference between continuous integration and continuous deployment?", "Why should infrastructure changes go through the same pipeline as application code?"],
    },
    recall: [
      ["What is an artefact in a CI/CD pipeline?", ["packaged build output", "versioned build", "deployable package"], "A versioned, packaged build output produced by the pipeline and ready to deploy."],
      ["Why is infrastructure as code kept in source control?", ["version control", "reviewable", "repeatable changes"], "So infrastructure changes are reviewable, repeatable and tracked the same way application code changes are."],
    ],
    practice: {
      title: "Identify the gap",
      prompt: "A team's application code goes through automated build and test on every commit, but infrastructure changes are still made manually through a cloud console. What practice is missing?",
      choices: ["Managing infrastructure as code through the same pipeline", "Adding more automated tests to the application", "Creating additional feature branches", "Increasing the pipeline's build frequency"],
      answerIndex: 0,
      explanation: "The gap is that infrastructure changes bypass version control and the pipeline entirely. More tests, more branches or a faster build frequency do not address unmanaged manual infrastructure changes.",
    },
    scenario: {
      title: "The infrastructure change that vanished",
      situation: "An engineer manually adjusts a firewall setting through the cloud console to fix an urgent issue. Weeks later, the same setting reverts unexpectedly during a routine infrastructure update.",
      decisionPrompt: "Explain why this happened and how you would prevent it recurring.",
      expectedConcepts: ["infrastructure as code", "manual change overwritten", "template", "source control", "review process"],
      guidance: "The manual change was never reflected in the infrastructure as code template, so the next automated run reverted it. Update the template itself with the required setting, keep it in source control, and route future changes through the pipeline rather than the console.",
    },
  },
  {
    slug: "cloud-vulnerability-compliance-and-security-troubleshooting",
    title: "Cloud Vulnerability Management, Compliance and Security Troubleshooting",
    summary: "Scanning cloud assets, shared responsibility, PCI DSS, ISO 27001, data residency requirements and diagnosing permission and policy failures.",
    cert: C, month: 19, week: 3, difficulty: "challenging", minutes: 55,
    prereqs: ["cloud-monitoring-logging-and-troubleshooting", "devops-fundamentals-in-the-cloud"],
    objectives: [
      "Explain how vulnerability scanning applies to cloud assets under the shared responsibility model.",
      "Describe the purpose of PCI DSS, ISO 27001 and data residency requirements in a cloud context.",
      "Apply a structured approach to diagnosing permission and policy failures.",
    ],
    lesson: {
      title: "Compliance and access failures both trace back to who owns what",
      body: "In the cloud, security responsibility is split between the provider and the customer, and most compliance and access problems come from misunderstanding exactly where that split falls.",
      definition: "The shared responsibility model divides security duties: the provider secures the underlying infrastructure, while the customer secures what they configure on top of it, such as identity, data and application settings. Vulnerability scanning of cloud assets checks configurations, exposed services and known software flaws against that customer-owned layer. PCI DSS is a standard for organisations handling payment card data, requiring specific controls around cardholder data protection. ISO 27001 is an international standard for an organisation's overall information security management system. Data residency requirements restrict where data may be physically stored or processed, often to satisfy a jurisdiction's legal rules. Diagnosing a permission or policy failure means checking identity, the specific permission granted, the resource policy attached to the target, and any explicit deny that overrides an allow.",
      whyItMatters: "A cloud breach is frequently a misconfiguration the customer was responsible for, not a flaw in the provider's infrastructure, and a compliance failure is often a data residency or access control gap nobody checked before launch.",
      keyTerms: [
        ["Shared responsibility model", "The division of security duties between cloud provider and customer."],
        ["Vulnerability scanning", "Automated checking of assets for misconfigurations and known flaws."],
        ["PCI DSS", "A standard governing the protection of payment card data."],
        ["ISO 27001", "An international standard for information security management systems."],
        ["Data residency", "A requirement restricting where data may be stored or processed."],
        ["Explicit deny", "A policy rule that blocks access even when another rule would allow it."],
      ],
      examples: [
        "A misconfigured storage bucket left publicly readable is a customer responsibility failure, not a provider one.",
        "An application storing customer data must be deployed in a region matching the customer's data residency requirement.",
      ],
      misconceptions: [
        "Using a cloud provider does not transfer all security responsibility to them; customer-configured resources remain the customer's job.",
        "An allow permission does not override an explicit deny; a deny elsewhere in the policy set still blocks the action.",
      ],
      summary: "Know which side of the shared responsibility line a given control sits on, understand what PCI DSS, ISO 27001 and data residency actually require, and diagnose access failures by checking identity, permission, resource policy and any explicit deny in order.",
      nextSteps: [
        "Check whether a cloud resource you manage has ever been vulnerability scanned.",
        "Confirm where the data for a system you support is legally required to reside.",
      ],
    },
    module: {
      howItWorks: [
        "Vulnerability scanners inspect configurations, open ports and software versions against known issues and best practice baselines.",
        "Compliance frameworks like PCI DSS and ISO 27001 define required controls that are then mapped to specific cloud configuration settings.",
        "Access evaluation checks the requesting identity, the permissions attached to it, the policy on the target resource, and whether any explicit deny applies before deciding to allow or reject a request.",
      ],
      whereYouSeeIt: [
        "Security audits of cloud accounts and workloads.",
        "Payment processing systems needing PCI DSS evidence.",
        "Multinational applications with regional data residency obligations.",
        "Access denied errors reported by users or applications.",
      ],
      commonProblems: ["Publicly exposed storage or databases", "Vulnerability scans not covering customer-configured resources", "Data stored in the wrong region for its residency requirement", "An explicit deny overlooked while debugging an access issue", "Compliance evidence not kept up to date"],
      howItFails: [
        "A storage bucket misconfigured as public is found by an external scanner before an internal one catches it.",
        "A regional data residency requirement is missed when a service is quietly moved to a cheaper region during a migration.",
        "An administrator adds an allow permission but access still fails because an explicit deny elsewhere in the policy set still applies.",
      ],
      troubleshooting: [
        "Run vulnerability scans that specifically cover customer-owned configuration, not just the provider's infrastructure.",
        "Confirm data location settings against residency requirements before and after any migration.",
        "When access fails, check identity, permission, resource policy and explicit deny in that order.",
        "Keep compliance evidence current rather than only producing it just before an audit.",
      ],
      practicalKnowledge: [
        "Treat the shared responsibility model as the starting point for every security review.",
        "Automate checks for public exposure and residency violations rather than relying on manual review.",
        "Document explicit deny rules clearly since they are the most common cause of confusing access failures.",
      ],
      examCoverage: ["Shared responsibility model", "Vulnerability scanning of cloud assets", "PCI DSS", "ISO 27001", "Data residency", "Permission and policy troubleshooting"],
      interviewQuestions: ["Under the shared responsibility model, who is responsible for a misconfigured storage bucket?", "How would you troubleshoot a user who has an allow permission but is still denied access?"],
    },
    recall: [
      ["Under the shared responsibility model, who secures a customer-configured storage bucket's access settings?", ["customer", "the customer"], "The customer, since access configuration on resources they set up falls on their side of the shared responsibility line."],
      ["What overrides an allow permission in most cloud policy systems?", ["explicit deny"], "An explicit deny takes precedence over an allow, even if the allow appears to grant the action."],
    ],
    practice: {
      title: "Diagnose the access failure",
      prompt: "A user has been granted a permission that should allow them to read a specific storage resource, but they still receive an access denied error. What should be checked next?",
      choices: ["Whether an explicit deny elsewhere in policy applies to that resource", "Whether the user's password meets complexity requirements", "Whether the storage resource has enough capacity", "Whether the vulnerability scanner has run recently"],
      answerIndex: 0,
      explanation: "An explicit deny overrides an allow, so it is the most likely explanation once the permission itself looks correct. Password complexity, storage capacity and scan timing do not explain an access denied result here.",
    },
    scenario: {
      title: "The bucket found by an outsider",
      situation: "A security researcher reports that a storage bucket containing customer records is publicly readable. Internal vulnerability scans had not flagged it.",
      decisionPrompt: "Explain the responsibility for this issue and the process gap that let it go unnoticed.",
      expectedConcepts: ["shared responsibility", "customer configuration", "scan coverage", "public exposure", "remediate"],
      guidance: "The customer is responsible for that configuration under the shared responsibility model, since the provider secures the underlying infrastructure but not how the customer sets access on their own resources. Restrict access immediately, then extend vulnerability scanning to explicitly cover public exposure checks on customer-configured resources so the internal scan would have caught it.",
    },
  },
];
