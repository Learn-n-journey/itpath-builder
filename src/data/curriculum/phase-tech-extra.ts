/** Tech+ gap closers: programming concepts, data and databases, software and licensing, security fundamentals. */
import type { TopicSeed } from "./builder";

const TECH = "cert-comptia-tech-plus";

export const techExtraSeeds: TopicSeed[] = [
  {
    slug: "programming-and-development-concepts",
    title: "Programming and Development Concepts",
    summary: "Read code with confidence: data types, variables, logic, functions, objects and how software gets built and released.",
    cert: TECH, month: 1, week: 4, difficulty: "gentle", minutes: 45,
    prereqs: ["it-career-overview"],
    objectives: [
      "Identify common data types and explain why the wrong type causes errors.",
      "Explain variables, branching, loops, functions and arrays in plain language.",
      "Compare compiled, interpreted, query, markup and scripting languages and describe the development lifecycle.",
    ],
    lesson: {
      title: "How software is actually written",
      body: "You do not need to be a developer to work in IT, but you do need to read logic. Every automation, every configuration file, every error message about a type mismatch assumes this vocabulary.",
      definition: "A program is a set of instructions acting on data. Data has a type: integer, floating point, boolean, character and string. Logic controls which instructions run: branching chooses a path, looping repeats work, and functions package reusable steps under a name.",
      whyItMatters:
        "Type errors, off by one loops and unhandled conditions are the causes behind a large share of software faults you will be asked about. Knowing the difference between a compiled language and an interpreted one also explains why one application ships a single executable and another needs a runtime installed.\n\n" +
        "Once code starts waiting on something outside itself, a second idea appears: asynchronous work. A network call, a file read or a database query takes far longer than an instruction, so blocking the program until the answer arrives wastes the whole time. Instead the language hands back a placeholder for a result that is not ready yet, which JavaScript calls a promise. A promise is pending until it either resolves with a value or rejects with an error. Marking a function async lets you write await in front of a promise, which pauses only that function until the result arrives while the rest of the program keeps running. Written with await, asynchronous code reads top to bottom like ordinary instructions, and a rejected promise can be caught with the same error handling you would use for any other failure.\n\n" +
        "Code also has to be stored and shared, which is the job of version control. A repository keeps the history of every committed change, and branches let separate pieces of work progress without colliding. Work that is still in progress creates a practical problem: your edits are in the working directory but not committed, and switching branches would carry them along or refuse to move. The command git stash solves this by shelving the uncommitted changes, both staged and unstaged, and returning the working directory to the last commit. The shelved work waits on a stack until you run git stash pop or git stash apply to bring it back, so you can jump to another branch for an urgent fix and then restore exactly what you were doing.",
      keyTerms: [
        ["Variable", "A named container holding a value that can change."],
        ["Boolean", "A value that is only true or false."],
        ["Array", "An ordered collection accessed by index, starting at 0 in most languages."],
        ["Index", "The position number used to retrieve one item from an array or collection."],
        ["Function", "A named, reusable block of instructions, often returning a value."],
        ["Object", "A bundle of related data and the operations that act on it."],
        ["Promise", "A placeholder for a result that is not ready yet; it is pending, then resolves or rejects."],
        ["Async and await", "Async marks a function that can wait; await pauses it for a promise without blocking the rest of the program."],
        ["Git stash", "Temporarily shelves uncommitted changes so the working directory is clean, then restores them with stash pop."],
      ],
      examples: [
        "Storing a phone number as an integer drops the leading zero, which is why it belongs in a string.",
        "A loop that runs one time too many is the classic off by one bug behind an index out of range error.",
        "Retrieving the third item from an array uses index 2, because the first item sits at index 0.",
        "An await on a fetch call lets the interface keep responding while the response is still on its way.",
        "Git stash before switching branches to fix a live bug, then git stash pop to pick the unfinished work back up.",
      ],
      misconceptions: [
        "Markup such as HTML is not a programming language; it describes structure rather than logic.",
        "Interpreted does not mean slow in every case, and compiled does not mean bug free.",
      ],
      summary: "Data has types, logic has branches, loops and functions, and languages differ in how they reach the processor. That vocabulary is enough to read scripts, configuration and error messages.",
      nextSteps: [
        "Write pseudocode for checking whether a password meets three rules.",
        "Open any script on your machine and name the variables and conditionals in it.",
      ],
    },
    module: {
      howItWorks: [
        "Source code is either compiled ahead of time into machine code or interpreted line by line at runtime.",
        "Branching uses a condition to pick a path; looping repeats until a condition changes.",
        "Functions and objects package logic so it can be reused and tested in isolation.",
      ],
      whereYouSeeIt: ["Scripts, configuration files, web pages, database queries, build pipelines, and error messages."],
      commonProblems: ["Type mismatch", "Off by one in a loop", "Unhandled null or empty value", "Infinite loop", "Hardcoded values that should be configurable"],
      howItFails: [
        "An unhandled empty value crashes the routine the moment real data differs from test data.",
        "An infinite loop consumes a processor core and the application stops responding.",
        "Logic that assumes a format breaks the first time a user types something unexpected.",
      ],
      troubleshooting: [
        "Read the error message for the line number and the type it expected.",
        "Print or log the value just before the failing line.",
        "Test the boundary cases: zero, empty, one item, and the maximum.",
        "Check the input format before assuming the logic is wrong.",
      ],
      practicalKnowledge: [
        "Version control records every change and lets you compare working and broken states.",
        "Pseudocode first, syntax second; the logic is the hard part.",
        "Comments explain why, not what the line already says.",
      ],
      examCoverage: ["Data types", "Programming logic and organisation", "Language categories", "Development lifecycle basics"],
      interviewQuestions: ["Why would you store a postcode as a string?", "What is the difference between a loop and a function?"],
    },
    recall: [
      ["Why should a phone number be stored as a string rather than a number?", ["leading zero", "string", "not arithmetic", "format"], "Numeric types drop leading zeros and allow arithmetic that has no meaning for a phone number."],
      ["What kind of value can a boolean hold?", ["true", "false", "two"], "A boolean holds only true or false, which is what conditionals test."],
    ],
    practice: {
      title: "Pick the data type",
      prompt: "An application needs to record whether a user has accepted the terms. Which data type fits best?",
      choices: ["Boolean", "Integer", "Floating point", "Array"],
      answerIndex: 0,
      explanation: "Acceptance has exactly two states, so a boolean expresses it directly. An integer or float would allow meaningless values, and an array holds a collection rather than a single yes or no.",
    },
    scenario: {
      title: "The report that crashes on one row",
      situation: "A nightly report runs fine for months, then crashes. The log names a type conversion error on a quantity field.",
      decisionPrompt: "Explain the likely cause and what you would check.",
      expectedConcepts: ["type", "data", "input", "validation"],
      guidance: "A row almost certainly contains a value that is not a number, such as blank text or a comma. Find the offending row, then fix validation at the point the data enters rather than only patching the report.",
    },
  },
  {
    slug: "data-and-database-fundamentals",
    title: "Data and Database Fundamentals",
    summary: "Understand structured and unstructured data, relational database structure, basic queries, and how data is backed up and valued.",
    cert: TECH, month: 2, week: 2, difficulty: "gentle", minutes: 45,
    prereqs: ["binary-and-number-systems"],
    objectives: [
      "Distinguish structured, semi-structured and unstructured data with real examples.",
      "Describe tables, records, fields, primary keys and relationships in a relational database.",
      "Explain what create, read, update and delete operations do and why permissions and backups matter.",
    ],
    lesson: {
      title: "Where the organisation's real value sits",
      body: "Hardware is replaceable and software is reinstallable. Data is not. Understanding how it is stored, related, queried and protected is what makes the rest of IT worth doing.",
      definition: "A relational database stores data in tables of rows and columns. Each row is a record, each column a field. A primary key uniquely identifies a row, and a foreign key links a row in one table to a row in another. Structured Query Language is the standard way to create, read, update and delete that data.",
      whyItMatters: "Flat files duplicate information, so one customer address change has to happen in ten places and one gets missed. Relational structure stores the fact once and relates to it, which is why databases sit behind nearly every business application.",
      keyTerms: [
        ["Record", "One row in a table describing a single thing."],
        ["Primary key", "A field whose value uniquely identifies each record."],
        ["Foreign key", "A field referencing the primary key of another table."],
        ["Query", "A request that retrieves or changes data."],
        ["Unstructured data", "Content with no fixed fields, such as documents, images and video."],
      ],
      examples: [
        "A customer table holds each customer once; an orders table links to it with a customer ID rather than repeating the name and address.",
        "Email bodies, photos and scanned invoices are unstructured; the mailbox index describing them is structured.",
      ],
      misconceptions: [
        "A spreadsheet is not a database; it has no enforced relationships, keys or concurrent write control.",
        "Deleting data in an application is not always permanent; it may only set a flag, which matters for privacy requests.",
      ],
      summary: "Store each fact once, relate tables with keys, query rather than copy, restrict who can change what, and test restores because backup success messages are not evidence.",
      nextSteps: [
        "Sketch two related tables for something you know, and name the key that joins them.",
        "Find out where one system you use stores its data and how often it is backed up.",
      ],
    },
    module: {
      howItWorks: [
        "Tables define columns with a data type; rows store the values.",
        "Keys enforce uniqueness and describe relationships between tables.",
        "A query engine reads the request, plans it, and returns a result set or applies the change.",
      ],
      whereYouSeeIt: ["Business applications, ticketing systems, websites, reporting, payroll, and every stock or customer record."],
      commonProblems: ["Duplicate records with no key", "Data entered in inconsistent formats", "Permissions too broad", "Backups never tested", "Reports built on stale copies"],
      howItFails: [
        "Without a unique key, the same customer exists three times and reports disagree.",
        "Broad write permissions let one mistaken update change every row in a table.",
        "An untested backup fails at the exact moment it is needed.",
      ],
      troubleshooting: [
        "Check whether the data is wrong or the report is reading the wrong source.",
        "Look for format inconsistency before blaming the query.",
        "Confirm the last successful restore test, not only the last successful backup.",
        "Verify permissions when a user can see or change more than expected.",
      ],
      practicalKnowledge: [
        "Every update statement should have a where clause; without one it changes every row.",
        "Backups need a tested restore, an offsite copy, and a known recovery time.",
        "Personal data carries legal obligations around access, retention and deletion.",
      ],
      examCoverage: ["Data types and value", "Relational database structure", "Create, read, update and delete", "Backup and data protection basics"],
      interviewQuestions: ["What is a primary key and why does it matter?", "How would you prove a backup works?"],
    },
    recall: [
      ["What does a primary key guarantee about a table?", ["unique", "identifies", "one row"], "A primary key value is unique, so it identifies exactly one record in that table."],
      ["Why is a successful backup job not proof that data is protected?", ["restore", "test", "not verified"], "Only a tested restore proves the data can actually be recovered."],
    ],
    practice: {
      title: "Relate the tables",
      prompt: "An orders table needs to record which customer placed each order without repeating the customer's name and address. What should the orders table store?",
      choices: [
        "A foreign key holding the customer's primary key value",
        "A copy of the full customer record in every order row",
        "The customer's email address as free text",
        "Nothing, because orders and customers should be one table",
      ],
      answerIndex: 0,
      explanation: "A foreign key references the customer's primary key, so the customer details are stored once and every order points at them.",
    },
    scenario: {
      title: "The update with no where clause",
      situation: "A colleague reports that every customer in the database now has the same phone number after they ran a quick fix.",
      decisionPrompt: "Explain what happened and what should happen next.",
      expectedConcepts: ["where", "update", "restore", "backup", "permission"],
      guidance: "An update without a where clause applies to every row. Stop further writes, restore the table from the most recent good backup, then restrict write permissions and require reviewed statements.",
    },
  },
  {
    slug: "software-applications-and-licensing",
    title: "Software Applications, Installation and Licensing",
    summary: "Install and manage applications properly: compatibility, installation methods, updates, and the licensing rules behind them.",
    cert: TECH, month: 1, week: 4, difficulty: "gentle", minutes: 40,
    prereqs: ["operating-systems-overview"],
    objectives: [
      "Check compatibility and requirements before installing software.",
      "Compare local, network and cloud delivered applications and their update paths.",
      "Explain licence types: single use, group, concurrent, subscription, open source and their obligations.",
    ],
    lesson: {
      title: "Getting software onto machines without creating problems",
      body: "Installing an application is easy. Installing it so it still works after an update, is legally licensed, and can be removed cleanly is the actual job.",
      definition: "Software is delivered locally as an installer, from a network share or deployment system, or as a hosted application reached through a browser. A licence is the legal agreement setting how many people or devices may use it and under what conditions.",
      whyItMatters: "Licence breaches are a real financial and audit risk, and unmanaged installs are a real security risk. An application nobody tracks is an application nobody patches.",
      keyTerms: [
        ["System requirements", "The minimum processor, memory, storage and OS version an application needs."],
        ["Concurrent licence", "A licence allowing a set number of simultaneous users rather than named ones."],
        ["Subscription", "A licence paid periodically that lapses when payment stops."],
        ["Open source", "Software whose source is published under a licence that grants rights and imposes conditions."],
        ["Product key", "A code used to activate a licensed installation."],
      ],
      examples: [
        "A 32-bit application may still run on 64-bit Windows, but a 64-bit application will not run on a 32-bit system.",
        "Ten named user licences do not cover twelve staff even if only ten are ever logged in at once, unless the licence is concurrent.",
      ],
      misconceptions: [
        "Free to download does not mean free to use commercially; read the licence.",
        "Open source is not licence free; conditions such as attribution or sharing changes still apply.",
      ],
      summary: "Check requirements, choose the right delivery method, keep an inventory, patch what you install, and match the licence type to how the software is really used.",
      nextSteps: [
        "List the applications on one machine and identify which licence type each uses.",
        "Read the system requirements for one application you support.",
      ],
    },
    module: {
      howItWorks: [
        "An installer places files, registers components and creates shortcuts and services.",
        "Deployment systems push the same package to many machines with a recorded result.",
        "Cloud applications run on the provider's servers and update without local installs.",
      ],
      whereYouSeeIt: ["New starter builds, software requests, audits, patch cycles, and migration projects."],
      commonProblems: ["Insufficient requirements", "Missing runtime or dependency", "Administrative rights needed", "Licence count exceeded", "Old version left behind after an upgrade"],
      howItFails: [
        "A missing runtime produces an error at launch rather than during installation.",
        "An uninstall that leaves registry entries and files behind breaks the next reinstall.",
        "An audit finding of unlicensed use results in a back payment and a compliance obligation.",
      ],
      troubleshooting: [
        "Confirm requirements and architecture before blaming the installer.",
        "Install with the rights the installer needs, then run as a standard user.",
        "Check whether the dependency or runtime it names is present.",
        "Remove the old version fully before reinstalling.",
      ],
      practicalKnowledge: [
        "Keep an inventory; software you cannot list is software you cannot patch.",
        "Prefer managed deployment over individual manual installs for anything used by more than a few people.",
        "Record where licences and keys are held before you need them.",
      ],
      examCoverage: ["Application installation methods", "Compatibility and requirements", "Licence types and obligations", "Updates and patching"],
      interviewQuestions: ["How would you check an application will run on a machine before installing it?", "What is the difference between a named and a concurrent licence?"],
    },
    recall: [
      ["What does a concurrent licence limit?", ["simultaneous", "at once", "same time"], "A concurrent licence limits how many users may use the software at the same time, rather than naming specific users."],
      ["Can a 64-bit application run on a 32-bit operating system?", ["no"], "No. A 64-bit application requires a 64-bit operating system, although a 32-bit application will usually run on a 64-bit system."],
    ],
    practice: {
      title: "Licence fit",
      prompt: "A team of twelve staff uses a design application, but never more than six are working in it at once. Which licence type is the most cost effective legal fit?",
      choices: [
        "Six concurrent licences",
        "Six named user licences",
        "One single use licence shared by everyone",
        "No licence, since it is used occasionally",
      ],
      answerIndex: 0,
      explanation: "Concurrent licensing counts simultaneous use, so six covers the real peak. Six named licences would leave the other staff unlicensed, and sharing a single use licence breaches the agreement.",
    },
    scenario: {
      title: "The application nobody tracked",
      situation: "A security review finds an application installed on thirty machines with no purchase record and no updates in two years.",
      decisionPrompt: "Explain both risks here and the steps you would take.",
      expectedConcepts: ["licence", "patch", "inventory", "remove"],
      guidance: "There is a compliance risk and an unpatched vulnerability risk. Inventory where it is installed, establish whether it is needed, license or remove it, then bring the survivors into managed patching.",
    },
  },
  {
    slug: "security-fundamentals-cia",
    title: "Security Fundamentals: Confidentiality, Integrity and Availability",
    summary: "Apply the CIA triad, authentication factors, everyday threats and basic device and account hygiene.",
    cert: TECH, month: 2, week: 4, difficulty: "gentle", minutes: 45,
    prereqs: ["it-career-overview"],
    objectives: [
      "Apply confidentiality, integrity and availability to real decisions.",
      "Distinguish authentication, authorisation and accounting, and name the three authentication factors.",
      "Recognise common threats and state the basic control that reduces each.",
    ],
    lesson: {
      title: "Three questions behind every security decision",
      body: "Security is not a product. It is asking, for each decision, whether the right people can see it, whether it is still trustworthy, and whether it is there when needed.",
      definition: "Confidentiality means only authorised parties can read data. Integrity means data has not been altered without authorisation. Availability means authorised users can reach it when required. Authentication proves who you are, authorisation decides what you may do, and accounting records what you did.",
      whyItMatters: "The three pull against each other. Encrypting everything protects confidentiality but a lost key destroys availability. Weekly forced password changes look strong but push people to weak, written down passwords. Naming which property you are protecting keeps the trade honest.",
      keyTerms: [
        ["Authentication factor", "Something you know, something you have, or something you are."],
        ["Multifactor authentication", "Verification using two different factor categories."],
        ["Least privilege", "Granting only the access a role actually needs."],
        ["Social engineering", "Manipulating a person rather than defeating a technical control."],
        ["Hashing", "A one way calculation used to detect change and store passwords safely."],
      ],
      examples: [
        "A password plus a code from an authenticator app is multifactor; a password plus a security question is not, since both are things you know.",
        "A file checksum that no longer matches shows an integrity failure, whether from corruption or tampering.",
      ],
      misconceptions: [
        "Encryption does not protect integrity by itself; data can be corrupted while still encrypted.",
        "Antivirus software is one control, not a security strategy.",
      ],
      summary: "Name the property at risk, authenticate then authorise then record, use two different factors, keep privilege minimal, and remember that people are the most targeted control.",
      nextSteps: [
        "Turn on multifactor authentication on one account that does not have it.",
        "For one system you use, name what would break under each of the three properties.",
      ],
    },
    module: {
      howItWorks: [
        "Identity is claimed, then proved with one or more factors, then checked against permissions.",
        "Actions are logged so activity can be attributed afterwards.",
        "Controls are layered so no single failure exposes everything.",
      ],
      whereYouSeeIt: ["Account setup, password policy, file access, phishing reports, backups, and onboarding and offboarding."],
      commonProblems: ["Reused passwords", "Shared accounts", "Excess permissions never reviewed", "No multifactor on remote access", "Phishing that bypasses every technical control"],
      howItFails: [
        "A reused password exposed in one breach opens the accounts that share it.",
        "A shared account makes accounting useless because nobody can be attributed.",
        "Permissions that accumulate as people change roles leave long serving staff with far more access than their job needs.",
      ],
      troubleshooting: [
        "Ask which of confidentiality, integrity or availability is actually threatened before choosing a control.",
        "Check whether an access problem is authentication or authorisation; the fix is different.",
        "Review logs to establish what was actually done rather than what was assumed.",
        "Confirm the second factor category is genuinely different from the first.",
      ],
      practicalKnowledge: [
        "Long passphrases beat short complex passwords, and a manager beats memory.",
        "Remove access on the day a role changes, not at the next review.",
        "Report suspected phishing rather than deleting it quietly; others received it too.",
      ],
      examCoverage: ["CIA triad", "Authentication, authorisation, accounting", "Authentication factors", "Common threats and basic controls"],
      interviewQuestions: ["Give an example where a security control harmed availability.", "Why is a password plus a security question not multifactor?"],
    },
    recall: [
      ["Name the three authentication factor categories.", ["know", "have", "are"], "Something you know, something you have, and something you are."],
      ["Which part of the CIA triad does a ransomware attack attack most directly?", ["availability"], "Encrypting the organisation's own data removes access to it, which is an availability failure, often alongside a confidentiality breach if data was copied."],
    ],
    practice: {
      title: "Is it multifactor?",
      prompt: "A system asks for a password and then a one time code from an app on the user's phone. Which statement is correct?",
      choices: [
        "This is multifactor, because it combines something you know with something you have",
        "This is single factor, because both are entered on the same device",
        "This is multifactor, because two passwords are used",
        "This is single factor, because a code is still something you know",
      ],
      answerIndex: 0,
      explanation: "The password is something you know and the app generated code proves possession of the enrolled device, so two different factor categories are in use.",
    },
    scenario: {
      title: "The convenient shared login",
      situation: "A warehouse team uses one shared account on a stock terminal because individual logins slow them down at shift change.",
      decisionPrompt: "Explain what this costs and propose something that keeps them fast.",
      expectedConcepts: ["accounting", "attribution", "least privilege", "individual"],
      guidance: "Shared accounts destroy attribution and prevent least privilege, so any error or misuse cannot be traced. Offer individual accounts with badge or PIN sign-in on a kiosk profile so speed is preserved.",
    },
  },
];
