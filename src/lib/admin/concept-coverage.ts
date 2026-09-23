/**
 * Concept coverage: does a question test knowledge the course actually taught?
 *
 * The rule this gate enforces is single and blunt: never test a learner on
 * knowledge the course has not taught. It is *not* a word-matching gate.
 * Literal word matching survives only as a low-level signal — an unmatched
 * ordinary word can never fail a question on its own. What matters is whether
 * the technical knowledge a question requires (terms, components, commands,
 * procedures, distinctions) is present anywhere in the teaching material for
 * the topic or its prerequisites.
 *
 * Everything here is deterministic: no model decides whether something was
 * taught, and nothing in this file writes to learner records or content.
 */
import type { CoursePack } from "@/content/pack-contract";
import type { Question } from "@/lib/app-data/types";

export type CoverageVerdict = "pass" | "review" | "fail";

export interface CoverageFinding {
  topicId: string;
  topicTitle: string;
  /** Where the question lives: the section quiz, a lesson self-check, recall. */
  kind: "quiz" | "self-check" | "recall";
  questionId: string;
  prompt: string;
  verdict: CoverageVerdict;
  /** The technical knowledge the question needs the learner to hold. */
  requiredKnowledge: string[];
  /** Required knowledge the topic (or a prerequisite) teaches. */
  taughtKnowledge: string[];
  /** Required knowledge nothing in the topic or its prerequisites teaches. */
  missingKnowledge: string[];
  /** Of those, the knowledge the course does not teach anywhere at all. */
  missingEverywhere: string[];
  /** Short quotes from the lesson showing where the concept is taught. */
  lessonEvidence: string[];
  reason: string;
  remediation: string;
}

/**
 * Ordinary question and scenario language. None of this is technical
 * knowledge, so its absence from a lesson means nothing.
 */
const QUESTION_LANGUAGE = new Set([
  "about","above","administrator","administrators","admin","according","across","action","actions","actually","additional","after","again","against","allow","allowed","allows","along","already","also","although","always","among","amount","another","answer","answers","anything","appear","appears","apply","applies","approach","appropriate","around","aspect","assume","assuming","available","avoid","based","because","become","becomes","been","before","begin","behaviour","behavior","being","below","besides","best","better","between","beyond","both","brief","bring","building","business","cannot","carefully","case","cases","cause","causes","certain","chance","change","changes","choice","choices","choose","chosen","clear","clearly","colleague","come","comes","common","commonly","company","compare","compared","complete","completely","concern","concerned","condition","conditions","consider","consistent","contains","continue","correct","correctly","could","course","create","created","current","currently","customer","decide","decision","describe","describes","description","detail","details","determine","difference","different","directly","does","doing","during","each","earlier","effect","either","else","engineer","enough","ensure","entire","especially","essential","even","event","every","everything","exactly","example","except","expect","expected","experience","explain","explains","fact","factor","field","find","finds","first","follow","following","follows","further","general","generally","give","given","gives","goal","good","greater","group","handle","happen","happens","hard","help","helps","here","high","higher","highly","however","identify","immediately","impact","important","include","included","includes","including","incorrect","indicate","indicates","information","initial","instead","intended","into","issue","issues","itself","just","keep","kind","know","known","large","larger","last","later","least","leave","less","level","light","like","likely","limited","little","long","longer","look","looking","made","main","make","makes","making","manager","many","matter","mean","means","measure","member","mention","mentioned","might","minimal","minimum","more","most","mostly","move","much","multiple","must","near","need","needed","needs","never","newly","next","nothing","notice","noticed","number","observe","observed","obvious","occur","occurs","offer","often","once","only","onto","open","option","options","order","other","others","otherwise","output","over","overall","part","particular","particularly","perform","performed","perhaps","person","phrase","place","plan","point","possible","potential","potentially","practice","prefer","preferred","present","prevent","previous","prove","proves","proved","stop","stopped","stops","primary","probably","problem","process","produce","product","provide","provided","provides","purpose","quickly","rather","reason","reasonable","receive","recent","recently","recommend","recommended","reduce","refer","refers","related","relationship","remain","remains","repeat","report","reported","represent","represents","request","require","required","requires","respond","response","result","results","return","right","routine","said","same","scenario","second","section","seem","seems","sees","select","separate","series","several","should","show","shows","similar","simple","simply","since","single","situation","small","smaller","some","something","sometimes","soon","specific","specifically","standard","start","started","state","statement","statements","still","strong","strongly","such","suggest","suggests","support","suppose","sure","take","takes","team","technician","tell","term","terms","test","tested","than","that","their","them","then","there","therefore","these","they","thing","think","third","this","those","though","three","through","time","times","today","together","total","toward","true","turn","turns","twice","type","typical","typically","under","understand","unless","until","upon","used","useful","user","uses","using","usually","valid","value","various","very","view","want","warning","were","what","whatever","when","where","whether","which","while","whole","whose","will","with","within","without","word","work","working","works","would","write","wrong","year","your",
]);

