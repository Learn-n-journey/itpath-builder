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
];
