/** Beginner layer for the advanced-security topics. Filled in per topic. */
import type { LessonPlainLanguage } from "./types";

export const advancedSecurityPlainLanguage: Record<string, LessonPlainLanguage> = {
  "topic-security-monitoring-and-siem": {
    plainIntro:
      "Imagine a big office building with hundreds of security cameras and alarm sensors, all feeding into one control room so a guard does not have to watch every screen at once. A SIEM is that control room for computers: it pulls in records from laptops, servers, and cloud apps, and it raises an alert when a pattern across several of them looks wrong. Just collecting the records is not enough, someone has to write good rules and then check each alert carefully, or the control room becomes useless noise. This work matters because it is often the only way anyone notices a break-in that never sets off a single, obvious alarm.",
    wordList: [
      { term: "SIEM", plain: "The software that gathers activity records from many computers and services in one place and looks for suspicious patterns across them." },
      { term: "Log", plain: "A written record of one thing that happened on a computer, such as someone signing in." },
      { term: "Correlation rule", plain: "A rule that raises an alert only when two or more separate events line up in a suspicious way." },
      { term: "Alert", plain: "A flag the SIEM raises to tell a person something needs to be checked." },
      { term: "Analyst", plain: "The person who reviews an alert and decides whether it is a real problem." },
      { term: "False positive", plain: "An alert that looked suspicious but turned out to have a normal, harmless explanation." },
      { term: "Enrichment", plain: "Adding extra useful details to an event, such as where in the world an address is located." },
      { term: "Retention", plain: "How long old records are kept and can still be searched." },
      { term: "Multi-factor authentication (MFA)", plain: "A sign-in check that asks for more than just a password, such as a code on your phone." },
    ],
  },

  "topic-log-analysis-and-detection-engineering": {
    plainIntro:
      "A computer keeps a diary of nearly everything it does, such as which program started and which program started it. Log analysis is the skill of reading that diary closely enough to work out exactly what an attacker did, in what order. Detection engineering is building a reliable alarm that will catch that same behaviour automatically next time, the same way a good smoke detector tells a real fire apart from burnt toast. Both skills matter because attackers often use ordinary, built-in tools rather than obvious malicious software, so you have to know what normal looks like to spot what is not.",
    wordList: [
      { term: "Process", plain: "One running copy of a program on a computer." },
      { term: "Parent-child relationship", plain: "The record of which program started which other program, showing the chain of what launched what." },
      { term: "Command line", plain: "The exact typed instruction used to start a program, including any extra options." },
      { term: "Living off the land", plain: "An attacker using tools that are already built into the computer, instead of installing new malicious software." },
      { term: "Detection rule", plain: "A written piece of logic that watches for a specific pattern and raises an alert when it appears." },
      { term: "Baseline", plain: "A record of what normal, everyday activity looks like, used to spot what is unusual." },
      { term: "ATT&CK technique", plain: "A shared, named list of specific ways attackers behave, used so different teams can describe the same behaviour the same way." },
      { term: "False-positive rate", plain: "How often a rule wrongly flags something harmless as suspicious." },
      { term: "Detection as code", plain: "Writing and storing detection rules the same careful way software is written, with review and testing before use." },
    ],
  },

  "topic-threat-intelligence-and-hunting": {
    plainIntro:
      "Threat intelligence is like a neighbourhood watch bulletin that describes exactly how recent burglars nearby have been breaking into houses, which window they target and what tools they use. Threat hunting is what you do with that bulletin: you go and check that exact window in your own house instead of waiting for an alarm to go off. Together they let a security team look for a specific, known danger on purpose, rather than only reacting to alerts that already exist. This matters because some attacks never trigger any alarm at all, and the only way to find them is to go looking with a clear guess in mind.",
    wordList: [
      { term: "Threat intelligence", plain: "Information about who is attacking organisations like yours and how they do it." },
      { term: "Threat hunting", plain: "Actively searching your own systems for signs of a specific attack method, instead of waiting for an alert." },
      { term: "IOC (indicator of compromise)", plain: "A specific clue, such as a file or an internet address, linked to a known attack." },
      { term: "TTP", plain: "The general pattern of behaviour an attacker follows, which is much harder for them to change than one clue." },
      { term: "Pyramid of pain", plain: "A way of ranking clues by how much trouble it causes an attacker when you block that type of clue." },
      { term: "Hypothesis", plain: "A specific, written guess about what an attacker might be doing, used to focus a hunt before it starts." },
      { term: "Negative result", plain: "Finding nothing during a hunt, which is still useful because it proves that spot was checked." },
      { term: "Sector information sharing", plain: "Groups of similar organisations, such as banks, that pass along warnings to each other." },
    ],
  },

  "topic-vulnerability-management": {
    plainIntro:
      "A vulnerability is a weak spot in software or a computer's setup that an attacker could use to get in. Vulnerability management is the ongoing job of finding those weak spots across every computer a company owns, working out which ones actually matter, and making sure they get fixed. It is a bit like a building inspector who finds two hundred issues in one visit: a squeaky door and a blocked fire exit are both 'problems', but nobody fixes them in the order they were written down. This matters because scanners always find far more issues than any team can fix at once, so knowing what to fix first is the real skill.",
    wordList: [
      { term: "Vulnerability", plain: "A weakness in software or a system's setup that could be used to break in." },
      { term: "Scan", plain: "An automatic check of computers that looks for known weaknesses." },
      { term: "Authenticated scan", plain: "A scan that logs in with a valid account first, so it can see the installed software accurately instead of guessing." },
      { term: "CVSS", plain: "A standard scoring system that rates how technically severe a weakness is." },
      { term: "KEV", plain: "A list of weaknesses that are already known to be actively used by real attackers." },
      { term: "Compensating control", plain: "A different protection, such as isolating a system, used when a weakness cannot be fixed right away." },
      { term: "Remediation", plain: "The work of actually fixing a found weakness." },
      { term: "SLA (service level agreement)", plain: "An agreed deadline for how quickly a problem of a given severity must be fixed." },
      { term: "Verified closure", plain: "Confirming with a follow-up check that a fix really worked, instead of just trusting that it was done." },
    ],
  },

  "topic-penetration-testing-methodology": {
    plainIntro:
      "Penetration testing is hiring a skilled person to try to break into your own systems on purpose, so you find the weaknesses before a criminal does. It is like hiring a locksmith to test your house's locks, but only after you give them written permission to try specific doors at specific times, and your phone number in case something goes wrong. That written agreement is the whole difference between a security test and a crime, because the actual techniques used can look identical from the outside. This matters because it proves what a real attacker could actually achieve, which a simple automatic scan can never show.",
    wordList: [
      { term: "Penetration test", plain: "An authorised attempt to break into a system to find real weaknesses, done with written permission." },
      { term: "Scope", plain: "The exact systems and actions that are allowed during a test; anything outside it is off limits." },
      { term: "Rules of engagement", plain: "The written agreement covering when testing can happen, what can be touched, and what is forbidden." },
      { term: "Reconnaissance", plain: "The information-gathering stage before any testing begins, learning about the target." },
      { term: "OSINT", plain: "Information gathered from public sources, without touching the target directly." },
      { term: "Enumeration", plain: "Actively checking a target to find out exactly what services and software it is running." },
      { term: "Deconfliction contact", plain: "A named person the client can call to check whether suspicious activity is the authorised test or a real attack." },
      { term: "Statement of work", plain: "The signed document that legally allows the test to happen." },
    ],
  },

  "topic-exploitation-and-reporting": {
    plainIntro:
      "Exploitation is the moment a tester actually proves a weakness is real by using it to gain access, rather than just guessing it might be a problem. It is like a fire inspector who finds a blocked emergency exit; they do not need to start a real fire to prove the exit would fail, a photo and a clear explanation are enough. The real value of a test comes afterward, in a report clear enough that someone else can understand the danger and fix it. This matters because testers are judged on how well they explain the risk, not on how many systems they managed to break into.",
    wordList: [
      { term: "Exploitation", plain: "Actually using a found weakness to gain real access, to prove it is a genuine problem." },
      { term: "Privilege escalation", plain: "Gaining a higher level of access than you started with." },
      { term: "Lateral movement", plain: "Using access on one computer to reach other computers on the same network." },
      { term: "Proof of concept", plain: "The smallest amount of evidence needed to prove a weakness is real, without doing unnecessary damage." },
      { term: "Blast radius", plain: "How much damage a single action during testing could actually cause if it went wrong." },
      { term: "Cleanup", plain: "Removing any accounts or changes made during testing before the test ends." },
      { term: "Executive summary", plain: "A short, plain-language explanation of the findings for people without a technical background." },
      { term: "Remediation guidance", plain: "Specific, practical instructions on exactly what to fix and how." },
    ],
  },

  "topic-security-architecture-and-zero-trust": {
    plainIntro:
      "Old-style network security worked like a castle with one big wall and one gate: once someone got past the gate, they could wander freely through every room inside. Zero trust redesigns that castle so every single room has its own locked door and its own check, no matter how the visitor got into the building in the first place. Security architecture is the deliberate design work that decides where those locked doors go, so one stolen laptop does not automatically mean the whole company is compromised. This matters because most serious breaches spread because the inside of a network was wide open once an attacker got past the front gate.",
    wordList: [
      { term: "Security architecture", plain: "The deliberate design choices that decide how a company's systems are laid out and protected." },
      { term: "Zero trust", plain: "The idea that no location or device should be trusted automatically, even if it is already inside the company network." },
      { term: "Policy enforcement point", plain: "The specific spot in the design where a decision about letting someone in is actually applied." },
      { term: "Microsegmentation", plain: "Splitting a network into many small, separated zones instead of one big open area." },
      { term: "Device posture", plain: "Information about whether a device is healthy and up to date, used to decide if it should be trusted." },
      { term: "Blast radius", plain: "How far damage could spread if one device or account were taken over." },
      { term: "Least privilege", plain: "Giving people and devices only the access they actually need, and nothing more." },
      { term: "Trust boundary", plain: "A point in a system's design where extra checking is deliberately required before moving further." },
    ],
  },

  "topic-cloud-and-identity-attack-defense": {
    plainIntro:
      "Many attackers today do not bother breaking into a laptop at all; they go straight after a person's login and permissions in the cloud, because a stolen sign-in session can work from anywhere in the world with no virus involved. It is like a thief copying your hotel key card: changing your name at the front desk later does nothing, because the copied card still opens the door. Defending against this means paying close attention to sign-ins, permissions, and unusual account behaviour, not just to viruses on a computer. This matters because resetting a stolen password alone often does nothing if the attacker already holds a working stolen session.",
    wordList: [
      { term: "Session token", plain: "A digital pass a system gives you after you log in, so you do not have to log in again for every action." },
      { term: "Token theft", plain: "Stealing that pass directly, letting an attacker in without ever needing the password." },
      { term: "Adversary-in-the-middle (AiTM)", plain: "A fake login page that sits between you and the real one and secretly captures your session as you log in." },
      { term: "Consent grant", plain: "A permission a user approves that lets another app act on their behalf, sometimes with very wide access." },
      { term: "Service principal", plain: "An account used by a computer program instead of a person, which can be forgotten and over-permissioned." },
      { term: "Conditional access", plain: "Rules that check things like device health or location before letting a sign-in through." },
      { term: "Legacy authentication", plain: "An older way of logging in that can skip modern security checks entirely." },
      { term: "Continuous access evaluation", plain: "Automatically cutting off access the moment a new risk is spotted, instead of waiting for the next login." },
    ],
  },

  "topic-enterprise-risk-and-security-program": {
    plainIntro:
      "At a senior level, security work stops being mostly technical and becomes about deciding what to fix first, getting it funded, and convincing leaders who are not technical to support the change. It is like being responsible for an entire city's flood defences instead of just one riverbank; you cannot build every wall yourself, so you have to convince the city council which walls to fund first. The council does not want a technical lecture, they want to know what happens if nothing is done and how much fixing the worst problem will cost. This matters because a good technical idea that never gets funded or owned by anyone never actually protects anything.",
    wordList: [
      { term: "Security strategy", plain: "A written plan that links known risks to specific, funded projects meant to reduce them." },
      { term: "Maturity model", plain: "A scale that describes how developed an organisation's security practices currently are, compared to a target level." },
      { term: "Risk appetite", plain: "How much risk an organisation's leaders have decided they are willing to accept." },
      { term: "Third-party risk", plain: "Risk brought into a company by outside suppliers or partners who have access to its systems." },
      { term: "Key risk indicator (KRI)", plain: "A tracked number meant to show whether real risk is going up or down over time." },
      { term: "Governance forum", plain: "A regular meeting where risk decisions and exceptions are formally reviewed and approved." },
      { term: "Risk register", plain: "A running list of known risks and what has been decided to do about each one." },
    ],
  },

  "topic-advanced-incident-response-and-forensics": {
    plainIntro:
      "A basic response to a break-in is like putting out a kitchen fire fast. Advanced incident response is what a fire investigator does afterward, working out exactly which wire sparked the fire, how it spread room to room, and what needs to change so it never happens the same way again. Digital forensics is the careful part of that work, collecting evidence in a way that proves nobody tampered with it, so it can hold up later in a report or even in court. This matters because a fast fix without understanding the real cause almost guarantees the same kind of break-in happens again.",
    wordList: [
      { term: "Digital forensics", plain: "The careful collection and analysis of computer evidence after an incident, done so the evidence can be trusted." },
      { term: "Chain of custody", plain: "A written record of exactly who handled a piece of evidence, and when, so nobody can claim it was tampered with." },
      { term: "Timeline reconstruction", plain: "Putting events from different sources in order to build one clear story of what happened." },
      { term: "Root cause", plain: "The original weakness that actually let the attacker in, not just the visible symptom." },
      { term: "Volatile evidence", plain: "Evidence, such as running programs, that disappears the moment a computer is turned off." },
      { term: "Scope determination", plain: "Working out exactly which systems and data were actually affected, not just which ones were exposed to risk." },
      { term: "Cross-source correlation", plain: "Matching clues from several different systems together to see the full picture." },
      { term: "Post-incident review", plain: "A blameless meeting after an incident that turns lessons learned into specific, funded improvements." },
    ],
  },
};
