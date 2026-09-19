/**
 * Deliberate sabotage, written down.
 *
 * Each injection damages a copy of a healthy subject in one specific way a
 * careless or over-confident writer would. None of them mention a field, a
 * certificate or a technology: they work on the shapes every subject shares,
 * so the same list pushes against IT, auto repair, and whatever comes next.
 */
import type { DomainPackage } from "@/domain/package";
import type { Injection } from "./types";

export function clone(pkg: DomainPackage): DomainPackage {
  return structuredClone(pkg);
}

const firstSection = (pkg: DomainPackage) => pkg.sections[0];
const firstLesson = (pkg: DomainPackage) => pkg.lessons[0];
const choiceQuestions = (pkg: DomainPackage) => pkg.questions.filter((q) => q.kind !== "recall" && q.choices.length >= 2);

export const injections: Injection[] = [
  // --- Incorrect or misleading technical facts -----------------------------
  {
    id: "inj-fact-arithmetic",
    category: "wrong-facts",
    description: "A lesson states arithmetic that does not hold.",
    apply: (source) => {
      const pkg = clone(source);
      const lesson = firstLesson(pkg);
      if (lesson) lesson.body = `${lesson.body}\n\nRemember the rule of thumb: 20% of 50 is 15, so plan the work around that figure.`;
      return pkg;
    },
  },
  {
    id: "inj-fact-units",
    category: "wrong-facts",
    description: "A question explanation mixes up two families of units.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[0];
      if (question) question.explanation = `${question.explanation} For reference, 1 GB = 1024 MB when sizing the job.`;
      return pkg;
    },
  },

  // --- Duplicate questions -------------------------------------------------
  {
    id: "inj-duplicate-question",
    category: "duplicate-questions",
    description: "The same question is asked twice under two ids.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[0];
      if (question) pkg.questions.push({ ...structuredClone(question), id: `${question.id}-copy` });
      pkg.manifest.scope.questions = pkg.questions.length;
      return pkg;
    },
  },

  // --- Invalid questions ---------------------------------------------------
  {
    id: "inj-question-two-options",
    category: "invalid-questions",
    description: "A multiple choice question is left with only two options.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[0];
      if (question) {
        question.choices = question.choices.slice(0, 2);
        question.answerIndex = 0;
      }
      return pkg;
    },
  },
  {
    id: "inj-question-throwaway-options",
    category: "invalid-questions",
    description: "Wrong options are replaced with meaningless filler.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[1] ?? choiceQuestions(pkg)[0];
      if (question) {
        const answer = question.choices[question.answerIndex] ?? "";
        question.choices = [answer, "None of the above", "All of the above", "N/A"];
        question.answerIndex = 0;
      }
      return pkg;
    },
  },
  {
    id: "inj-question-not-a-question",
    category: "invalid-questions",
    description: "A prompt is replaced with a fragment that asks nothing.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[2] ?? choiceQuestions(pkg)[0];
      if (question) question.prompt = "General background information about the topic covered above";
      return pkg;
    },
  },

  // --- Wrong answer index / multiple correct answers -----------------------
  {
    id: "inj-answer-out-of-range",
    category: "answer-key",
    description: "The marked answer points outside the list of options.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[0];
      if (question) question.answerIndex = question.choices.length + 3;
      return pkg;
    },
  },
  {
    id: "inj-answer-two-correct",
    category: "answer-key",
    description: "Two options say exactly the same thing, so two answers are correct.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[1] ?? choiceQuestions(pkg)[0];
      if (question) {
        const answer = question.choices[question.answerIndex] ?? "";
        question.choices = question.choices.map((choice, index) => (index === (question.answerIndex + 1) % question.choices.length ? answer : choice));
      }
      return pkg;
    },
  },

  // --- Missing or circular prerequisites -----------------------------------
  {
    id: "inj-prerequisite-missing",
    category: "prerequisites",
    description: "A section requires something that is not in the subject.",
    apply: (source) => {
      const pkg = clone(source);
      const section = firstSection(pkg);
      if (section) pkg.prerequisites.push({ sectionId: section.id, requiresSectionId: `${pkg.definition.id}:section:does-not-exist` });
      return pkg;
    },
  },
  {
    id: "inj-prerequisite-self",
    category: "prerequisites",
    description: "A section is made a prerequisite of itself.",
    apply: (source) => {
      const pkg = clone(source);
      const section = firstSection(pkg);
      if (section) pkg.prerequisites.push({ sectionId: section.id, requiresSectionId: section.id });
      return pkg;
    },
  },
  {
    id: "inj-prerequisite-cycle",
    category: "prerequisites",
    description: "Two sections require each other, so neither can ever be started.",
    apply: (source) => {
      const pkg = clone(source);
      const [a, b] = pkg.sections;
      if (a && b) {
        pkg.prerequisites.push({ sectionId: a.id, requiresSectionId: b.id });
        pkg.prerequisites.push({ sectionId: b.id, requiresSectionId: a.id });
      }
      return pkg;
    },
  },

  // --- Lessons that do not match their objectives --------------------------
  {
    id: "inj-lesson-off-objective",
    category: "objective-mismatch",
    description: "A lesson teaches something unrelated to every objective its section claims.",
    apply: (source) => {
      const pkg = clone(source);
      const lesson = firstLesson(pkg);
      if (lesson) {
        const filler =
          "Colourful kites drift above quiet harbours while distant ferries sound their horns. " +
          "Picnic blankets unfold across warm grass, children chase gulls between striped deckchairs, " +
          "and somebody sells lemonade from a painted bicycle beside the promenade railings. " +
          "Evening brings brass bands, paper lanterns, folding chairs, and slow conversations about weather.";
        lesson.body = filler;
        lesson.definition = "A seaside afternoon, described.";
        lesson.whyItMatters = "Holidays matter greatly during long summers beside cheerful harbours.";
        lesson.summary = "Kites, lemonade, lanterns, brass bands beside quiet harbours.";
        lesson.title = "Harbour afternoons";
      }
      return pkg;
    },
  },

  // --- Assessments covering material that was never taught -----------------
  {
    id: "inj-assessment-untaught-objective",
    category: "untaught-assessment",
    description: "A paper tests an objective no section teaches.",
    apply: (source) => {
      const pkg = clone(source);
      const assessment = pkg.assessments[0];
      if (assessment) assessment.objectiveIds = [...assessment.objectiveIds, `${pkg.definition.id}-objective-never-taught`];
      return pkg;
    },
  },
  {
    id: "inj-assessment-wrong-size",
    category: "untaught-assessment",
    description: "A paper declares a length the subject does not allow.",
    apply: (source) => {
      const pkg = clone(source);
      const assessment = pkg.assessments[0];
      if (assessment) assessment.questionCount = assessment.questionCount + 7;
      return pkg;
    },
  },

  // --- Empty, repetitive or filler content ---------------------------------
  {
    id: "inj-lesson-empty",
    category: "filler-content",
    description: "A lesson body is emptied out.",
    apply: (source) => {
      const pkg = clone(source);
      const lesson = firstLesson(pkg);
      if (lesson) lesson.body = "";
      return pkg;
    },
  },
  {
    id: "inj-lesson-repetitive",
    category: "filler-content",
    description: "A lesson repeats one sentence to reach a length.",
    apply: (source) => {
      const pkg = clone(source);
      const lesson = firstLesson(pkg);
      if (lesson) {
        const line = "This is an important part of the work and should be understood thoroughly. ";
        lesson.body = line.repeat(8);
      }
      return pkg;
    },
  },
  {
    id: "inj-lesson-placeholder",
    category: "filler-content",
    description: "A lesson still contains placeholder text.",
    apply: (source) => {
      const pkg = clone(source);
      const lesson = firstLesson(pkg);
      if (lesson) lesson.body = `${lesson.body}\n\nTODO: write the rest of this section. Placeholder content follows. Lorem ipsum dolor sit amet.`;
      return pkg;
    },
  },

  // --- Fake or broken sources ----------------------------------------------
  {
    id: "inj-source-placeholder-host",
    category: "broken-sources",
    description: "A reference points at a placeholder address.",
    apply: (source) => {
      const pkg = clone(source);
      const item = pkg.sources[0];
      if (item) item.url = "https://example.com/definitive-guide";
      return pkg;
    },
  },
  {
    id: "inj-source-not-a-url",
    category: "broken-sources",
    description: "A reference is not a web address at all.",
    apply: (source) => {
      const pkg = clone(source);
      const item = pkg.sources[0];
      if (item) item.url = "see the handbook, chapter four";
      return pkg;
    },
  },
  {
    id: "inj-source-unlabelled",
    category: "broken-sources",
    description: "A reference has no usable label.",
    apply: (source) => {
      const pkg = clone(source);
      const item = pkg.sources[0];
      if (item) item.label = " ";
      return pkg;
    },
  },

  // --- Schema-valid but educationally poor ---------------------------------
  {
    id: "inj-poor-but-valid-question",
    category: "schema-valid-poor",
    description: "A question is perfectly shaped but gives itself away by answer length.",
    apply: (source) => {
      const pkg = clone(source);
      const question = choiceQuestions(pkg)[0];
      if (question) {
        question.prompt = "Which statement best describes the correct approach in this situation?";
        question.choices = [
          "The correct approach is to follow the documented procedure step by step, confirming each measurement against the published specification before continuing to the next stage of the work",
          "Guess",
          "Wait",
          "Stop",
        ];
        question.answerIndex = 0;
      }
      return pkg;
    },
  },
  {
    id: "inj-poor-but-valid-lesson",
    category: "schema-valid-poor",
    description: "A lesson is long enough and well shaped but teaches nothing specific.",
    apply: (source) => {
      const pkg = clone(source);
      const lesson = pkg.lessons[1] ?? pkg.lessons[0];
      if (lesson) {
        lesson.body =
          "This area is very important. It is important to understand it properly. " +
          "Understanding it properly is important because it is important. " +
          "This area is very important. It is important to understand it properly. " +
          "Understanding it properly is important because it is important.";
      }
      return pkg;
    },
  },
];
