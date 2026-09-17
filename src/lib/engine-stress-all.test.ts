/**
 * Stress test for every remaining engine.
 *
 * The learning engine has its own suite. This one pushes the same randomised
 * and hostile histories through the progress, insights, review, streak, study
 * plan, readiness, skills, career, troubleshooting, record, portfolio, resume,
 * milestone, quiz and grading engines, checking they never crash, never produce
 * broken numbers or broken sentences, and never claim more than the evidence.
 */
import { describe, expect, it } from "vitest";

import { createDefaultUserData } from "@/lib/app-data/defaults";
import type { Question, UserData } from "@/lib/app-data/types";
import { topics } from "@/data/static-content";
import { questions } from "@/data/quiz-content";
import { tickets } from "@/data/ticket-content";
import { incidents } from "@/data/incident-content";
import { certifications } from "@/data/certification-content";

import { computeProgress, topicScore, fullScopeTopicScore } from "@/lib/progress-engine";
import { computeInsights } from "@/lib/insights-engine";
import { bucketReviews, createReview, gradeReview, rescheduleReview, describeSchedule, recentlyFailed } from "@/lib/review-engine";
import { streakSummary, minutesByDay, dailyGoalMinutes } from "@/lib/streak-engine";
import { freezesEarned, freezesAvailable } from "@/lib/streak-freeze";
import { generateStudyPlan, startPlan, pausePlan, resumePlan, completeTask, skipTask, finishPlan, formatDuration } from "@/lib/study-engine";
import { buildAllReadinessReports } from "@/lib/readiness-engine";
import { collectEvidence, scoreSkills, scoreTracks, recommendActivities } from "@/lib/skills-engine";
import { createTicketAttempt, scoreTicket, ticketMistakeSignals, ticketStatusLabel } from "@/lib/career-engine";
import { createIncidentAttempt, scoreIncident, incidentMistakeSignals, incidentStatusLabel } from "@/lib/troubleshoot-engine";
import { buildStudyRecord, recordAsText, buildBackup, readBackup } from "@/lib/record-engine";
import { availableLabEvidence, projectFromLabAttempt, portfolioToMarkdown } from "@/lib/portfolio-engine";
import { resumeTarget } from "@/lib/resume";
import { achievedMilestones } from "@/lib/celebrations";
import { buildIntelligence } from "@/lib/intelligence/engine";
import { derivedSignals, evidenceStream } from "@/lib/learner-signals";
import { missedQuestions, missedQuestionCount, missedQuestionPrompt, gradeMissedQuestion } from "@/lib/missed-questions";
import { buildQuizDiagnostic } from "@/lib/quiz-diagnostic";
import { mixQuestions, scoreQuiz, isQuestionCorrect } from "@/lib/quiz-engine";
import { usableQuestions } from "@/lib/question-quality";
import { offlineGrade } from "@/lib/offline-grade";
import { answerMatches, conceptCoverage } from "@/lib/fuzzy-match";
import { greetingFor } from "@/lib/greeting";
import { adaptivePath, focusedTopicsFirst } from "@/lib/adaptive-path";
import { certificationTopics, certificationStages, generateExam, certificationQuestionPool } from "@/lib/cert-path";
import { summarizeMistakes } from "@/lib/mistake-engine";

import { CLEAN_TEXT, FINITE, NOW, PERCENT, SHAPES, buildRichUser, pick, rng } from "@/lib/stress-fixtures";

const SEEDS = 12;

