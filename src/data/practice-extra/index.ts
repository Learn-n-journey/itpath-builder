/**
 * Additional practice questions.
 *
 * The original curriculum carried one practice activity per topic. These seeds
 * add several more per topic, using the same shape so every engine that counts
 * practice work picks them up without special cases.
 */
import type { PracticeActivity } from "@/lib/app-data/types";

import { advanced_securityPractice } from "./advanced-security";
import { foundationPractice } from "./foundation";
import { fundamentals_aplusPractice } from "./fundamentals-aplus";
import { linux_servers_cloudPractice } from "./linux-servers-cloud";
import { network_securityPractice } from "./network-security";
import type { PracticeSeed } from "./types";

const seeds: PracticeSeed[] = [
  ...foundationPractice,
  ...fundamentals_aplusPractice,
  ...network_securityPractice,
  ...linux_servers_cloudPractice,
  ...advanced_securityPractice,
];

const perTopic = new Map<string, number>();

export const extraPracticeActivities: PracticeActivity[] = seeds.map((seed) => {
  const next = (perTopic.get(seed.slug) ?? 0) + 1;
  perTopic.set(seed.slug, next);
  return {
    id: `practice-${seed.slug}-x${next}`,
    topicId: `topic-${seed.slug}`,
    title: seed.title,
    prompt: seed.prompt,
    choices: seed.choices,
    answerIndex: seed.answerIndex,
    explanation: seed.explanation,
  };
});