function stem(word: string): string {
  let out = word;
  if (/[a-z]{3}ied$/.test(out)) return `${out.slice(0, -3)}y`;
  if (out.length > 5 && (out.endsWith("ing") || out.endsWith("ed"))) {
    out = out.slice(0, out.endsWith("ing") ? -3 : -2);
    // "stopped" -> "stop", "running" -> "run"
    if (/([bdfgklmnprt])\1$/.test(out)) out = out.slice(0, -1);
    else if (/[^aeiou][aeiou][^aeiouwxy]$/.test(out) && out.length <= 4) out = `${out}e`;
    return out;
  }
  if (out.length > 4 && out.endsWith("ies")) return `${out.slice(0, -3)}y`;
  if (out.length > 4 && out.endsWith("es") && /(s|x|z|ch|sh)es$/.test(out)) return out.slice(0, -2);
  if (out.length > 4 && out.endsWith("s") && !/(ss|us|is|os|as)$/.test(out)) return out.slice(0, -1);
  return out;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9/.\-_ ]+/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[./\-_]+|[./\-_]+$/g, ""))
    .filter(Boolean);
}

/**
 * Wording that means the same taught thing. Kept small and curated: each
 * group is one concept the course teaches under more than one name.
 */
const SYNONYM_GROUPS: string[][] = [
  ["folder", "directory"],
  ["drive", "disk", "volume"],
  ["nic", "network adapter", "network card", "network interface"],
  ["credential", "login", "sign-in", "logon"],
  ["permission", "privilege", "right", "access control"],
  ["patch", "update", "hotfix"],
  ["vulnerability", "weakness", "flaw"],
  ["attacker", "adversary", "threat actor", "hacker"],
  ["encrypt", "cipher", "encryption"],
  ["authenticate", "authentication", "verify identity"],
  ["restart", "reboot", "power cycle"],
  ["command prompt", "terminal", "shell", "console", "command line"],
  ["backup", "restore point", "snapshot"],
  ["ram", "memory", "system memory"],
  ["cpu", "processor"],
  ["psu", "power supply"],
  ["firewall", "packet filter", "block", "filter"],
  ["subnet", "subnetwork"],
  ["gateway", "default gateway", "router"],
  ["latency", "delay", "round trip time"],
  ["log", "event log", "audit trail"],
  ["phishing", "email scam"],
  ["malware", "malicious software"],
  ["driver", "device driver"],
  ["virtual machine", "vm", "guest"],
  ["dns", "name resolution", "domain name", "resolve", "resolution", "lookup"],
  ["dhcp", "address assignment", "lease"],
];

const SYNONYM_OF = new Map<string, number>();
SYNONYM_GROUPS.forEach((group, index) => {
  for (const phrase of group) for (const word of tokens(phrase)) SYNONYM_OF.set(stem(word), index);
});

/** The vocabulary of technical knowledge one body of teaching material holds. */
export interface TaughtVocabulary {
  stems: Set<string>;
  groups: Set<number>;
  /** Acronyms the material itself establishes, e.g. "Domain Name System (DNS)". */
  acronyms: Map<string, string[]>;
  /** The sentences the material is made of, used for evidence quotes. */
  sentences: string[];
  /**
   * Words so widespread across the course that they carry no specific
   * technical knowledge (ordinary language, house style, framing words).
   * Only the course-wide vocabulary fills this.
   */
  general: Set<string>;
}

function emptyVocabulary(): TaughtVocabulary {
  return { stems: new Set(), groups: new Set(), acronyms: new Map(), sentences: [], general: new Set() };
}

