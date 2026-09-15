/** Seed shape for the additional practice questions on each topic. */
export interface PracticeSeed {
  /** Topic slug, without the "topic-" prefix. */
  slug: string;
  title: string;
  prompt: string;
  choices: string[];
  /** Index of the correct choice in `choices`. */
  answerIndex: number;
  explanation: string;
}
