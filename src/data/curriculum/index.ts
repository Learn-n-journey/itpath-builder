/** Expanded 24-month curriculum: seeds plus derived entities. */
import { fundamentalsAndAPlusSeeds } from "./phase-fundamentals-aplus";
import { aPlusExtraSeeds } from "./phase-aplus-extra";
import { techExtraSeeds } from "./phase-tech-extra";
import { networkAndSecuritySeeds } from "./phase-network-security";
import { netPlusExtraSeeds } from "./phase-netplus-extra";
import { secPlusExtraSeeds } from "./phase-secplus-extra";
import { linuxServersCloudSeeds } from "./phase-linux-servers-cloud";
import { linuxExtraSeeds } from "./phase-linux-extra";
import { linuxGapSeeds } from "./phase-linux-gap";
import { serverExtraSeeds } from "./phase-server-extra";
import { serverGapSeeds } from "./phase-server-gap";
import { cloudExtraSeeds } from "./phase-cloud-extra";
import { cloudGapSeeds } from "./phase-cloud-gap";
import { advancedSecuritySeeds } from "./phase-advanced-security";
import { cysaExtraSeeds } from "./phase-cysa-extra";
import { cysaGapSeeds } from "./phase-cysa-gap";
import { pentestExtraSeeds } from "./phase-pentest-extra";
import { pentestGapSeeds } from "./phase-pentest-gap";
import { securityxExtraSeeds } from "./phase-securityx-extra";
import { securityxGapSeeds } from "./phase-securityx-gap";
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
  ...linuxGapSeeds,
  ...serverExtraSeeds,
  ...serverGapSeeds,
  ...cloudExtraSeeds,
  ...cloudGapSeeds,
  ...advancedSecuritySeeds,
  ...cysaExtraSeeds,
  ...cysaGapSeeds,
  ...pentestExtraSeeds,
  ...pentestGapSeeds,
  ...securityxExtraSeeds,
  ...securityxGapSeeds,
];

export const expansionTopics = seedTopics(expansionSeeds);
export const expansionLessons = seedLessons(expansionSeeds);
export const expansionModules = seedModules(expansionSeeds);
export const expansionRecall = seedRecall(expansionSeeds);
export const expansionPractice = seedPractice(expansionSeeds);
export const expansionScenarios = seedScenarios(expansionSeeds);
