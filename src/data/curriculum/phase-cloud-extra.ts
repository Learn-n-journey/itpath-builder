import type { TopicSeed } from "./builder";

const C = "cert-comptia-cloud-plus";

export const cloudExtraSeeds: TopicSeed[] = [
  {
    slug: "cloud-storage-backup-and-migration",
    title: "Cloud Storage, Backup and Migration",
    summary: "Select cloud storage tiers, design backup and recovery for cloud workloads, and plan migrations with minimal downtime and data loss.",
    cert: C,
    month: 18,
    week: 2,
    difficulty: "standard",
    minutes: 55,
    prereqs: ["cloud-service-models-and-deployment", "cloud-compute-and-networking"],
    objectives: [
      "Match object, block, and file storage to workload requirements.",
      "Design a backup strategy that meets a stated recovery point and recovery time objective.",
      "Compare lift-and-shift, replatform, and refactor migration strategies.",
    ],
    lesson: {
      title: "Storing, protecting, and moving data in the cloud",
      body: "Every cloud workload eventually needs somewhere to keep data, a way to recover it after loss, and a path to get there from an existing system. These three problems share one root cause when they go wrong: nobody wrote down what the acceptable amount of data loss and downtime actually was before building the solution.",
      definition: "Object storage holds unstructured data as immutable objects addressed by key, accessed over HTTP, and priced by storage class and retrieval frequency. Block storage presents raw volumes attached to a single compute instance, used for operating systems and databases needing low latency. File storage provides a shared file system mountable by multiple instances at once. Recovery point objective is the maximum acceptable data loss measured in time; recovery time objective is the maximum acceptable outage duration. Migration strategies range from lift-and-shift, which moves a workload with minimal change, to refactor, which rebuilds it to use cloud-native services.",
      whyItMatters: "Choosing the wrong storage type causes either poor performance or wasted cost, and skipping RPO and RTO planning turns a routine failure into a business crisis because nobody agreed in advance how much data loss or downtime was tolerable.",
      keyTerms: [
        ["Object storage", "Storage for unstructured data accessed by key over HTTP, such as S3 or Blob Storage."],
        ["Storage tiering", "Moving data between hot, cool, and archive classes based on access frequency."],
        ["Recovery point objective", "The maximum acceptable amount of data loss measured in time."],
        ["Recovery time objective", "The maximum acceptable time to restore service after an outage."],
        ["Lift-and-shift", "Migrating a workload to cloud with minimal architectural change."],
      ],
      examples: [
        "A database uses block storage for low-latency writes while nightly export files go to an object storage archive tier.",
        "A team migrating a legacy application first lifts and shifts it to cloud VMs, then refactors the slowest component into a managed service once stable.",
      ],
      misconceptions: [
        "Enabling versioning or replication on a bucket is not the same as having a tested backup and restore process.",
        "Lift-and-shift is not free of risk; it still requires validating network paths, licensing, and performance before cutover.",
      ],
      summary: "Pick storage type by access pattern and latency need, define RPO and RTO before designing backups, and choose a migration strategy that matches the time and risk budget available.",
      nextSteps: [
        "Write the RPO and RTO for one application you rely on and check whether current backups actually meet them.",
        "List which of your organization's workloads are good lift-and-shift candidates versus refactor candidates.",
      ],
    },
    module: {
      howItWorks: [
        "Object storage stores data as immutable objects with metadata, replicated across zones and organized into storage classes with different retrieval costs and latency.",
        "Backup jobs run on a schedule, capturing snapshots or exports, and are validated by periodic restore tests rather than assumed to work.",
        "Migration tools replicate data continuously during a cutover window, allowing a final low-downtime switch once source and destination are in sync.",
      ],
      whereYouSeeIt: ["Data lake and archive design, database backup policy, disaster recovery planning, and datacenter exit projects."],
      commonProblems: [
        "Backups that were never test-restored",
        "Wrong storage class causing high retrieval costs",
        "Migration cutover exceeding the planned downtime window",
        "Missing encryption or lifecycle policy on stored data",
      ],
      howItFails: [
        "A backup job silently fails for months and is only discovered during an actual recovery attempt.",
        "Archived data is retrieved urgently and the retrieval cost and delay were not planned for.",
        "A migration is scheduled for a fixed window but replication has not fully caught up, forcing an extended outage.",
      ],
      troubleshooting: [
        "Verify a backup by performing an actual restore, not just checking that the job reports success.",
        "Check storage class and lifecycle policy when costs or retrieval times are unexpected.",
        "Monitor replication lag before committing to a migration cutover time.",
      ],
      practicalKnowledge: [
        "Automate backup verification with scheduled test restores into an isolated environment.",
        "Document RPO and RTO per workload so backup frequency and storage tier are chosen deliberately, not by default.",
      ],
      examCoverage: ["Storage types and tiers", "Backup and recovery concepts", "Migration types and considerations"],
      interviewQuestions: [
        "What is the difference between RPO and RTO, and how do they drive backup design?",
        "When would you choose refactor over lift-and-shift for a migration?",
      ],
    },
    recall: [
      ["What does RPO measure?", ["data loss", "point in time", "recovery point"], "RPO measures the maximum acceptable amount of data loss, expressed as a duration of time."],
      ["Which storage type is used for a single-instance database needing low latency?", ["block storage", "block"], "Block storage provides raw, low-latency volumes typically attached to one instance at a time."],
      ["Name a migration strategy that rebuilds the application to use cloud-native services.", ["refactor", "re-architect"], "Refactoring rebuilds part or all of the application to take advantage of cloud-native services, at higher effort but greater long-term benefit."],
    ],
    practice: {
      title: "Choosing the right protection strategy",
      prompt: "A finance team needs at most 15 minutes of data loss and 1 hour of downtime for their transaction database. Which approach best supports these requirements?",
      choices: [
        "Weekly full backups stored in an archive storage tier",
        "Frequent incremental backups or continuous replication with a tested restore procedure",
        "Relying on the storage provider's default redundancy alone",
        "Manual exports triggered only when an administrator remembers to run them",
      ],
      answerIndex: 1,
      explanation: "A 15-minute RPO and 1-hour RTO require frequent incremental backups or replication plus a rehearsed restore process; weekly backups, default redundancy, and manual exports cannot meet those targets.",
    },
    scenario: {
      title: "Restore that did not work",
      situation: "During a real outage, the team attempts to restore a database from its nightly backup, only to discover the backup files have been corrupted for the past three weeks and no one noticed.",
      decisionPrompt: "What immediate and long-term actions address this failure?",
      expectedConcepts: ["test restore", "monitoring", "alerting", "verification"],
      guidance: "Immediately search for any usable recovery point, including replication or transaction logs, then implement automated restore testing and alerting on backup job health so corruption is caught within a defined window rather than during an actual emergency.",
    },
  },
  {
    slug: "cloud-automation-orchestration-and-cost-management",
    title: "Cloud Automation, Orchestration and Cost Management",
    summary: "Automate cloud provisioning with infrastructure as code, orchestrate multi-resource deployments, and control cloud spend proactively.",
    cert: C,
    month: 19,
    week: 2,
    difficulty: "challenging",
    minutes: 55,
    prereqs: ["cloud-compute-and-networking", "containers-and-infrastructure-as-code"],
    objectives: [
      "Explain how infrastructure as code and orchestration tools deploy and manage cloud resources.",
      "Identify the levers available to reduce cloud spend without harming reliability.",
      "Design an automated scaling and tagging policy that supports cost accountability.",
    ],
    lesson: {
      title: "Making the cloud repeat itself on purpose",
      body: "Manual clicking through a cloud console does not scale past a handful of resources, and it leaves no record of why a resource exists. Automation and orchestration turn infrastructure into reviewable, repeatable configuration, while cost management turns spending into something a team can actually forecast and control.",
      definition: "Infrastructure as code defines cloud resources in declarative configuration files that are applied through a tool to create, update, or remove resources consistently. Orchestration coordinates the order and dependencies of multiple resources and services, including scaling actions triggered by demand. Cost management includes rightsizing resources to actual usage, using reserved or spot pricing where appropriate, tagging resources for accountability, and setting budgets and alerts before overspending happens.",
      whyItMatters: "Untracked manual changes cause configuration drift and outages that are hard to diagnose, and untracked spend is one of the most common reasons cloud projects lose executive support even when the technology works well.",
      keyTerms: [
        ["Infrastructure as code", "Managing cloud resources through declarative configuration files applied by a tool."],
        ["Configuration drift", "A mismatch between the deployed environment and its defined configuration."],
        ["Rightsizing", "Adjusting resource capacity to match actual observed usage."],
        ["Reserved instance", "A discounted pricing commitment in exchange for a fixed term of usage."],
        ["Tagging", "Attaching metadata to resources to track owner, project, or cost center."],
      ],
      examples: [
        "A team defines their entire environment in a version-controlled template so any environment can be rebuilt identically after a failure.",
        "An unused development environment left running over a weekend is caught by a budget alert and automatically shut down by a scheduled policy.",
      ],
      misconceptions: [
        "Autoscaling alone does not guarantee lower cost; without limits and rightsizing it can scale up expensive resources unnecessarily.",
        "Tagging resources after the fact is far less reliable than enforcing tags at creation time through policy.",
      ],
      summary: "Define infrastructure declaratively so changes are reviewable and repeatable, then apply rightsizing, discount pricing, tagging, and budget alerts so cost stays visible and controlled rather than discovered on the monthly invoice.",
      nextSteps: [
        "Write a simple infrastructure as code template for one resource you currently create manually.",
        "Set up a budget alert on a cloud account you manage and confirm it actually notifies someone.",
      ],
    },
    module: {
      howItWorks: [
        "Infrastructure as code tools compare a desired state defined in configuration to the current deployed state and apply only the differences.",
        "Orchestration platforms sequence dependent resources, for example creating a network before the instances that live inside it.",
        "Cost tools aggregate usage by tag and account, comparing it against budgets and forecasted trends to trigger alerts.",
      ],
      whereYouSeeIt: ["Environment provisioning pipelines, disaster recovery rebuilds, multi-team cost accountability, and autoscaling policies."],
      commonProblems: [
        "Configuration drift from manual console changes outside the code",
        "Unused or oversized resources left running",
        "Missing or inconsistent resource tags",
        "No budget alerts until the invoice arrives",
      ],
      howItFails: [
        "A manual emergency change is never reflected back into the code, so the next automated deployment reverts it.",
        "A team leaves large instances running in a test environment indefinitely because no one owns shutting them down.",
        "Cost overruns are discovered a month later because no budget threshold was ever configured.",
      ],
      troubleshooting: [
        "Compare deployed resource state against the code to detect drift before assuming a mysterious failure.",
        "Review usage reports by tag to find untagged or oversized resources.",
        "Check budget alert configuration and notification recipients when overspend goes unnoticed.",
      ],
      practicalKnowledge: [
        "Enforce tagging policy at resource creation rather than relying on manual discipline afterward.",
        "Schedule automatic shutdown of non-production resources outside business hours to cut waste.",
      ],
      examCoverage: ["Infrastructure as code and orchestration concepts", "Cost management and optimization strategies", "Automation and scaling policies"],
      interviewQuestions: [
        "How would you detect and remediate configuration drift in a cloud environment?",
        "What levers would you use to reduce cloud spend without reducing reliability?",
      ],
    },
    recall: [
      ["What term describes a deployed environment no longer matching its defined configuration?", ["configuration drift", "drift"], "Configuration drift occurs when manual or unmanaged changes cause the live environment to diverge from its declared infrastructure as code."],
      ["Name one pricing option that reduces cost in exchange for a committed usage term.", ["reserved instance", "reserved pricing", "commitment"], "Reserved instances offer discounted rates in exchange for committing to a fixed term of usage."],
      ["What is rightsizing?", ["adjusting capacity to usage", "matching resources to actual usage"], "Rightsizing means adjusting resource capacity, such as instance size, to match observed actual usage rather than initial guesses."],
    ],
    practice: {
      title: "Cutting cost without breaking reliability",
      prompt: "A cloud bill has grown steadily each month with no corresponding growth in customers. Which action addresses the root cause rather than just the symptom?",
      choices: [
        "Immediately shut down all non-production environments without review",
        "Switch every workload to the cheapest instance type available regardless of load",
        "Review usage and tagging data to identify oversized or idle resources, then rightsize and add budget alerts",
        "Ask finance to increase the monthly cloud budget to match the trend",
      ],
      answerIndex: 2,
      explanation: "Rising cost without matching growth points to oversized or idle resources; the correct fix is data-driven rightsizing and ongoing budget visibility, not blind cuts, blanket downsizing, or simply raising the budget.",
    },
    scenario: {
      title: "The template that got edited by hand",
      situation: "An engineer makes a quick manual fix in the cloud console during an incident to restore service, then forgets to update the infrastructure as code template. Weeks later, an automated deployment overwrites the fix and the incident recurs.",
      decisionPrompt: "How do you prevent this class of failure going forward?",
      expectedConcepts: ["drift detection", "code as source of truth", "review process"],
      guidance: "Treat the code as the single source of truth, require manual emergency changes to be backported into it before the next deployment, and add automated drift detection that flags divergence before it is silently overwritten.",
    },
  },
  {
    slug: "cloud-monitoring-logging-and-troubleshooting",
    title: "Cloud Monitoring, Logging and Troubleshooting",
    summary: "Build cloud observability with metrics, logs, and alerts, and apply a structured troubleshooting process to cloud-specific failures.",
    cert: C,
    month: 19,
    week: 4,
    difficulty: "standard",
    minutes: 55,
    prereqs: ["cloud-service-models-and-deployment", "cloud-automation-orchestration-and-cost-management"],
    objectives: [
      "Distinguish metrics, logs, and traces and describe what each is best suited to diagnose.",
      "Design alert thresholds that reduce noise while catching real incidents.",
      "Apply a structured troubleshooting process to a cloud service degradation.",
    ],
    lesson: {
      title: "Seeing inside a system you do not fully control",
      body: "Cloud abstracts away hardware, which also removes the direct visibility administrators used to have. Observability replaces that visibility with collected metrics, logs, and traces, and troubleshooting in the cloud means reading that evidence methodically instead of guessing.",
      definition: "Metrics are numeric measurements over time, such as CPU usage or request latency, used to detect trends and trigger alerts. Logs are timestamped records of discrete events, used to explain what happened at a specific moment. Traces follow a single request across multiple services, showing where time was spent. An alert threshold defines the condition under which a metric or log pattern triggers a notification. Effective troubleshooting starts by defining the actual symptom, checks recent changes, isolates the affected layer, and confirms the fix before closing the incident.",
      whyItMatters: "Without proper observability, cloud outages take far longer to diagnose because there is no console to walk up to and no cable to check; the evidence exists only in collected telemetry, and if it was not captured, it cannot be reconstructed later.",
      keyTerms: [
        ["Metric", "A numeric measurement collected over time, such as latency or error rate."],
        ["Log aggregation", "Collecting logs from many sources into a searchable central system."],
        ["Distributed tracing", "Tracking a single request as it moves across multiple services."],
        ["Alert fatigue", "Desensitization to alerts caused by excessive or low-value notifications."],
        ["Service level objective", "A target level of reliability or performance a service commits to."],
        ["Baseline", "The expected normal range of a metric used to judge whether current behavior is abnormal."],
      ],
      examples: [
        "A latency spike shown in metrics is explained by a specific error found in the logs at the same timestamp.",
        "A trace shows that a slow checkout page is actually waiting on a third-party payment API, not the application server.",
      ],
      misconceptions: [
        "Collecting more metrics and logs is not automatically useful if no one reviews or alerts on them.",
        "An alert firing does not always mean the service is down; thresholds must be tuned against a real baseline to avoid false positives.",
      ],
      summary: "Use metrics to detect that something is wrong, logs to explain what happened, and traces to find where in a distributed system the problem occurred, then follow a consistent process from symptom to confirmed fix.",
      nextSteps: [
        "Set up one alert on a metric you currently only check manually, tuned to your normal baseline.",
        "Practice tracing one recent incident from its first alert back to the specific log entry that explains it.",
      ],
    },
    module: {
      howItWorks: [
        "Monitoring agents and cloud-native services collect metrics and logs continuously and forward them to a central platform.",
        "Alerting engines compare live metrics against defined thresholds or anomaly baselines and notify on-call staff when conditions are met.",
        "Tracing systems tag each request with a unique identifier that is passed between services so its full path can be reconstructed.",
      ],
      whereYouSeeIt: ["Incident response, service level objective reporting, capacity planning, and performance tuning of distributed applications."],
      commonProblems: [
        "Alert fatigue from poorly tuned thresholds",
        "Logs scattered across services with no central search",
        "Missing correlation between metrics, logs, and traces during an incident",
        "No defined baseline, so nobody can say what normal looks like",
      ],
      howItFails: [
        "Too many low-value alerts train the on-call team to ignore notifications, so a real incident is missed.",
        "An incident takes hours to resolve because logs from different services cannot be searched together.",
        "A gradual performance regression goes unnoticed because there was never a documented baseline to compare against.",
      ],
      troubleshooting: [
        "Start from the specific reported symptom and confirm it with a metric or log before assuming a cause.",
        "Check what changed recently, including deployments and configuration, before investigating hardware or network issues.",
        "Correlate metrics, logs, and traces by timestamp and request identifier to isolate the failing component.",
      ],
      practicalKnowledge: [
        "Tune alert thresholds against real historical baselines rather than arbitrary round numbers.",
        "Centralize logs and metrics from all services so an incident does not require checking a dozen separate dashboards.",
      ],
      examCoverage: ["Monitoring and alerting concepts", "Log management and analysis", "Structured troubleshooting methodology"],
      interviewQuestions: [
        "How do metrics, logs, and traces each contribute to diagnosing an incident?",
        "How would you reduce alert fatigue on a team that is starting to ignore pages?",
      ],
    },
    recall: [
      ["What type of telemetry follows a single request across multiple services?", ["trace", "distributed trace", "tracing"], "Distributed tracing follows a single request as it moves through multiple services, showing where time is spent."],
      ["What is alert fatigue?", ["desensitization to alerts", "ignoring alerts"], "Alert fatigue is desensitization caused by too many low-value alerts, which can cause a real incident to be missed."],
      ["What should a troubleshooter check early when a cloud service degrades unexpectedly?", ["recent changes", "recent deployments", "what changed"], "Checking recent changes such as deployments or configuration updates is a key early step before investigating deeper infrastructure causes."],
    ],
    practice: {
      title: "Diagnosing a slow checkout page",
      prompt: "Customers report the checkout page is slow. Application server metrics look normal, but a distributed trace shows most of the request time is spent waiting on an external payment API. What is the most appropriate next step?",
      choices: [
        "Scale up the application servers even though their metrics are normal",
        "Restart the application service to clear the issue",
        "Investigate the external payment API's performance and check its status or contact its provider",
        "Increase logging verbosity on the application server only",
      ],
      answerIndex: 2,
      explanation: "The trace evidence points to the external payment API as the bottleneck, so the correct next step is to investigate that dependency rather than scaling, restarting, or adding logs to a component that is already performing normally.",
    },
    scenario: {
      title: "Alerts everyone ignores",
      situation: "The on-call team has begun silencing notifications on their phones because dozens of low-severity alerts fire every night, none of which have required action in months. During a real outage, the actual critical alert is missed for over an hour.",
      decisionPrompt: "What changes would you make to the alerting strategy to prevent this from happening again?",
      expectedConcepts: ["threshold tuning", "severity levels", "baseline", "alert review"],
      guidance: "Review and retune thresholds against real baselines, separate alerts by severity so only actionable conditions page someone immediately, and regularly prune or fix noisy alerts so the team trusts and responds to what remains.",
    },
  },
];
