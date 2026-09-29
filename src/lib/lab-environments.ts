import type { UserData } from "@/lib/app-data/types";
import { masteryGate } from "@/lib/mastery-gate";
import { topicScopeProgress } from "@/lib/scope-progress";
import type { Lab } from "@/lib/app-data/types";

export type LabEnvironmentId =
  | "virtual-pc" | "virtual-mobile" | "hardware-explorer"
  | "virtual-network" | "server-directory" | "cloud-sandbox" | "security-sandbox"
  | "automotive-simulator" | "document-workspace" | "physical-external";

export type LabEnvironmentStatus = "supported" | "partial" | "planned" | "external";

export interface LabEnvironmentProfile {
  environmentId: LabEnvironmentId;
  label: string;
  status: LabEnvironmentStatus;
  capabilities: string[];
  launchPath?: string;
  reason: string;
}

const definitions: Record<LabEnvironmentId, Omit<LabEnvironmentProfile,"capabilities"|"reason">> = {
  "virtual-pc": { environmentId:"virtual-pc", label:"Virtual PC", status:"supported", launchPath:"/virtual-pc" },
  "virtual-mobile": { environmentId:"virtual-mobile", label:"Virtual Mobile", status:"supported", launchPath:"/virtual-mobile" },
  "hardware-explorer": { environmentId:"hardware-explorer", label:"Hardware Explorer", status:"supported", launchPath:"/explore-hardware" },
  "virtual-network": { environmentId:"virtual-network", label:"Virtual Network", status:"planned" },
  "server-directory": { environmentId:"server-directory", label:"Server & Directory Lab", status:"planned" },
  "cloud-sandbox": { environmentId:"cloud-sandbox", label:"Cloud Sandbox", status:"planned" },
  "security-sandbox": { environmentId:"security-sandbox", label:"Security Sandbox", status:"planned" },
  "automotive-simulator": { environmentId:"automotive-simulator", label:"Automotive Simulator", status:"planned" },
  "document-workspace": { environmentId:"document-workspace", label:"Guided Workspace", status:"partial" },
  "physical-external": { environmentId:"physical-external", label:"Physical / External", status:"external" },
};

function text(lab: Lab): string {
  return [lab.title,lab.objective,lab.environment,...lab.prerequisites,...lab.instructions,lab.expectedResult].join(" ").toLowerCase();
}
function has(source:string, pattern:RegExp){ return pattern.test(source); }

