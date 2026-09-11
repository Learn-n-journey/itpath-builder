/** Expanded 24-month curriculum: seeds plus derived entities. */
import { fundamentalsAndAPlusSeeds } from "./phase-fundamentals-aplus";
import { networkAndSecuritySeeds } from "./phase-network-security";
import { linuxServersCloudSeeds } from "./phase-linux-servers-cloud";
import { advancedSecuritySeeds } from "./phase-advanced-security";
import {
  seedLessons,
  seedModules,
  seedPractice,
  seedRecall,
  seedScenarios,
  seedTopics,
  type TopicSeed,
} from "./builder";

export const expansionSeeds: TopicSeed[] = [
  ...fundamentalsAndAPlusSeeds,
  ...networkAndSecuritySeeds,
  ...linuxServersCloudSeeds,
  ...advancedSecuritySeeds,
];

export const expansionTopics = seedTopics(expansionSeeds);
export const expansionLessons = seedLessons(expansionSeeds);
export const expansionModules = seedModules(expansionSeeds);
export const expansionRecall = seedRecall(expansionSeeds);
export const expansionPractice = seedPractice(expansionSeeds);
export const expansionScenarios = seedScenarios(expansionSeeds);