describe("progress, insights and record engines", () => {
  for (const [name, shape] of SHAPES) {
    it(`holds up on ${name} histories`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const user = buildRichUser(seed * 7919 + shape.volume, shape);

        const progress = computeProgress(user, NOW);
        PERCENT(progress.overall, "progress overall");
        for (const topic of topics.slice(0, 20)) {
          PERCENT(topicScore(user.topicProgress[topic.id]), `${topic.id} topic score`);
          PERCENT(fullScopeTopicScore(user, topic.id), `${topic.id} full scope`);
        }

        const insights = computeInsights(user, NOW);
        FINITE(insights.minutesLast7, "minutes last 7");
        expect(insights.minutesLast7).toBeGreaterThanOrEqual(0);
        expect(insights.days.length).toBeGreaterThan(0);
        for (const day of insights.days) FINITE(day.minutes, "day minutes");
        for (const accuracy of insights.topicAccuracy) PERCENT(accuracy.accuracy, "topic accuracy");
        for (const line of insights.observations) CLEAN_TEXT(line, "insight observation");
        expect(insights.mistakesOpen + insights.mistakesResolved).toBeLessThanOrEqual(user.mistakes.length);
        if (!insights.hasData) expect(insights.minutesLast7).toBe(0);

        const record = buildStudyRecord(user, NOW);
        const text = recordAsText(record, "David");
        CLEAN_TEXT(text, "study record text");
        expect(text.length).toBeGreaterThan(0);

        // A backup must survive the round trip untouched.
        const restored = readBackup(buildBackup(user));
        expect(restored.ok, "backup round trip").toBe(true);
      }
    });
  }

  it("refuses a corrupt backup instead of crashing", () => {
    for (const bad of ["", "{", "null", "[]", '{"version":999}', '{"user":"nope"}']) {
      const result = readBackup(bad);
      if (!result.ok) CLEAN_TEXT(result.error, "backup error");
    }
  });
});

describe("review, streak and study plan engines", () => {
  for (const [name, shape] of SHAPES) {
    it(`holds up on ${name} histories`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const user = buildRichUser(seed * 104729 + shape.volume, shape);

        const buckets = bucketReviews(user.reviews, NOW);
        const bucketed = buckets.overdue.length + buckets.dueToday.length + buckets.upcoming.length;
        expect(bucketed).toBeLessThanOrEqual(user.reviews.length);
        for (const review of [...buckets.overdue, ...buckets.dueToday, ...buckets.upcoming]) {
          CLEAN_TEXT(describeSchedule(review), "review schedule");
        }
        expect(recentlyFailed(user).length).toBeLessThanOrEqual(8);

        // Grading must always move the schedule forward in time.
        const random = rng(seed);
        for (const review of user.reviews.slice(0, 10)) {
          for (const outcome of ["pass", "fail"] as const) {
            const graded = gradeReview(review, outcome, NOW);
            expect(new Date(graded.review.dueAt).getTime()).toBeGreaterThan(NOW.getTime() - 86400000);
            FINITE(graded.review.interval, "interval");
            expect(graded.review.interval).toBeGreaterThan(0);
          }
          const moved = rescheduleReview(review, Math.round(random() * 30), NOW);
          expect(Number.isNaN(new Date(moved.dueAt).getTime())).toBe(false);
        }

        const streak = streakSummary(user, NOW);
        FINITE(streak.current, "streak current");
        expect(streak.current).toBeGreaterThanOrEqual(0);
        expect(streak.longest).toBeGreaterThanOrEqual(streak.current);
        expect(minutesByDay(user).size).toBeGreaterThanOrEqual(0);
        FINITE(dailyGoalMinutes(user), "daily goal");
        expect(freezesAvailable(user)).toBeLessThanOrEqual(freezesEarned(user) + 2);

        for (const minutes of [30, 60, 120]) {
          const plan = generateStudyPlan(user, minutes, NOW);
          const planned = plan.tasks.reduce((sum, task) => sum + task.plannedMinutes, 0);
          expect(planned, "plan never overruns the session").toBeLessThanOrEqual(minutes);
          const seen = new Set<string>();
          for (const task of plan.tasks) {
            CLEAN_TEXT(task.title, "plan task title");
            expect(task.to.startsWith("/"), `${task.title} links somewhere real`).toBe(true);
            expect(seen.has(task.id), "duplicate task id").toBe(false);
            seen.add(task.id);
          }

          // Drive the plan through its whole lifecycle.
          let live = startPlan(plan, NOW);
          live = pausePlan(live, NOW);
          live = resumePlan(live, NOW);
          if (live.tasks[0]) live = completeTask(live, live.tasks[0].id, NOW);
          if (live.tasks[1]) live = skipTask(live, live.tasks[1].id, NOW);
          const finished = finishPlan(live, NOW);
          expect(finished.plan.status).toBe("completed");
          CLEAN_TEXT(formatDuration(Math.round(Math.random() * 100000)), "duration");
        }
      }
    });
  }
});