export function labEnvironmentProfile(lab: Lab): LabEnvironmentProfile {
  const source=text(lab);
  let environmentId: LabEnvironmentId="document-workspace";
  const capabilities=new Set<string>();

  if(has(source,/vehicle|engine|automotive|shop|scan tool|multimeter.*vehicle/)) {
    environmentId="automotive-simulator"; capabilities.add("diagnostics"); capabilities.add("measurement"); capabilities.add("service-information");
  } else if(has(source,/phone|mobile device|android|iphone|ios|cellular|bluetooth|mdm|esim|sim card/)) {
    if(has(source,/battery|charging port|camera|display|antenna|speaker|microphone|sensor|hardware component/)) {
      environmentId="hardware-explorer"; capabilities.add("mobile"); capabilities.add("component-identification"); capabilities.add("hardware-diagnosis");
    } else {
      environmentId="virtual-mobile"; capabilities.add("device-settings"); capabilities.add("connectivity"); capabilities.add("app-management"); capabilities.add("mdm");
    }
  } else if(has(source,/active directory|domain controller|group policy|domain join|directory service|ldap/)) {
    environmentId="server-directory"; capabilities.add("users-groups"); capabilities.add("policy"); capabilities.add("domain-services");
  } else if(has(source,/cloud|virtual machine.*provider|object storage|iam|availability zone|kubernetes/)) {
    environmentId="cloud-sandbox"; capabilities.add("compute"); capabilities.add("networking"); capabilities.add("storage"); capabilities.add("identity");
  } else if(has(source,/vlan|switch|router|routing|subnet|dhcp|packet|gateway|wireless network|dns resolution|firewall|vpn/)) {
    environmentId="virtual-network"; capabilities.add("interfaces"); capabilities.add("addressing"); capabilities.add("reachability"); capabilities.add("dns");
    if(has(source,/vlan|switch/)) capabilities.add("switching");
    if(has(source,/router|routing|gateway/)) capabilities.add("routing");
    if(has(source,/dhcp/)) capabilities.add("dhcp");
    if(has(source,/firewall|vpn/)) capabilities.add("security-policy");
  } else if(has(source,/malware|incident|forensic|vulnerab|threat|security control|attack|pentest/)) {
    environmentId="security-sandbox"; capabilities.add("safe-faults"); capabilities.add("logs"); capabilities.add("evidence");
  } else if(has(source,/cpu|memory|ram|motherboard|storage drive|power supply|hardware component|desktop.*component|laptop.*component/)) {
    environmentId="hardware-explorer"; if(has(source,/laptop|notebook/)) capabilities.add("laptop"); else capabilities.add("desktop"); capabilities.add("component-identification"); capabilities.add("compatibility"); capabilities.add("hardware-diagnosis");
  } else if(lab.category==="windows" || lab.category==="linux" || lab.category==="powershell" || lab.category==="bash") {
    environmentId="virtual-pc"; capabilities.add("filesystem"); capabilities.add("processes"); capabilities.add("services"); capabilities.add("terminal");
  }

  if(has(source,/terminal|command|powershell|bash|cmd|ipconfig|ifconfig|\bping\b|nslookup|dig|resolve-dnsname/)) capabilities.add("terminal");
  if(has(source,/file|folder|directory|csv|log/)) capabilities.add("filesystem");
  if(has(source,/service|process|task manager/)) capabilities.add("services-processes");
  if(has(source,/user|group|account|permission|access control/)) capabilities.add("identity-permissions");

  const def=definitions[environmentId];
  const status:LabEnvironmentStatus =
    environmentId==="virtual-pc" || environmentId==="virtual-mobile" || environmentId==="hardware-explorer"
      ? (capabilities.has("terminal") && environmentId==="hardware-explorer" ? "partial" : def.status)
      : def.status;
  return {...def,status,capabilities:[...capabilities],reason:
    status==="supported" ? "The current simulator can provide the primary practice surface for this lab." :
    status==="partial" ? "Part of this lab can be practiced in-app, but some evidence still relies on guided or external work." :
    status==="planned" ? "This lab maps to a virtual environment that is not built yet." :
    "This lab depends on physical equipment, an authorized external system, or work that should not be simulated as if it were real."};
}

export function labEnvironmentAudit(labs: Lab[]) {
  const profiles=labs.map(lab=>({lab,profile:labEnvironmentProfile(lab)}));
  const byEnvironment=Object.values(definitions).map(def=>{
    const matches=profiles.filter(item=>item.profile.environmentId===def.environmentId);
    const capabilities=[...new Set(matches.flatMap(item=>item.profile.capabilities))];
    return {environmentId:def.environmentId,label:def.label,status:def.status,count:matches.length,capabilities};
  }).sort((a,b)=>b.count-a.count);
  return {total:labs.length,profiles,byEnvironment};
}


export type TrainingActivityKind = "lab" | "ticket";
export type TrainingSurface = "virtual-pc" | "virtual-mobile" | "hardware-explorer" | "guided-workspace";

export type PracticeTool = "terminal" | "files" | "services" | "processes" | "accounts" | "network" | "settings" | "apps" | "bluetooth" | "battery" | "storage";

export interface LabLaunchContext {
  kind: "lab";
  labId: string;
  topicId: string;
  surface: TrainingSurface;
  launchPath?: string;
  capabilities: string[];
  preferredTool?: PracticeTool;
  preferredOs?: "windows" | "linux" | "android" | "phone";
}

