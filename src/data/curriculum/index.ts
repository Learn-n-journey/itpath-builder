/** Expanded 24-month curriculum: seeds plus derived entities. */
import { fundamentalsAndAPlusSeeds } from "./phase-fundamentals-aplus";
import { aPlusExtraSeeds } from "./phase-aplus-extra";
import { techExtraSeeds } from "./phase-tech-extra";
import { networkAndSecuritySeeds } from "./phase-network-security";
import { netPlusExtraSeeds } from "./phase-netplus-extra";
import { secPlusExtraSeeds } from "./phase-secplus-extra";
import { linuxServersCloudSeeds } from "./phase-linux-servers-cloud";
import { linuxExtraSeeds } from "./phase-linux-extra";
import { serverExtraSeeds } from "./phase-server-extra";
import { cloudExtraSeeds } from "./phase-cloud-extra";
import { advancedSecuritySeeds } from "./phase-advanced-security";
import { cysaExtraSeeds } from "./phase-cysa-extra";
import { pentestExtraSeeds } from "./phase-pentest-extra";
import { securityxExtraSeeds } from "./phase-securityx-extra";
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
  ...techExtraSeeds,
  ...aPlusExtraSeeds,
  ...networkAndSecuritySeeds,
  ...netPlusExtraSeeds,
  ...secPlusExtraSeeds,
  ...linuxServersCloudSeeds,
  ...linuxExtraSeeds,
  ...serverExtraSeeds,
  ...cloudExtraSeeds,
  ...advancedSecuritySeeds,
  ...cysaExtraSeeds,
  ...pentestExtraSeeds,
  ...securityxExtraSeeds,
];

export const expansionTopics = seedTopics(expansionSeeds);
export const expansionLessons = seedLessons(expansionSeeds);
export const expansionModules = seedModules(expansionSeeds);
export const expansionRecall = seedRecall(expansionSeeds);
export const expansionPractice = seedPractice(expansionSeeds);
export const expansionScenarios = seedScenarios(expansionSeeds);