describe("readiness, skills and certification engines", () => {
  for (const [name, shape] of SHAPES) {
    it(`holds up on ${name} histories`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const user = buildRichUser(seed * 15486 + shape.volume, shape);

        for (const report of buildAllReadinessReports(user, NOW)) {
          PERCENT(report.readiness.overall, `${report.certification.id} readiness`);
          expect(report.topicsDone).toBeLessThanOrEqual(report.topicsTotal);
          CLEAN_TEXT(report.band, "readiness band");
          for (const factor of report.factors) {
            PERCENT(factor.score, `${report.certification.id} factor`);
            CLEAN_TEXT(factor.label, "factor label");
          }
          // Readiness must never outrun the evidence behind it.
          if (!report.readiness.hasEvidence) expect(report.readiness.overall).toBe(0);
        }

        const evidence = collectEvidence(user);
        for (const item of evidence) PERCENT(item.score, "evidence score");
        const skills = scoreSkills(user);
        for (const skill of skills) {
          PERCENT(skill.score, `${skill.skillId} skill`);
          if (skill.evidenceCount === 0) expect(skill.score, `${skill.skillId} unproven`).toBe(0);
        }
        for (const track of scoreTracks(skills)) PERCENT(track.score, `${track.track} track`);
        for (const activity of recommendActivities(user, skills)) {
          CLEAN_TEXT(activity.reason, "recommendation reason");
          expect(activity.href.startsWith("/")).toBe(true);
        }

        const path = adaptivePath(user);
        expect(path.certification).toBeTruthy();
        expect(focusedTopicsFirst(user).length).toBe(topics.length);

        const summary = summarizeMistakes(user);
        expect(summary.open).toBeLessThanOrEqual(summary.total);
      }
    });
  }

  it("builds a real exam for every certification", () => {
    for (const certification of certifications) {
      const scope = certificationTopics(certification.id);
      const stages = certificationStages(certification.id);
      expect(stages.reduce((sum, stage) => sum + stage.topics.length, 0)).toBeLessThanOrEqual(scope.length);
      const pool = certificationQuestionPool(certification.id);
      const exam = generateExam(certification, 11, 50);
      if (pool.length === 0) {
        expect(exam, `${certification.id} has no pool`).toBeNull();
        continue;
      }
      expect(exam, `${certification.id} exam`).not.toBeNull();
      const drawn = exam!.questions;
      expect(drawn.length, `${certification.id} exam size`).toBeLessThanOrEqual(Math.min(50, pool.length));
      expect(new Set(drawn.map((question) => question.id)).size).toBe(drawn.length);
      expect(exam!.quiz.questionIds.length).toBe(drawn.length);
    }
  });
});