/** Labs are practice. This deliberately contains no ticket/requester/fault fields. */
export function labLaunchContext(lab: Lab): LabLaunchContext {
  const profile = labEnvironmentProfile(lab);
  const source=text(lab);
  const preferredTool: PracticeTool | undefined =
    has(source,/bluetooth|pairing/) ? "bluetooth" :
    has(source,/battery|charging/) ? "battery" :
    has(source,/storage|disk|free space|capacity/) ? "storage" :
    has(source,/service/) ? "services" :
    has(source,/process|task manager/) ? "processes" :
    has(source,/user|group|account|permission/) ? "accounts" :
    has(source,/network|dns|dhcp|ip address|gateway|ping|vpn|cellular|wi-fi|wifi/) ? "network" :
    has(source,/file|folder|directory/) ? "files" :
    has(source,/terminal|command|powershell|bash|cmd/) ? "terminal" :
    profile.environmentId==="virtual-mobile" ? "settings" : undefined;
  const preferredOs =
    profile.environmentId==="virtual-mobile" ? (has(source,/iphone|ios|pathos/) ? "phone" : "android") :
    has(source,/linux|bash/) ? "linux" : "windows";
  const surface: TrainingSurface =
    profile.environmentId === "virtual-pc" || profile.environmentId === "virtual-mobile" || profile.environmentId === "hardware-explorer"
      ? profile.environmentId
      : "guided-workspace";
  return { kind:"lab", labId:lab.id, topicId:lab.topicId, surface, ...(profile.launchPath ? {launchPath:profile.launchPath} : {}), capabilities:profile.capabilities, ...(preferredTool?{preferredTool}:{}), ...(preferredOs?{preferredOs}: {}) };
}

export function labLaunchHref(lab: Lab): string | undefined {
  const context=labLaunchContext(lab);
  if(!context.launchPath) return undefined;
  const params=new URLSearchParams({ activity:"lab", lab:lab.id, topic:lab.topicId });
  if(context.preferredTool) params.set("tool",context.preferredTool);
  if(context.preferredOs) params.set("os",context.preferredOs);
  return `${context.launchPath}?${params.toString()}`;
}


export interface TrainingAvailability {
  available: boolean;
  reason: string;
}

/** Labs are deliberate practice: expose them once the learner has begun proving the topic. They never gate section progression. */
export function labAvailability(user: UserData, lab: Lab): TrainingAvailability {
  const gate=masteryGate(user,lab.topicId);
  const scope=topicScopeProgress(user,lab.topicId);
  const begun=scope.attempted>0 || gate.met;
  return begun
    ? {available:true,reason:"Practice is available for this topic."}
    : {available:false,reason:"Start this topic first. The lab opens once you have begun working its learning checks."};
}

/** Diagnostic incidents require knowledge plus some application/practical evidence; they should not be a learner's first exposure. */
export function troubleshootingAvailability(user: UserData, topicId: string): TrainingAvailability {
  const gate=masteryGate(user,topicId);
  const scope=topicScopeProgress(user,topicId);
  const knowledgeReady=gate.met;
  const applied=scope.application.attempted>0 || scope.practicalAbility.attempted>0;
  return knowledgeReady && applied
    ? {available:true,reason:"You have enough topic and applied evidence to work an incident independently."}
    : {available:false,reason:!knowledgeReady?"Prove the topic first before taking an incident.":"Complete some applied or hands-on work before taking an incident."};
}


export type SimulatorLabVerification = {
  supported: boolean;
  requirement: string;
  minimumActions: number;
};

/** Only tools whose behavior is actually represented by the simulator can earn automatic Lab evidence. */
export function simulatorLabVerification(lab: Lab): SimulatorLabVerification {
  const context=labLaunchContext(lab);
  const tool=context.preferredTool;
  const supported=context.surface==="virtual-pc"
    ? ["terminal","files","services","processes","accounts","network","storage"].includes(tool ?? "")
    : context.surface==="virtual-mobile"
      ? ["terminal","files","bluetooth","battery","storage","network","settings","apps"].includes(tool ?? "")
      : false;
  return {
    supported,
    minimumActions: supported ? 2 : 0,
    requirement: supported
      ? "Perform at least two relevant actions in the simulator and leave the targeted system in a valid working state."
      : "This lab is not automatically verifiable in the current simulator and must use the normal Lab evidence workflow.",
  };
}