function addText(vocabulary: TaughtVocabulary, text: string | undefined | null): void {
  if (!text) return;
  for (const word of tokens(text)) {
    const root = stem(word);
    vocabulary.stems.add(root);
    const group = SYNONYM_OF.get(root);
    if (group !== undefined) vocabulary.groups.add(group);
  }
  // Abbreviations the material establishes for itself count as taught.
  for (const match of text.matchAll(/([A-Za-z][A-Za-z0-9\s/-]{3,60}?)\s*\(([A-Z][A-Z0-9/-]{1,9})s?\)/g)) {
    const expansion = tokens(match[1] ?? "").map(stem);
    const acronym = (match[2] ?? "").toLowerCase();
    if (!acronym) continue;
    vocabulary.acronyms.set(acronym, expansion);
    vocabulary.stems.add(acronym);
  }
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const trimmed = sentence.trim();
    if (trimmed.length >= 25) vocabulary.sentences.push(trimmed);
  }
}

/** Everything a topic teaches: lesson, depth, objectives, videos, applications. */
export function topicTeachingMaterial(pack: CoursePack, topicId: string): string[] {
  const topic = pack.sections.find((section) => section.id === topicId);
  if (!topic) return [];
  const parts: string[] = [topic.title, topic.summary ?? "", ...(topic.learningObjectives ?? []), pack.lessonText(topicId)];

  const deep = pack.getDeepLesson(topicId);
  if (deep) {
    parts.push(deep.intro, deep.whereYouMeetIt);
    for (const section of deep.sections) parts.push(section.heading, ...section.paragraphs, ...(section.bullets ?? []));
    const depth = deep.depth;
    if (depth) {
      parts.push(...depth.keyIdeas, ...depth.examTraps);
      parts.push(depth.walkthrough.title, depth.walkthrough.scenario, depth.walkthrough.outcome);
      for (const step of depth.walkthrough.steps) parts.push(step.label, step.detail);
      parts.push(depth.reference.heading);
      for (const row of depth.reference.rows) parts.push(row.group ?? "", row.term, row.detail);
      for (const item of depth.misconceptions) parts.push(item.claim, item.correction);
      for (const item of depth.checkYourself) parts.push(item.question, item.answer);
    }
    if (deep.plain) {
      parts.push(deep.plain.plainIntro);
      for (const entry of deep.plain.wordList) parts.push(entry.term, entry.plain);
    }
  }

  // Applications count as teaching: worked practice, recall and the scenario.
  for (const activity of pack.getPracticeActivities(topicId)) {
    parts.push(activity.title, activity.prompt, activity.explanation, ...activity.choices);
  }
  // Recall explanations teach; the accepted answers are left out so a recall
  // question can never prove its own coverage.
  for (const recall of pack.getRecallQuestions(topicId)) parts.push(recall.explanation);
  const scenario = pack.getRealWorldScenario(topicId);
  if (scenario) parts.push(scenario.title, scenario.situation, scenario.decisionPrompt, scenario.guidance, ...scenario.expectedConcepts);

  for (const video of pack.resources.videos[topicId] ?? []) parts.push(video.title, video.description, video.objective);
  const reading = pack.resources.reading[topicId];
  if (reading) parts.push(reading.title, reading.provider);

  return parts.filter((part): part is string => Boolean(part && part.trim()));
}

/** Vocabulary for a topic plus every prerequisite that leads to it. */
export function taughtVocabulary(pack: CoursePack, topicId: string): TaughtVocabulary {
  const vocabulary = emptyVocabulary();
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (seen.has(id) || depth > 6) return;
    seen.add(id);
    for (const part of topicTeachingMaterial(pack, id)) addText(vocabulary, part);
    const topic = pack.sections.find((section) => section.id === id);
    for (const prerequisite of topic?.prerequisiteTopicIds ?? []) walk(prerequisite, depth + 1);
  };
  walk(topicId, 0);
  return vocabulary;
}

/** Vocabulary of everything the whole course teaches, in any topic. */
export function courseVocabulary(pack: CoursePack): TaughtVocabulary {
  const vocabulary = emptyVocabulary();
  const seenIn = new Map<string, number>();
  for (const section of pack.sections) {
    const here = new Set<string>();
    for (const part of topicTeachingMaterial(pack, section.id)) {
      addText(vocabulary, part);
      for (const word of tokens(part)) here.add(stem(word));
    }
    for (const word of here) seenIn.set(word, (seenIn.get(word) ?? 0) + 1);
  }
  // A word used by most of the course teaches nothing specific: it is ordinary
  // language, not knowledge a single question can be said to require.
  const threshold = Math.max(4, Math.ceil(pack.sections.length * 0.45));
  for (const [word, count] of seenIn) if (count >= threshold) vocabulary.general.add(word);
  return vocabulary;
}