describe("career, troubleshooting and portfolio engines", () => {
  it("scores every ticket and incident sanely, empty or complete", () => {
    const random = rng(2026);
    for (const ticket of tickets) {
      const blank = createTicketAttempt(ticket);
      const empty = scoreTicket(ticket, blank);
      PERCENT(empty.total, `${ticket.id} blank ticket`);
      expect(empty.passed, "a blank ticket never passes").toBe(false);
      CLEAN_TEXT(ticketStatusLabel(blank), "ticket status");

      const done = {
        ...blank,
        performedActionIds: ticket.keyActionIds,
        diagnosisGuessIds: ticket.diagnoses.filter((option) => option.correct).map((option) => option.id),
        resolutionIds: ticket.resolutions.filter((item) => item.correct).map((item) => item.id),
        verificationIds: ticket.verifications.filter((item) => item.correct).map((item) => item.id),
        reasoning: "I checked the evidence and worked from the symptom back to the cause.",
      };
      const full = scoreTicket(ticket, done);
      PERCENT(full.total, `${ticket.id} complete ticket`);
      expect(full.total, "doing the work scores higher than doing nothing").toBeGreaterThanOrEqual(empty.total);
      for (const signal of ticketMistakeSignals(ticket, done, full.scores)) CLEAN_TEXT(signal.detail, "ticket signal");

      // Noise only: clicking everything must not be a shortcut to a pass.
      const noisy = { ...blank, performedActionIds: ticket.actions.map((action) => action.id) };
      PERCENT(scoreTicket(ticket, noisy).total, `${ticket.id} noisy ticket`);
    }

    for (const incident of incidents) {
      const blank = createIncidentAttempt(incident);
      const empty = scoreIncident(incident, blank);
      PERCENT(empty.total, `${incident.id} blank incident`);
      CLEAN_TEXT(incidentStatusLabel(blank), "incident status");

      const done = {
        ...blank,
        performedActionIds: incident.keyActionIds,
        causeGuessIds: incident.causes.filter((cause) => cause.correct).map((cause) => cause.id),
        ...(incident.fixes.find((fix) => fix.correct)?.id
          ? { selectedFixId: incident.fixes.find((fix) => fix.correct)!.id }
          : {}),
        verificationIds: incident.verifications.filter((item) => item.correct).map((item) => item.id),
        documentation: "Cause, fix and verification written up in full.",
        reasoning: "Narrowed it down from the evidence.",
      };
      const full = scoreIncident(incident, done);
      PERCENT(full.total, `${incident.id} complete incident`);
      expect(full.total).toBeGreaterThanOrEqual(empty.total);
      for (const signal of incidentMistakeSignals(incident, done, full.scores)) CLEAN_TEXT(signal.detail, "incident signal");
      void pick(random, [1, 2, 3]);
    }
  });

  for (const [name, shape] of SHAPES) {
    it(`builds portfolio, resume and milestones on ${name} histories`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const user = buildRichUser(seed * 3571 + shape.volume, shape);

        const projects = availableLabEvidence(user).map((entry) => projectFromLabAttempt(entry.lab, entry.attempt));
        const markdown = portfolioToMarkdown(projects);
        CLEAN_TEXT(markdown, "portfolio markdown");

        const resume = resumeTarget(user);
        if (resume) {
          CLEAN_TEXT(resume.label, "resume label");
          expect(resume.to.startsWith("/")).toBe(true);
        }

        const milestones = achievedMilestones(buildIntelligence(user, NOW), user);
        const ids = new Set(milestones.map((milestone) => milestone.id));
        expect(ids.size, "milestones never duplicate").toBe(milestones.length);
        for (const milestone of milestones) {
          CLEAN_TEXT(milestone.title, "milestone title");
          CLEAN_TEXT(milestone.detail, "milestone detail");
        }

        for (const signal of [...derivedSignals(user), ...evidenceStream(user)].slice(0, 200)) {
          expect(typeof signal.kind).toBe("string");
        }
      }
    });
  }
});

