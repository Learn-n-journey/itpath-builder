/**
 * Additional CompTIA SecurityX topics extending the year-two advanced security phase.
 */
import type { TopicSeed } from "./builder";

const SX = "cert-comptia-securityx";

export const securityxExtraSeeds: TopicSeed[] = [
  {
    slug: "cryptography-and-key-management-at-scale",
    title: "Cryptography and Key Management at Scale",
    summary: "Design, operate, and recover cryptographic key management across large distributed enterprises without breaking availability.",
    cert: SX, month: 23, week: 2, difficulty: "challenging", minutes: 60,
    prereqs: ["cryptography-fundamentals", "security-architecture-and-zero-trust"],
    objectives: [
      "Design a key management lifecycle covering generation, distribution, rotation, and destruction.",
      "Compare hardware security modules, key management services, and software vaults for enterprise use.",
      "Evaluate cryptographic agility and recovery planning against a compromised or deprecated algorithm.",
    ],
    lesson: {
      title: "The keys matter more than the algorithm",
      body: "A strong cipher protects nothing if the keys that unlock it are poorly generated, copied into a script, or never rotated. At enterprise scale, cryptography fails through key management, not through broken mathematics.",
      definition: "Key management at scale is the set of processes and systems that generate, store, distribute, rotate, escrow, and destroy cryptographic keys across many applications, teams, and environments. It includes hardware security modules for root key protection, cloud key management services for application-level keys, defined key lifecycles with rotation and expiry, separation of duties between key custodians, and cryptographic agility so algorithms and key lengths can be replaced without rebuilding systems.",
      whyItMatters: "A leaked signing key, a certificate authority private key stored on a shared drive, or an algorithm quietly deprecated years ago can undermine every system that trusted it. Recovering from a key compromise touches every application that used the key, so the blast radius of a key management failure is far larger than the blast radius of a single application bug.",
      keyTerms: [
        ["Hardware security module", "A tamper-resistant device that generates and protects private keys, never exposing them in plaintext."],
        ["Key encryption key", "A key used only to encrypt other keys, reducing exposure of data-encrypting keys."],
        ["Cryptographic agility", "The ability to swap algorithms or key lengths without redesigning the systems that use them."],
        ["Key escrow", "Controlled storage of a copy of a key to allow authorised recovery."],
        ["Certificate pinning", "Hardcoding an expected certificate or key so only it is trusted, at the cost of update friction."],
      ],
      examples: [
        "A cloud key management service lets an application encrypt data without the application ever seeing the raw key, so a code leak does not leak the key.",
        "An organisation with hardcoded certificate pins on a mobile app has to push an app update every time it rotates a certificate, turning a routine rotation into an incident.",
      ],
      misconceptions: [
        "Encrypting data does not protect it if the key sits next to the ciphertext or is checked into source control.",
        "A longer key length does not fix a system that never rotates keys or has no plan for revocation.",
      ],
      summary: "Protect keys with hardware or managed services rather than application code, define a full lifecycle with rotation and destruction, separate duties over who can access which keys, and build cryptographic agility so a compromised or deprecated algorithm can be replaced without a rebuild.",
      nextSteps: [
        "List every private key in your environment and where it is stored today.",
        "Write the exact steps to rotate a compromised code-signing key across every dependent system.",
      ],
    },
    module: {
      howItWorks: [
        "Root and signing keys are generated and stored inside hardware security modules that never export plaintext key material.",
        "Application-level keys are issued by a key management service, wrapped by a key encryption key, and scoped to specific services.",
        "Rotation schedules and automated certificate renewal reduce the number of long-lived keys in the environment.",
      ],
      whereYouSeeIt: ["Public key infrastructure operations, cloud data encryption, code signing pipelines, TLS certificate management, and payment or regulated data environments."],
      commonProblems: ["Keys embedded directly in application code or configuration files", "No rotation schedule for long-lived signing or database encryption keys", "Single administrator with unrestricted access to all keys", "Deprecated algorithms left in place because migration was never planned"],
      howItFails: [
        "A key is copied into a script for convenience during an incident and is never removed afterward.",
        "Certificate pinning without a rotation plan causes an outage the day the pinned certificate expires.",
        "A departing employee retains access to a key vault because offboarding did not cover cryptographic access.",
      ],
      troubleshooting: [
        "Search source repositories and configuration management systems for embedded key material.",
        "Confirm that every root or signing key has a documented custodian and a tested rotation procedure.",
        "Verify that revoking one key does not silently break dependent systems that were never inventoried.",
      ],
      practicalKnowledge: [
        "Treat key rotation as a routine operational task tested regularly, not an emergency procedure attempted for the first time during a compromise.",
        "Use envelope encryption so application keys can be rotated without re-encrypting the underlying data.",
      ],
      examCoverage: ["Key management lifecycle and secure storage options", "Hardware security modules versus cloud key management services", "Cryptographic agility and algorithm deprecation planning"],
      interviewQuestions: ["How would you rotate a compromised code-signing certificate used by dozens of build pipelines?", "What is the difference between a key encryption key and a data encryption key, and why does the distinction matter?"],
    },
    recall: [
      ["What is the primary purpose of a hardware security module?", ["protect", "private key", "never expose", "tamper"], "It generates and protects private keys so they are never exposed in plaintext outside the device."],
      ["Why does envelope encryption make key rotation easier?", ["data encryption key", "wrapped", "re-encrypt", "key encryption key"], "Only the small wrapped key encryption key needs to be re-encrypted, not the entire dataset."],
      ["What risk does certificate pinning introduce?", ["rotation", "outage", "update", "expire"], "It requires an application update whenever the pinned certificate changes, which can cause outages if rotation is not planned."],
    ],
    practice: {
      title: "Rotating a compromised signing key",
      prompt: "A code-signing private key used across twelve build pipelines is suspected of being compromised. Which action addresses the risk most completely?",
      choices: [
        "Increase the key length on the next scheduled renewal",
        "Revoke the current certificate, issue a new key from the hardware security module, and re-sign affected artefacts across all twelve pipelines",
        "Add certificate pinning to the build servers",
        "Rotate only the pipelines that have deployed in the last week",
      ],
      answerIndex: 1,
      explanation: "A suspected key compromise requires full revocation and reissue from protected hardware, plus re-signing everywhere the old key was trusted, not a partial or delayed response.",
    },
    scenario: {
      title: "Key vault access review",
      situation: "An audit finds that a single infrastructure engineer has unrestricted access to every key in the organisation's key management service, including database encryption keys, TLS certificates, and the code-signing key, with no logging of key retrieval.",
      decisionPrompt: "What changes would you recommend, and in what order?",
      expectedConcepts: ["separation of duties", "least privilege", "logging", "rotation"],
      guidance: "Start by enabling detailed access logging on the key vault, then scope access by role so no single account can retrieve every key class, and finally schedule rotation for the keys that were exposed to overly broad access.",
    },
  },
  {
    slug: "secure-software-supply-chain-and-devsecops",
    title: "Secure Software Supply Chain and DevSecOps",
    summary: "Secure the path from source code to production, covering dependency risk, build integrity, and security integrated into the delivery pipeline.",
    cert: SX, month: 24, week: 2, difficulty: "challenging", minutes: 55,
    prereqs: ["containers-and-infrastructure-as-code", "security-architecture-and-zero-trust"],
    objectives: [
      "Identify risks introduced by third-party dependencies and build tooling in a software supply chain.",
      "Integrate security scanning and gating into a continuous integration and delivery pipeline.",
      "Design controls that verify build provenance and prevent tampering between source and production.",
    ],
    lesson: {
      title: "Trusting code you did not write",
      body: "Most applications are built from far more third-party code than first-party code. A supply chain attack does not need to breach your network; it only needs to compromise one dependency, one build tool, or one pipeline credential that you already trust.",
      definition: "Software supply chain security covers every step between writing source code and running it in production: dependency selection and vetting, build environment integrity, artefact signing and provenance, and pipeline access control. DevSecOps integrates security testing directly into the development and delivery pipeline through automated scanning, gated approvals, and shared responsibility between developers and security teams, rather than treating security as a separate review at the end.",
      whyItMatters: "Attackers have shifted toward compromising widely used dependencies and build systems because one successful compromise can propagate to thousands of downstream applications at once. A pipeline with weak access control or unsigned artefacts can be tampered with quietly, and the resulting compromise looks like a normal deployment.",
      keyTerms: [
        ["Software bill of materials", "A list of every component and dependency in an application, used to track exposure to known vulnerabilities."],
        ["Provenance", "Verifiable evidence of where an artefact came from and how it was built."],
        ["Dependency confusion", "An attack that tricks a build system into pulling a malicious package instead of the intended internal one."],
        ["Shift left", "Moving security testing earlier in the development process rather than only at release."],
        ["Artefact signing", "Cryptographically signing a build output so tampering after the build can be detected."],
      ],
      examples: [
        "A malicious update to a popular open-source logging library is pulled automatically into thousands of applications through routine dependency updates.",
        "An internal package name is registered on a public repository, and a misconfigured build pulls the public malicious version instead of the internal one.",
      ],
      misconceptions: [
        "Scanning source code alone does not catch a compromised build tool or a tampered dependency introduced after the scan runs.",
        "A pipeline with correct code is not automatically trustworthy if the build server or its credentials can be modified by an unauthorised party.",
      ],
      summary: "Track every dependency with a software bill of materials, verify build provenance and sign artefacts so tampering is detectable, restrict and audit pipeline credentials, and integrate automated security testing throughout the pipeline rather than only at the end.",
      nextSteps: [
        "Generate a software bill of materials for one production application and review it for outdated components.",
        "Map who and what has write access to your build pipeline configuration and secrets.",
      ],
    },
    module: {
      howItWorks: [
        "Dependency scanning tools compare a software bill of materials against known vulnerability databases before code is merged.",
        "Build systems produce signed artefacts with provenance metadata that later stages verify before deployment.",
        "Pipeline stages gate progression on passing security tests, with separate credentials for build, test, and deployment.",
      ],
      whereYouSeeIt: ["Continuous integration and delivery pipelines, open-source dependency management, container image build processes, and internal package registries."],
      commonProblems: ["Outdated or unpinned dependency versions pulled automatically at build time", "Shared long-lived credentials used by multiple pipeline stages", "No verification that a deployed artefact matches the one that passed security testing", "Security scanning run too late to influence a release decision"],
      howItFails: [
        "A dependency update introduces malicious code that passes existing tests because the tests never checked package integrity.",
        "A compromised build server injects code into an artefact after scanning has already completed, so the signed output no longer matches what was tested.",
        "Pipeline credentials with excessive scope allow a compromised build job to modify production infrastructure directly.",
      ],
      troubleshooting: [
        "Compare the hash of a deployed artefact against the one produced and signed by the build pipeline.",
        "Review dependency update history for a component when a new vulnerability disclosure affects a widely used package.",
        "Audit pipeline service account permissions for scope beyond what each stage actually requires.",
      ],
      practicalKnowledge: [
        "Pin dependency versions and require manual review for major version updates rather than accepting all updates automatically.",
        "Separate build, test, and deployment credentials so a compromise of one stage cannot directly affect production.",
      ],
      examCoverage: ["Software supply chain risks and dependency management", "DevSecOps pipeline integration and gating", "Artefact integrity, signing, and provenance verification"],
      interviewQuestions: ["How would you detect that a build artefact was tampered with between build and deployment?", "What controls would you add to a pipeline that currently uses one shared credential for build, test, and deploy?"],
    },
    recall: [
      ["What does a software bill of materials provide?", ["list", "components", "dependencies", "vulnerability"], "A complete inventory of the components and dependencies in an application, used to assess exposure to known vulnerabilities."],
      ["Why is dependency confusion effective?", ["internal", "public", "package name", "pulls"], "A misconfigured build system can be tricked into pulling a public malicious package with the same name as an internal one."],
      ["What does artefact signing protect against?", ["tampering", "after build", "detect", "integrity"], "It allows later stages to detect whether an artefact was modified after it was built and tested."],
    ],
    practice: {
      title: "Pipeline credential scope",
      prompt: "A continuous integration pipeline uses one shared service account with permissions to build, run tests, and deploy directly to production. Which change most reduces the risk of this design?",
      choices: [
        "Increase the password length for the shared service account",
        "Add a code review requirement before merging to the main branch",
        "Separate build, test, and deployment into distinct credentials scoped only to what each stage requires",
        "Run the pipeline on a more powerful build server",
      ],
      answerIndex: 2,
      explanation: "Scoping credentials to the minimum needed for each stage limits how far a compromise of any single stage can reach, which a shared unrestricted credential does not.",
    },
    scenario: {
      title: "Unexpected dependency update",
      situation: "A routine automated dependency update pulls in a new version of a widely used open-source library the night before a release. The update passes all existing automated tests, but a security researcher publishes a report the next morning describing malicious code hidden in that exact version.",
      decisionPrompt: "What immediate steps would you take, and what pipeline change would you propose to reduce the chance of this happening again?",
      expectedConcepts: ["rollback", "software bill of materials", "pin versions", "manual review"],
      guidance: "Roll back to the last known good dependency version, use the software bill of materials to identify every affected build, and change the pipeline to pin dependency versions with mandatory manual review for updates rather than accepting them automatically.",
    },
  },
];