/**
 * The technical knowledge a question requires: the prompt and the knowledge
 * needed to pick the right answer, with ordinary question language removed.
 */
export function requiredKnowledge(prompt: string, answers: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const raw = `${prompt} ${answers.join(" ")}`;
  const original = raw.split(/\s+/);
  for (const piece of original) {
    const bare = piece.replace(/[^A-Za-z0-9/.\-_]/g, "").replace(/^[.\-_]+|[.\-_]+$/g, "");
    if (!bare) continue;
    const lower = bare.toLowerCase();
    // Quantities ("250w", "1000", "8gb") are arithmetic in the question, not
    // knowledge the lesson has to name.
    if (/^\d+[a-z]{0,3}$/.test(lower)) continue;
    // Command switches ("/scannow", "-la") belong to the command they follow;
    // the command itself carries the knowledge.
    if (/^[/\\-]/.test(bare)) continue;
    const isAcronym = /^[A-Z0-9/.-]{2,8}$/.test(bare) && /[A-Z]/.test(bare);
    const isCommandish = /[/\\._-]/.test(bare) && bare.length >= 3;
    if (!isAcronym && !isCommandish) {
      if (lower.length < 5) continue;
      if (QUESTION_LANGUAGE.has(lower)) continue;
      if (QUESTION_LANGUAGE.has(stem(lower))) continue;
    }

    const key = isAcronym || isCommandish ? lower : stem(lower);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function isCovered(term: string, vocabulary: TaughtVocabulary): boolean {
  if (vocabulary.stems.has(term)) return true;
  const group = SYNONYM_OF.get(term);
  if (group !== undefined && vocabulary.groups.has(group)) return true;
  // An acronym counts as taught when its expansion was taught, and the other way round.
  const expansion = vocabulary.acronyms.get(term);
  if (expansion && expansion.every((word) => vocabulary.stems.has(word))) return true;
  for (const [acronym, words] of vocabulary.acronyms) {
    if (words.includes(term) && vocabulary.stems.has(acronym)) return true;
  }
  // Compound wording such as "sub-net" or "command/prompt".
  const pieces = term.split(/[/._-]+/).filter((piece) => piece.length >= 4);
  if (pieces.length > 1 && pieces.every((piece) => vocabulary.stems.has(stem(piece)))) return true;
  return false;
}

function evidenceFor(terms: string[], vocabulary: TaughtVocabulary): string[] {
  const quotes: string[] = [];
  for (const sentence of vocabulary.sentences) {
    const words = new Set(tokens(sentence).map(stem));
    const hits = terms.filter((term) => words.has(term)).length;
    if (hits >= 2) quotes.push(sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence);
    if (quotes.length === 2) break;
  }
  return quotes;
}

export interface ClassifyOptions {
  topic: TaughtVocabulary;
  course: TaughtVocabulary;
  /** Words the topic's own objectives or title promise to teach. */
  objectiveTerms?: Set<string>;
  /** Ordinary course-wide language to ignore; defaults to the course's own. */
  generalTerms?: Set<string>;
}

export interface Classification {
  verdict: CoverageVerdict;
  required: string[];
  taught: string[];
  missing: string[];
  /** Missing knowledge the course does not teach anywhere. */
  missingEverywhere: string[];
  evidence: string[];
  reason: string;
  remediation: string;
}

/** Judge one question against what its topic and prerequisites taught. */
export function classifyCoverage(prompt: string, answers: string[], options: ClassifyOptions): Classification {
  const general = options.generalTerms ?? options.course.general;
  const required = requiredKnowledge(prompt, answers).filter((term) => !general.has(term));
  const taught = required.filter((term) => isCovered(term, options.topic));
  const missing = required.filter((term) => !taught.includes(term));
  const missingEverywhere = missing.filter((term) => !isCovered(term, options.course));
  const evidence = evidenceFor(taught, options.topic);
  const coverage = required.length === 0 ? 1 : taught.length / required.length;

  if (required.length === 0 || missing.length === 0) {
    return {
      verdict: "pass",
      required,
      taught,
      missing,
      missingEverywhere,
      evidence,
      reason:
        required.length === 0
          ? "The question uses no technical knowledge beyond ordinary reasoning."
          : "Every concept the question needs is taught in this topic or a prerequisite.",
      remediation: "None. Keep the question as written, including its different wording.",
    };
  }

  const belongsInLesson = missing.some((term) => options.objectiveTerms?.has(term));
  let verdict: CoverageVerdict;
  if (missingEverywhere.length === 0) {
    // Taught somewhere in the course, just not here: worth a look, never a block.
    verdict = "review";
  } else if (coverage >= 0.5) {
    // Most of what the question needs was taught; the odd unmatched word is
    // wording, not untaught knowledge.
    verdict = "review";
  } else {
    verdict = "fail";
  }

  const reason =
    verdict === "review"
      ? missingEverywhere.length === 0
        ? `Taught elsewhere in the course but not in this topic: ${missing.join(", ")}.`
        : `Coverage is indirect; a beginner may have to infer: ${missing.join(", ")}.`
      : `This topic never teaches: ${missingEverywhere.join(", ")}.`;

  const remediation = belongsInLesson
    ? "The topic's own objectives promise this. Teach it properly in the lesson — never add filler wording to satisfy the check."
    : verdict === "review"
      ? "Either add a prerequisite link to the topic that teaches it, or say it plainly once in this lesson."
      : "The question asks for out-of-scope knowledge. Move it to the topic that teaches it, or replace the question.";

  return { verdict, required, taught, missing, missingEverywhere, evidence, reason, remediation };
}

/** Every question in a topic, judged. */
export function topicCoverage(pack: CoursePack, topicId: string, course: TaughtVocabulary): CoverageFinding[] {
  const topic = pack.sections.find((section) => section.id === topicId);
  if (!topic) return [];
  const vocabulary = taughtVocabulary(pack, topicId);
  const objectiveTerms = new Set(
    requiredKnowledge([topic.title, ...(topic.learningObjectives ?? [])].join(" ")),
  );
  const options: ClassifyOptions = { topic: vocabulary, course, objectiveTerms };
  const findings: CoverageFinding[] = [];

  const push = (kind: CoverageFinding["kind"], id: string, prompt: string, answers: string[]) => {
    const result = classifyCoverage(prompt, answers, options);
    findings.push({
      topicId,
      topicTitle: topic.title,
      kind,
      questionId: id,
      prompt,
      verdict: result.verdict,
      requiredKnowledge: result.required,
      taughtKnowledge: result.taught,
      missingKnowledge: result.missing,
      missingEverywhere: result.missingEverywhere,
      lessonEvidence: result.evidence,
      reason: result.reason,
      remediation: result.remediation,
    });
  };

  for (const question of pack.sectionQuestionPool(topicId) as Question[]) {
    push("quiz", question.id, question.prompt, [...(question.correctAnswer ?? []), ...(question.acceptableAnswers ?? [])]);
  }
  const checks = pack.getDeepLesson(topicId)?.depth?.checkYourself ?? [];
  checks.forEach((check, index) => push("self-check", `${topicId}:check:${index + 1}`, check.question, [check.answer]));
  for (const recall of pack.getRecallQuestions(topicId)) {
    push("recall", recall.id, recall.prompt, recall.acceptedConcepts);
  }

  return findings;
}

export interface CoverageReport {
  findings: CoverageFinding[];
  pass: number;
  review: number;
  fail: number;
}

/** The whole course, judged. Only REVIEW and FAIL findings are kept. */
export function courseCoverage(pack: CoursePack): CoverageReport {
  const course = courseVocabulary(pack);
  const findings: CoverageFinding[] = [];
  let pass = 0;
  let review = 0;
  let fail = 0;
  for (const section of pack.sections) {
    for (const finding of topicCoverage(pack, section.id, course)) {
      if (finding.verdict === "pass") pass += 1;
      else {
        if (finding.verdict === "review") review += 1;
        else fail += 1;
        findings.push(finding);
      }
    }
  }
  return { findings, pass, review, fail };
}

/** Findings as a spreadsheet the owner can work through. */
export function coverageCsv(findings: CoverageFinding[]): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    [
      "Verdict",
      "Topic",
      "Topic id",
      "Where",
      "Question id",
      "Question",
      "Knowledge required",
      "Not taught here",
      "Not taught anywhere",
      "Lesson evidence",
      "Why flagged",
      "What to do",
    ],
    ...findings.map((finding) => [
      finding.verdict.toUpperCase(),
      finding.topicTitle,
      finding.topicId,
      finding.kind,
      finding.questionId,
      finding.prompt,
      finding.requiredKnowledge.join(" "),
      finding.missingKnowledge.join(" "),
      finding.missingEverywhere.join(" "),
      finding.lessonEvidence.join(" | "),
      finding.reason,
      finding.remediation,
    ]),
  ];
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