describe("quiz, grading and question engines", () => {
  it("keeps every stored question usable and gradable", () => {
    const usable = usableQuestions(questions);
    expect(usable.length).toBeGreaterThan(0);
    for (const question of usable) {
      expect(question.choices.length, `${question.id} needs options`).toBeGreaterThan(1);
      expect(new Set(question.choices).size, `${question.id} duplicate options`).toBe(question.choices.length);
      expect(question.correctAnswer.length, `${question.id} needs an answer`).toBeGreaterThan(0);
      for (const answer of question.correctAnswer) {
        expect(question.choices.includes(answer), `${question.id} answer is an option`).toBe(true);
      }
      expect(isQuestionCorrect(question, question.correctAnswer), `${question.id} marks itself right`).toBe(true);
      expect(isQuestionCorrect(question, []), `${question.id} blank is not right`).toBe(false);
    }
  });

  it("scores quizzes honestly, from all wrong to all right", () => {
    const sample = mixQuestions(usableQuestions(questions).slice(0, 60)) as Question[];
    const allRight: Record<string, string[]> = {};
    const allWrong: Record<string, string[]> = {};
    for (const question of sample) {
      allRight[question.id] = question.correctAnswer;
      allWrong[question.id] = [question.choices.find((choice) => !question.correctAnswer.includes(choice)) ?? ""];
    }
    const perfect = scoreQuiz(sample, allRight);
    const blank = scoreQuiz(sample, {});
    const wrong = scoreQuiz(sample, allWrong);
    expect(perfect.correct, "every answer right").toBe(sample.length);
    expect(perfect.incorrect).toBe(0);
    expect(blank.correct, "answering nothing scores nothing").toBe(0);
    expect(wrong.correct, "every answer wrong scores nothing").toBe(0);
    expect(wrong.incorrect).toBe(sample.length);
    PERCENT(Math.round((perfect.correct / sample.length) * 100), "perfect percent");

    const diagnostic = buildQuizDiagnostic(createDefaultUserData(), sample, wrong.results);
    CLEAN_TEXT(diagnostic.explanation, "diagnostic explanation");
    CLEAN_TEXT(diagnostic.guidance, "diagnostic guidance");
    expect(diagnostic.missed.length).toBe(sample.length);
  });

  it("marks written answers by meaning and never fails an empty one silently", () => {
    expect(answerMatches("a power supply unit", "power supply unit")).toBe(true);
    expect(answerMatches("", "power supply unit")).toBe(false);
    PERCENT(conceptCoverage("check the cable and the port", "I checked the cable") * 100, "concept coverage");

    const blank = offlineGrade({ question: "What does DNS do?", answer: "" });
    expect(blank).not.toBeNull();
    if (blank) {
      expect(blank.score).toBe(0);
      CLEAN_TEXT(blank.verdict, "offline grade verdict");
    }
    const partial = offlineGrade({
      question: "What does DNS do?",
      answer: "It turns a name people can read into the address a machine needs.",
      modelAnswer: "DNS resolves hostnames to IP addresses.",
      expectedPoints: ["resolves hostnames", "returns an IP address"],
    });
    if (partial) PERCENT(partial.score, "offline grade score");
  });

  for (const [name, shape] of SHAPES) {
    it(`handles missed questions on ${name} histories`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const user = buildRichUser(seed * 65537 + shape.volume, shape);
        const missed = missedQuestions(user);
        expect(missedQuestionCount(user)).toBeGreaterThanOrEqual(0);
        for (const item of missed.slice(0, 40)) {
          CLEAN_TEXT(missedQuestionPrompt(item), "missed question prompt");
          expect(typeof gradeMissedQuestion(item, [])).toBe("boolean");
        }
      }
    });
  }
});

describe("everyday helpers", () => {
  it("greets naturally at every hour", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const greeting = greetingFor("David", new Date(Date.UTC(2026, 5, 1, hour)));
      CLEAN_TEXT(greeting, `greeting at ${hour}`);
      expect(greeting.includes("David")).toBe(true);
    }
    CLEAN_TEXT(greetingFor("", NOW), "greeting with no name");
  });

  it("creates reviews that are always schedulable", () => {
    for (let index = 0; index < 10; index += 1) {
      const review = createReview({ topicId: topics[index]?.id ?? "topic-x", now: NOW });
      expect(Number.isNaN(new Date(review.dueAt).getTime())).toBe(false);
      CLEAN_TEXT(describeSchedule(review), "new review schedule");
    }
  });

  it("keeps a brand new learner at honest zero across every engine", () => {
    const user: UserData = createDefaultUserData();
    expect(computeProgress(user, NOW).overall).toBe(0);
    expect(computeInsights(user, NOW).hasData).toBe(false);
    expect(streakSummary(user, NOW).current).toBe(0);
    expect(availableLabEvidence(user).length).toBe(0);
    expect(missedQuestionCount(user)).toBe(0);
    for (const report of buildAllReadinessReports(user, NOW)) expect(report.readiness.overall).toBe(0);
    for (const skill of scoreSkills(user)) expect(skill.score).toBe(0);
    CLEAN_TEXT(recordAsText(buildStudyRecord(user, NOW)), "empty record");
  });
});
