import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BatteryFull, Bluetooth, ChevronLeft, Download, Folder, Globe2, Image, KeyRound, Mail, MessageSquare, Phone, RotateCcw, Settings, ShieldCheck, Smartphone, Trash2, UserRound, Wifi, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { requiredMobileTicketEvidence, mobileTrainingTickets, type MobileTrainingTicket } from "@/lib/training/mobile-tickets";
import { createMachine, primaryInterface, setServiceStatus, type MachineState } from "@/lib/terminal/machine";
import { execute } from "@/lib/terminal/shells";
import { applyTrainingNetworkAction, observeTrainingNetwork } from "@/lib/training/network-capabilities";
import { useAppState } from "@/state/app-state";
import { hasSimulatorCredit, shouldRecordSimulatorOutcome, simulatorOutcomeSignal, simulatorScaffoldingProfile, topicLearningPolicy } from "@/lib/learner-signals";
import { labs } from "@/data/static-content";
import { simulatorLabContract } from "@/lib/lab-environments";
import { readSimulatorState, writeSimulatorState } from "@/lib/simulator-state";
import { useAuth } from "@/state/auth-state";
import { clearTemporaryFiles, createMobileFiles, type MobileFile } from "@/lib/virtual-mobile-files";

export const Route = createFileRoute("/virtual-mobile")({
  validateSearch: (search: Record<string, unknown>): { activity?: "lab"|"ticket"; lab?: string; ticket?: string; topic?: string; tool?: string; os?: MobileOs } => ({
    ...(search["activity"] === "lab" || search["activity"] === "ticket" ? { activity:search["activity"] } : {}),
    ...(typeof search["ticket"] === "string" ? { ticket:search["ticket"] } : {}),
    ...(typeof search["lab"] === "string" ? { lab:search["lab"] } : {}),
    ...(typeof search["topic"] === "string" ? { topic:search["topic"] } : {}),
    ...(typeof search["tool"] === "string" ? { tool:search["tool"] } : {}),
    ...(search["os"] === "android" || search["os"] === "phone" ? { os:search["os"] } : {}),
  }),
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Virtual Mobile | IT PATH" }, { name: "description", content: "Practice mobile support inside safe simulated Android-style and phone-style devices." }] }),
  component: VirtualMobilePage,
});

type MobileOs = "android" | "phone";
type MobileApp = "settings" | "files" | "browser" | "messages" | "photos" | "account" | "apps" | "mail" | "support" | "console" | null;
type MobileState = {
  machine: MachineState;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  airplaneMode: boolean;
  battery: number;
  storageUsed: number;
  notifications: string[];
  installedApps: { id:string; name:string; permission:string; cacheMb:number; enabled:boolean; permissionGranted?:boolean; backgroundUse?:boolean }[];
  mailSync: boolean;
  cloudSync: boolean;
  managementProfile: boolean;
  screenLock: boolean;
  cellularEnabled: boolean;
  simType: "physical" | "esim";
  simActive: boolean;
  vpnEnabled: boolean;
  hotspotEnabled: boolean;
  batteryHealth: number;
  backgroundRestricted: boolean;
  backgroundRefresh: boolean;
  updateAvailable: boolean;
  updateInstalled: boolean;
  notificationPermission: boolean;
  installedProfiles: string[];
  networkCacheStale: boolean;
  pairedBluetooth: string[];
  charging: boolean;
  accountSignedIn: boolean;
  files: MobileFile[];
};

function freshMobile(os: MobileOs): MobileState {
  const shell = os === "android" ? "android" : "ios";
  const machine = createMachine({ shell, hostname: os === "android" ? "path-mobile-a" : "path-mobile-p" });
  return {
    machine,
    files: createMobileFiles(os),
    wifiEnabled: true,
    bluetoothEnabled: true,
    cellularEnabled: true,
    airplaneMode: false,
    battery: 86,
    storageUsed: 42,
    notifications: ["Device enrolled in the IT PATH training environment."],
    installedApps: [
      { id:"mail", name:"Mail", permission:"Contacts, Notifications", cacheMb:186, enabled:true, permissionGranted:true, backgroundUse:true },
      { id:"browser", name:"Browser", permission:"Location while using", cacheMb:94, enabled:true, permissionGranted:true, backgroundUse:false },
      { id:"photos", name:"Photos", permission:"Photos and media", cacheMb:248, enabled:true, permissionGranted:true, backgroundUse:false },
      { id:"support", name:"IT PATH Support", permission:"Notifications", cacheMb:38, enabled:true, permissionGranted:true, backgroundUse:false },
    ],
    mailSync: true,
    cloudSync: true,
    managementProfile: true,
    screenLock: true,
    simType: os === "android" ? "physical" : "esim",
    simActive: true,
    vpnEnabled: false,
    hotspotEnabled: false,
    batteryHealth: 94,
    backgroundRestricted: false,
    backgroundRefresh: true,
    updateAvailable: true,
    updateInstalled: false,
    notificationPermission: true,
    installedProfiles: ["corp-wifi.mobileconfig"],
    networkCacheStale: false,
    pairedBluetooth: ["IT PATH Buds"],
    charging: false,
    accountSignedIn: true,
  };
}

function VirtualMobilePage() {
  const launchContext = Route.useSearch();
  const practiceMode = launchContext.activity === "lab" && Boolean(launchContext.lab);
  const {user,actions}=useAppState();
  const { userId } = useAuth();
  const [practiceActions,setPracticeActions]=useState(0);
  const [practiceHelpLevel,setPracticeHelpLevel]=useState(0);
  const practiceLab=practiceMode?labs.find(item=>item.id===launchContext.lab):undefined;
  const practiceContract=practiceLab?simulatorLabContract(practiceLab):null;
  const [practiceBaseline,setPracticeBaseline]=useState<Record<MobileOs,MobileState>|null>(null);
  const practiceSessionLabId=useRef<string|null>(null);
  const completedPracticeLabId=useRef<string|null>(null);
  const [os, setOs] = useState<MobileOs>(()=>launchContext.os ?? "android");
  const [devices, setDevices] = useState<Record<MobileOs, MobileState>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = readSimulatorState<Partial<Record<MobileOs, MobileState>>>("virtual-mobile", userId, {});
        if (saved?.android?.machine && saved?.phone?.machine) {
          const hydrate = (value: MobileState, kind: MobileOs): MobileState => ({ ...freshMobile(kind), ...value, installedApps: value.installedApps ?? freshMobile(kind).installedApps, files: value.files ?? freshMobile(kind).files });
          return { android: hydrate(saved.android, "android"), phone: hydrate(saved.phone, "phone") };
        }
      } catch {}
    }
    return { android: freshMobile("android"), phone: freshMobile("phone") };
  });
  const [app, setApp] = useState<MobileApp>(null);
  const [settingsPage, setSettingsPage] = useState<"main"|"network"|"bluetooth"|"storage"|"security"|"account"|"apps"|"sync"|"cellular"|"battery"|"system">("main");
  const [shade, setShade] = useState(false);
  const [notice, setNotice] = useState("");
  const [ticketOpen, setTicketOpen] = useState(false);
  useEffect(()=>{
    if(!practiceMode || !launchContext.tool) return;
    const tool=launchContext.tool;
    if(tool==="bluetooth"||tool==="battery"||tool==="storage"||tool==="network"||tool==="settings"||tool==="apps"){
      setApp("settings");
      setSettingsPage(tool==="network"?"network":tool==="settings"?"main":tool as "bluetooth"|"battery"|"storage"|"apps");
    } else if(tool==="terminal") setApp("console");
    else if(tool==="files") setApp("files");
  },[practiceMode,launchContext.lab,launchContext.tool]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketBaseline, setTicketBaseline] = useState<MobileState | null>(null);
  const [ticketVerified, setTicketVerified] = useState(false);
  const [gaylLevel, setGaylLevel] = useState(0);
  const [consoleCommand, setConsoleCommand] = useState("");
  const [consoleLines, setConsoleLines] = useState<{command:string;output:string;error:boolean}[]>([]);
  const [ticketTrace,setTicketTrace]=useState<Array<"observe"|"test"|"repair"|"verify">>([]);
  const [ticketHistory, setTicketHistory] = useState<{id:string;title:string;os:MobileOs;assisted:boolean;completedAt:string}[]>(() => {
    if(typeof window==="undefined") return [];
    return readSimulatorState("virtual-mobile-ticket-history", userId, []);
  });

  const state = devices[os];
  // A device without a network interface shows as disconnected instead of crashing.
  const iface = useMemo(() => primaryInterface(state.machine) ?? { name: "wlan0", mac: "", ip: "", mask: "", gateway: "", dhcp: true, up: false }, [state.machine]);
  const network = useMemo(() => observeTrainingNetwork(state.machine), [state.machine]);
  const wifiOnline = state.wifiEnabled && iface.up && network.localReady;
  const cellularOnline = !state.airplaneMode && state.cellularEnabled && state.simActive;
  const mobileOnline = wifiOnline || cellularOnline;
  const storageCritical = state.storageUsed >= 95;
  const mailApp = state.installedApps.find(item=>item.id==="mail");
  const mailOperational = Boolean(mailApp?.enabled) && (mailApp?.cacheMb ?? 0) < 400;
  const photosApp = state.installedApps.find(item=>item.id==="photos");
  const browserApp = state.installedApps.find(item=>item.id==="browser");
  const updateReady = mobileOnline && state.battery >= 50 && !storageCritical;
  const workServicesReady = state.accountSignedIn && state.managementProfile;

  // Reload the account-scoped simulator snapshot when authentication becomes ready.
  useEffect(() => {
    if (!userId) return;
    const saved = readSimulatorState<Partial<Record<MobileOs, MobileState>>>("virtual-mobile", userId, {});
    if (!saved.android?.machine || !saved.phone?.machine) return;
    const hydrate = (value: MobileState, kind: MobileOs): MobileState => ({
      ...freshMobile(kind),
      ...value,
      installedApps: value.installedApps ?? freshMobile(kind).installedApps,
    });
    setDevices({ android: hydrate(saved.android, "android"), phone: hydrate(saved.phone, "phone") });
  }, [userId]);

  useEffect(() => {
    if(!practiceMode) writeSimulatorState("virtual-mobile", userId, devices);
  }, [devices,practiceMode,userId]);
  useEffect(()=>{
    const labId=practiceMode ? launchContext.lab ?? null : null;
    if(!labId) {
      practiceSessionLabId.current=null;
      completedPracticeLabId.current=null;
      return;
    }
    if(completedPracticeLabId.current===labId || (practiceBaseline && practiceSessionLabId.current===labId)) return;
    setPracticeBaseline(structuredClone(devices));
    practiceSessionLabId.current=labId;
    completedPracticeLabId.current=null;
    setDevices({android:freshMobile("android"),phone:freshMobile("phone")});
    setPracticeActions(0);
    setPracticeHelpLevel(0);
  },[practiceMode,launchContext.lab,practiceBaseline]);
  useEffect(() => {
    writeSimulatorState("virtual-mobile-ticket-history", userId, ticketHistory.slice(0,50));
  }, [ticketHistory,userId]);

  const markTicket=(step:"observe"|"test"|"repair"|"verify")=>{if(activeTicketId)setTicketTrace(items=>items.includes(step)?items:[...items,step]);};
  const countPracticeAction=(tool: typeof launchContext.tool)=>{if(practiceMode && practiceContract?.supported && practiceContract.tool===tool)setPracticeActions(count=>count+1);};
  const update = (fn: (draft: MobileState) => MobileState, tool?: typeof launchContext.tool) => { if(tool) countPracticeAction(tool); if(activeTicketId) markTicket("repair"); setDevices(current => ({ ...current, [os]: fn(current[os]) })); };
  const patch = (values: Partial<MobileState>, tool?: typeof launchContext.tool) => update(current => ({ ...current, ...values }),tool);

  const toggleWifi = () => update(current => {
    const next = !current.wifiEnabled;
    const network = observeTrainingNetwork(current.machine);
    const machine = applyTrainingNetworkAction(current.machine, { type: "set-interface", name: network.interfaceName, up: next && !current.airplaneMode });
    return { ...current, machine, wifiEnabled: next };
  }, "network");
  const toggleBluetooth = () => update(current => {
    const next = !current.bluetoothEnabled;
    const machine = structuredClone(current.machine);
    setServiceStatus(machine, "bluetooth", next ? "running" : "stopped");
    return { ...current, machine, bluetoothEnabled: next };
  }, "bluetooth");
  const toggleAirplane = () => update(current => {
    const next = !current.airplaneMode;
    return { ...current, airplaneMode: next, hotspotEnabled: next ? false : current.hotspotEnabled };
  });
  const toggleCellular = () => update(current => ({ ...current, cellularEnabled:!current.cellularEnabled, hotspotEnabled:current.cellularEnabled ? false : current.hotspotEnabled }), "network");
  const toggleSim = () => update(current => ({ ...current, simActive:!current.simActive, hotspotEnabled:current.simActive ? false : current.hotspotEnabled }), "network");
  const toggleHotspot = () => update(current => {
    const canEnable=current.cellularEnabled && current.simActive && !current.airplaneMode;
    const next=!current.hotspotEnabled && canEnable;
    return {...current,hotspotEnabled:next,notifications:!canEnable?["Hotspot needs an active SIM, cellular data, and airplane mode off.",...current.notifications]:current.notifications};
  }, "network");
  const resetDevice = () => {
    setDevices(current => ({ ...current, [os]: freshMobile(os) }));
    setApp(null); setSettingsPage("main"); setShade(false); setNotice("Device reset to its training baseline.");
  };
  const activeTicket = mobileTrainingTickets.find(ticket=>ticket.id===activeTicketId) ?? null;
  const ticketResolved = activeTicket ? (() => {
    switch(activeTicket.fault) {
      case "battery-drain": return state.backgroundRestricted;
      case "wifi-off": return state.wifiEnabled && !state.airplaneMode && iface.up;
      case "mail-cache": return (state.installedApps.find(item=>item.id==="mail")?.cacheMb ?? 1) === 0;
      case "cloud-sync-off": return state.cloudSync;
      case "legacy-profile": return !state.installedProfiles.includes("legacy-restrictions.mobileconfig") && state.managementProfile;
      case "network-cache": return !state.networkCacheStale;
      case "bluetooth-off": return state.bluetoothEnabled;
      case "account-sync-off": return state.cloudSync;
      case "mail-sync-off": return state.mailSync;
      case "retired-profile": return !state.installedProfiles.includes("retired-test.mobileconfig") && state.managementProfile;
      case "storage-full": return state.storageUsed < 90;
      case "notifications-blocked": return state.notificationPermission && state.mailSync;
      case "sim-disabled": return state.simActive && state.cellularEnabled && !state.airplaneMode;
      case "bluetooth-unpaired": return state.bluetoothEnabled && state.pairedBluetooth.includes("IT PATH Buds");
      case "photos-permission": return state.installedApps.find(item=>item.id==="photos")?.permissionGranted !== false;
      case "update-prereq": return state.updateInstalled;
      case "account-signed-out": return state.accountSignedIn && state.managementProfile;
      case "background-refresh-off": return state.backgroundRefresh;
    }
  })() : false;

  const startTicket = (ticket: MobileTrainingTicket) => {
    const target = ticket.os;
    setTicketBaseline(structuredClone(devices[target]));
    setOs(target);
    setDevices(current => {
      const next = structuredClone(current[target]);
      if (ticket.fault==="battery-drain") { next.backgroundRestricted=false; next.battery=38; next.installedApps=next.installedApps.map(item=>item.id==="mail"?{...item,backgroundUse:true}:item); }
      if (ticket.fault==="wifi-off") { next.wifiEnabled=false; const wifi=primaryInterface(next.machine); if(wifi) wifi.up=false; }
      if (ticket.fault==="mail-cache") next.installedApps=next.installedApps.map(item=>item.id==="mail"?{...item,cacheMb:486}:item);
      if (ticket.fault==="cloud-sync-off" || ticket.fault==="account-sync-off") next.cloudSync=false;
      if (ticket.fault==="legacy-profile" && !next.installedProfiles.includes("legacy-restrictions.mobileconfig")) next.installedProfiles.push("legacy-restrictions.mobileconfig");
      if (ticket.fault==="network-cache") next.networkCacheStale=true;
      if (ticket.fault==="bluetooth-off") { next.bluetoothEnabled=false; setServiceStatus(next.machine, "bluetooth", "stopped"); }
      if (ticket.fault==="mail-sync-off") next.mailSync=false;
      if (ticket.fault==="retired-profile" && !next.installedProfiles.includes("retired-test.mobileconfig")) next.installedProfiles.push("retired-test.mobileconfig");
      if (ticket.fault==="storage-full") { next.storageUsed=98; next.installedApps=next.installedApps.map(item=>({...item,cacheMb:item.cacheMb+650})); }
      if (ticket.fault==="notifications-blocked") { next.notificationPermission=false; next.mailSync=true; }
      if (ticket.fault==="sim-disabled") { next.simActive=false; next.cellularEnabled=true; next.wifiEnabled=true; }
      if (ticket.fault==="bluetooth-unpaired") { next.bluetoothEnabled=true; next.pairedBluetooth=next.pairedBluetooth.filter(item=>item!=="IT PATH Buds"); }
      if (ticket.fault==="photos-permission") next.installedApps=next.installedApps.map(item=>item.id==="photos"?{...item,permissionGranted:false}:item);
      if (ticket.fault==="update-prereq") { next.updateAvailable=true; next.updateInstalled=false; next.battery=24; }
      if (ticket.fault==="account-signed-out") { next.accountSignedIn=false; next.cloudSync=false; }
      if (ticket.fault==="background-refresh-off") next.backgroundRefresh=false;
      next.notifications=[ticket.brief,...next.notifications];
      return {...current,[target]:next};
    });
    setActiveTicketId(ticket.id); setTicketTrace([]); setTicketVerified(false); setGaylLevel(0); setApp(null); setSettingsPage("main"); setTicketOpen(true);
  };
  useEffect(()=>{
    if(launchContext.activity!=="ticket" || !launchContext.ticket || activeTicketId) return;
    const ticket=mobileTrainingTickets.find(item=>item.id===launchContext.ticket);
    if(ticket) startTicket(ticket);
  },[launchContext.activity,launchContext.ticket]);
  const cancelTicket = () => {
    if(activeTicket && ticketBaseline) setDevices(current=>({...current,[activeTicket.os]:ticketBaseline}));
    setActiveTicketId(null); setTicketBaseline(null); setTicketVerified(false); setGaylLevel(0); setApp(null); setTicketOpen(false);
  };
  const verifyTicket = () => {
    if(ticketResolved) markTicket("verify");
    setTicketVerified(ticketResolved);
    setNotice(ticketResolved ? "Fix verified against the simulated device state." : "The device still shows evidence of the problem.");
  };
  const closeTicket = () => {
    if(!ticketResolved || !activeTicket)return;
    const required=requiredMobileTicketEvidence(activeTicket);
    const processComplete=required.every(step=>step==="verify" ? ticketVerified : ticketTrace.includes(step));
    if(!processComplete){setNotice(`The fix works, but demonstrate the troubleshooting process first: ${required.filter(step=>step==="verify" ? !ticketVerified : !ticketTrace.includes(step)).join(", ")}.`);return;}
    setTicketHistory(history=>[{id:activeTicket.id,title:activeTicket.title,os:activeTicket.os,assisted:gaylLevel>0,completedAt:new Date().toISOString()},...history].slice(0,50));
    if(shouldRecordSimulatorOutcome(user,"troubleshoot",activeTicket.id,gaylLevel)) actions.addLearnerSignal(simulatorOutcomeSignal(activeTicket.topicId,"troubleshoot",activeTicket.id,1,gaylLevel));
    setActiveTicketId(null); setTicketBaseline(null); setTicketVerified(false); setGaylLevel(0); setTicketOpen(false); setConsoleLines([]);
  };
  const syncUiFromMachine = (machine:MachineState) => update(current => {
    const service = (name:string) => machine.services.find(item=>item.name===name)?.status === "running";
    return {
      ...current, machine,
      wifiEnabled: primaryInterface(machine)?.up ?? false,
      bluetoothEnabled: machine.services.some(item=>item.name==="bluetooth") ? service("bluetooth") : current.bluetoothEnabled,
      cellularEnabled: machine.services.some(item=>item.name==="data"||item.name==="cellular") ? service("data") || service("cellular") : current.cellularEnabled,
      cloudSync: machine.services.some(item=>item.name===(os==="phone"?"icloud":"sync")) ? (os==="phone" ? service("icloud") : service("sync")) : current.cloudSync,
      mailSync: machine.services.some(item=>item.name==="mail") ? service("mail") : current.mailSync,
    };
  });
  const runMobileConsole = () => {
    if(activeTicketId) markTicket("test");
    const raw=consoleCommand.trim(); if(!raw)return;
    const result=execute(state.machine,raw);
    syncUiFromMachine(result.state);
    countPracticeAction("terminal");
    setConsoleLines(lines=>[...lines,{command:raw,output:result.output,error:result.error}].slice(-40));
    setConsoleCommand("");
  };
  const clearNetworkState = () => update(current => ({ ...current, networkCacheStale:false, machine: applyTrainingNetworkAction(current.machine, { type: "flush-dns" }) }), "network");
  const removeProfile = (name:string) => update(current=>({...current,installedProfiles:current.installedProfiles.filter(item=>item!==name)}), "settings");
  const toggleManagementProfile = () => update(current => {
    const next=!current.managementProfile;
    const profiles=next
      ? current.installedProfiles.includes("corp-wifi.mobileconfig") ? current.installedProfiles : ["corp-wifi.mobileconfig",...current.installedProfiles]
      : current.installedProfiles.filter(item=>item!=="corp-wifi.mobileconfig");
    return {...current,managementProfile:next,installedProfiles:profiles};
  }, "settings");

  const open = (next: MobileApp) => { if(activeTicketId) markTicket("observe"); setApp(next); setShade(false); setNotice(""); };
  const switchOs = (next: MobileOs) => { setOs(next); setApp(null); setSettingsPage("main"); setShade(false); setNotice(""); };

  const scaffoldingProfile=launchContext.lab?simulatorScaffoldingProfile(user,launchContext.lab):null;
  const topicPolicy=launchContext.topic?topicLearningPolicy(user,launchContext.topic):null;
  const practiceHint=practiceHelpLevel===0?"I’ll stay out of the way unless you need me.":topicPolicy?.policy.scaffold==="none"?"Work independently and verify the result before you finish.":topicPolicy?.policy.scaffold==="low"?"What evidence would most efficiently distinguish your leading hypotheses?":scaffoldingProfile?.openingHintStyle==="socratic"?"You have demonstrated this before. What observation would best test your first hypothesis?":scaffoldingProfile?.openingHintStyle==="guided"?"Name the subsystem involved, inspect its current state, then make the smallest justified change.":"Start with the symptom. Compare the expected state with what the device shows before changing anything.";
  const practiceHealthy = (() => {
    if (!practiceContract?.supported) return false;
    const success = practiceContract.success;
    if (success.kind==="bluetooth-enabled") return state.bluetoothEnabled;
    if (success.kind==="storage-below") return state.storageUsed<success.percent;
    if (success.kind==="network-online") return mobileOnline;
    if (success.kind==="terminal-command") {
      const expected = success.command.trim().toLowerCase();
      return consoleLines.some(item => item.output.trim().length > 0 && item.command.trim().toLowerCase() === expected);
    }
    if (success.kind==="app-enabled") return state.installedApps.some(item=>item.id===success.appId && item.enabled);
    return false;
  })();
  const completePracticeLab=()=>{
    if(!practiceMode||!launchContext.lab||!launchContext.topic||!practiceContract?.supported){setNotice(practiceContract?.requirement ?? "This Lab uses the normal evidence workflow.");return;}
    if(practiceActions<practiceContract.minimumRelevantActions||!practiceHealthy){setNotice(practiceContract.requirement);return;}
    if(shouldRecordSimulatorOutcome(user,"lab",launchContext.lab,practiceHelpLevel)) actions.addLearnerSignal(simulatorOutcomeSignal(launchContext.topic,"lab",launchContext.lab,1,practiceHelpLevel));
    setNotice("Lab objective verified from an isolated simulator session and recorded as practical evidence.");
    if(practiceBaseline){setDevices(structuredClone(practiceBaseline));setPracticeBaseline(null);completedPracticeLabId.current=launchContext.lab;setPracticeActions(0);setPracticeHelpLevel(0);}
  };

  const apps = [
    { id:"settings" as const, label:"Settings", icon:Settings },
    { id:"files" as const, label:"Files", icon:Folder },
    { id:"browser" as const, label:"Browser", icon:Globe2 },
    { id:"messages" as const, label:"Messages", icon:MessageSquare },
    { id:"photos" as const, label:"Photos", icon:Image },
    { id:"account" as const, label:"Account", icon:UserRound },
    { id:"apps" as const, label:"Apps", icon:Smartphone },
    { id:"mail" as const, label:"Mail", icon:Mail },
    { id:"support" as const, label:"Support", icon:ShieldCheck },
    { id:"console" as const, label: os==="android"?"Terminal":"Support Console", icon:KeyRound },
  ];

  const SettingRow = ({title,detail,onClick}:{title:string;detail:string;onClick:()=>void}) => <button onClick={onClick} className={cn("flex min-h-14 w-full items-center justify-between border-b px-4 text-left transition active:bg-slate-100 last:border-0",os==="android"?"border-slate-200/80 py-[1.05rem]":"border-slate-200 py-3")}><span><b className="block text-sm text-slate-900">{title}</b><span className="text-xs text-slate-500">{detail}</span></span><span className="text-slate-400">›</span></button>;
  const Toggle = ({on,onClick}:{on:boolean;onClick:()=>void}) => <button onClick={onClick} aria-pressed={on} className={cn("relative shrink-0 touch-manipulation transition active:scale-95",os==="android"?"h-8 w-13 rounded-2xl":"h-7 w-12 rounded-full",on?(os==="android"?"bg-teal-600":"bg-emerald-500"):"bg-slate-300")}><span className={cn("absolute rounded-full bg-white shadow transition",os==="android"?"top-1 size-6":"top-1 size-5",on?(os==="android"?"left-6":"left-6"):"left-1")}/></button>;

  return <div className="fixed inset-0 z-50 overflow-hidden bg-[#07111f] text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.16),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,.14),transparent_38%)]"/>
    <header className="absolute inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#07111f]/90 px-3 backdrop-blur-xl">
      <div className="flex items-center gap-2"><Link to="/dashboard" className="grid size-11 place-items-center rounded-xl hover:bg-white/10" aria-label="Exit Virtual Mobile"><ChevronLeft className="size-5"/></Link><Smartphone className="size-5 text-cyan-300"/><div><b className="text-sm">Virtual Mobile</b><p className="text-[10px] text-slate-400">Shared mobile simulation foundation</p></div></div>
      <div className="flex items-center gap-2">{practiceMode?<span className="hidden rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-2 py-1.5 text-xs font-semibold text-emerald-100 sm:inline">Practice lab</span>:null}<button onClick={()=>setTicketOpen(v=>!v)} className="min-h-11 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">Tickets{activeTicket?" · 1":""}</button><select value={os} onChange={e=>switchOs(e.target.value as MobileOs)} className="min-h-11 rounded-lg border border-white/10 bg-white/10 px-2 py-2 text-xs"><option value="android" className="text-black">IT PATH Mobile</option><option value="phone" className="text-black">PathOS Pocket</option></select><button onClick={resetDevice} className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10">Reset</button></div>
    </header>


    {ticketOpen?<div className="absolute right-3 top-16 z-[70] w-[min(25rem,94vw)] overflow-hidden rounded-2xl border border-white/15 bg-[#0d1b2e]/95 shadow-2xl backdrop-blur-2xl"><div className="flex items-center justify-between border-b border-white/10 p-4"><div><b>Mobile Help Desk</b><p className="text-[10px] text-slate-400">Problems are injected into the simulated device.</p></div><button onClick={()=>setTicketOpen(false)}><X className="size-4"/></button></div>{activeTicket?<div className="p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-cyan-300">#{activeTicket.id.replace("mobile-","")} · {activeTicket.requester}</span><span className={cn("rounded-full px-2 py-1 text-[10px]",ticketResolved?"bg-emerald-500/20 text-emerald-300":"bg-amber-500/20 text-amber-200")}>{ticketResolved?"Resolved":"Open"}</span></div><h3 className="mt-2 font-semibold">{activeTicket.title}</h3><p className="mt-2 text-xs leading-5 text-slate-300">{activeTicket.brief}</p><div className="mt-3 rounded-xl bg-white/5 p-3"><b className="text-[10px] text-slate-300">VERIFY</b>{activeTicket.verification.map(item=><p key={item} className="mt-1 text-[10px] text-slate-400">• {item}</p>)}</div><div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3"><div className="flex items-center justify-between"><b className="text-xs text-violet-200">GAYL</b><button onClick={()=>setGaylLevel(level=>Math.min(level+1,activeTicket.hints.length))} className="rounded-lg border border-violet-300/25 px-2 py-1 text-[10px]">Give me a hint</button></div><p className="mt-2 text-xs leading-5 text-slate-300">{gaylLevel===0?"I’ll stay out of the way unless you need me.":activeTicket.hints[Math.min(gaylLevel-1,activeTicket.hints.length-1)]}</p></div>{notice?<p className="mt-3 text-xs text-cyan-200">{notice}</p>:null}<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={cancelTicket} className="rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">Cancel ticket</button>{ticketResolved?<button onClick={closeTicket} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950">Close resolved ticket</button>:<button onClick={verifyTicket} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">Verify fix</button>}</div></div>:<div className="max-h-[65vh] space-y-2 overflow-y-auto p-3">{mobileTrainingTickets.map(ticket=><button key={ticket.id} onClick={()=>startTicket(ticket)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-cyan-400/50"><div className="flex items-center justify-between"><span className="text-[10px] text-cyan-300">#{ticket.id.replace("mobile-","")} · {ticket.requester}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px]">{ticket.os==="android"?"IT PATH Mobile":"PathOS Pocket"}</span></div><p className="mt-1 text-sm font-semibold">{ticket.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-400">{ticket.brief}</p></button>)}{ticketHistory.length?<div className="mt-4 border-t border-white/10 pt-3"><b className="px-1 text-[10px] uppercase tracking-wider text-slate-500">Recent completed</b>{ticketHistory.slice(0,5).map(item=><div key={item.id+item.completedAt} className="mt-2 rounded-xl bg-emerald-500/5 p-3"><div className="flex justify-between gap-2"><span className="text-xs text-slate-300">{item.title}</span><span className="text-[9px] text-emerald-300">{item.assisted?"GAYL assisted":"Independent"}</span></div></div>)}</div>:null}</div>}</div>:null}
    <main className="absolute inset-x-0 bottom-0 top-14 grid place-items-center overflow-auto overscroll-contain p-2 sm:p-6">
      <div className={cn("relative h-[min(780px,calc(100dvh-4.5rem))] w-[min(390px,96vw)] touch-manipulation overflow-hidden border-[7px] border-slate-950 bg-slate-100 shadow-2xl",os==="android"?"rounded-[2.1rem]":"rounded-[3.2rem]")}>
        <div className="absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-between px-5 text-[10px] font-semibold text-white">
          <span>9:41</span><button onClick={()=>setShade(v=>!v)} className="flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 backdrop-blur"><Wifi className={cn("size-3",!wifiOnline&&"opacity-35")}/><BatteryFull className="size-3"/><span>{state.battery}%</span></button>
        </div>
        {os==="phone"?<div className="absolute left-1/2 top-2 z-40 h-5 w-24 -translate-x-1/2 rounded-full bg-black"/>:<div className="absolute left-1/2 top-3 z-40 size-2 -translate-x-1/2 rounded-full bg-black"/>}

        <div className={cn("absolute inset-0",os==="android"?"bg-gradient-to-b from-[#4f6f72] via-[#29494d] to-[#17272a]":"bg-gradient-to-b from-[#6b7da8] via-[#47648b] to-[#273b59]")}>
          {!app ? <div className="flex h-full flex-col px-5 pb-20 pt-16">
            <div className="mb-8"><p className="text-sm text-white/70">Training device</p><h1 className="mt-1 text-3xl font-semibold">{os==="android"?"IT PATH Mobile":"PathOS Pocket"}</h1><p className="mt-2 text-xs text-white/65">{iface.up?"Connected to training Wi-Fi":"Offline"} · {Math.round(state.storageUsed)}% storage used</p></div>
            <div className="grid grid-cols-3 gap-x-5 gap-y-6">{apps.map(item=><button key={item.id} onClick={()=>open(item.id)} className="group flex flex-col items-center gap-2 text-xs"><span className={cn("grid size-14 place-items-center bg-white/90 text-slate-800 shadow-lg transition group-active:scale-95",os==="android"?"rounded-[1.15rem]":"rounded-[1.35rem]")}><item.icon className="size-6"/></span>{item.label}</button>)}</div>
            <div className={cn("mt-auto bg-white/10 p-3 backdrop-blur-xl",os==="android"?"rounded-[1.4rem]":"rounded-[2rem]")}><div className="grid grid-cols-3 gap-2"><button onClick={()=>open("messages")} className="grid h-12 place-items-center rounded-2xl bg-white/15"><MessageSquare className="size-5"/></button><button onClick={()=>open("browser")} className="grid h-12 place-items-center rounded-2xl bg-white/15"><Globe2 className="size-5"/></button><button onClick={()=>open("settings")} className="grid h-12 place-items-center rounded-2xl bg-white/15"><Settings className="size-5"/></button></div></div>
          </div> : <div className={cn("absolute inset-0 flex flex-col pt-8 text-slate-900",os==="android"?"bg-[#f7f8f6]":"bg-[#f2f2f7]")}>
            <div className={cn("flex h-12 items-center gap-2 border-b px-3",os==="android"?"border-slate-200 bg-[#f7f8f6]":"border-slate-200/80 bg-white/95 backdrop-blur")}><button onClick={()=>{setApp(null);setSettingsPage("main")}} className="grid size-11 place-items-center rounded-full hover:bg-slate-100 active:bg-slate-200"><ChevronLeft className="size-5"/></button><b className="capitalize">{app}</b><button onClick={()=>setApp(null)} className="ml-auto grid size-11 place-items-center rounded-full hover:bg-slate-100 active:bg-slate-200" aria-label="Close app"><X className="size-4"/></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {app==="settings"?<div>
                {settingsPage!=="main"?<button onClick={()=>setSettingsPage("main")} className="m-2 min-h-11 rounded-lg px-2 text-xs font-semibold text-blue-600 active:bg-blue-50">‹ Settings</button>:null}
                {settingsPage==="main"?<div className={cn("m-3 overflow-hidden bg-white",os==="android"?"rounded-[1.4rem] shadow-sm":"rounded-xl border border-slate-200/70")}><div className={cn("px-4 pt-4 pb-2",os==="android"?"text-lg font-semibold":"text-xs font-semibold uppercase tracking-wide text-slate-400")}>{os==="android"?"Settings":"Device settings"}</div><SettingRow title={os==="android"?"Network & internet":"Wi-Fi"} detail={wifiOnline?"Training Wi-Fi connected":state.wifiEnabled?"Wi-Fi enabled · not connected":"Wi-Fi off"} onClick={()=>setSettingsPage("network")}/><SettingRow title="Bluetooth" detail={state.bluetoothEnabled?"On":"Off"} onClick={()=>setSettingsPage("bluetooth")}/><SettingRow title="Cellular & SIM" detail={state.simActive&&state.cellularEnabled&&!state.airplaneMode?"Connected":state.simActive?"Cellular off":"SIM unavailable"} onClick={()=>setSettingsPage("cellular")}/><SettingRow title="Battery" detail={state.battery+"% · "+state.batteryHealth+"% health"} onClick={()=>setSettingsPage("battery")}/><SettingRow title="Storage" detail={state.storageUsed+"% used"} onClick={()=>setSettingsPage("storage")}/><SettingRow title={os==="android"?"Apps & permissions":"Privacy & app access"} detail={state.installedApps.length+" installed apps"} onClick={()=>setSettingsPage("apps")}/><SettingRow title="Privacy & security" detail="Permissions and device protection" onClick={()=>setSettingsPage("security")}/><SettingRow title={os==="android"?"Accounts & sync":"Account & cloud"} detail="student@itpath.local" onClick={()=>setSettingsPage("sync")}/><SettingRow title={os==="android"?"System & updates":"General & software update"} detail={state.updateAvailable&&!state.updateInstalled?"Update available":"Up to date"} onClick={()=>setSettingsPage("system")}/></div>:null}
                {settingsPage==="network"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Wi-Fi</b><span className="text-xs text-slate-500">Training Wi-Fi</span></span><Toggle on={state.wifiEnabled&&!state.airplaneMode} onClick={toggleWifi}/></div></div><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Airplane mode</b><span className="text-xs text-slate-500">Disable wireless connections</span></span><Toggle on={state.airplaneMode} onClick={toggleAirplane}/></div></div><div className="rounded-2xl bg-white p-4 text-xs shadow-sm"><b>Connection details</b><p className="mt-2 text-slate-500">Address: {iface.ip}</p><p className="text-slate-500">Gateway: {iface.gateway||"None"}</p><p className="text-slate-500">DNS: {state.machine.dnsServers.join(", ")||"None"}</p><p className={cn("mt-2 font-semibold",state.networkCacheStale?"text-amber-600":"text-emerald-600")}>Local network state: {state.networkCacheStale?"Stale":"Current"}</p>{state.networkCacheStale?<button onClick={clearNetworkState} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white">Reset local network state</button>:null}</div></div>:null}
                {settingsPage==="cellular"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Mobile network</b><p className="mt-1 text-xs text-slate-500">{state.simType==="esim"?"eSIM":"Physical SIM"} · {state.simActive?"Active":"Inactive"}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Cellular data</span><Toggle on={state.cellularEnabled} onClick={toggleCellular}/></div><div className="mt-1 text-[10px] text-slate-400">{state.airplaneMode?"Temporarily unavailable while airplane mode is on.":"Cellular preference is "+(state.cellularEnabled?"enabled.":"disabled.")}</div><div className="mt-3 flex items-center justify-between"><span className="text-xs">SIM active</span><Toggle on={state.simActive} onClick={toggleSim}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">Personal hotspot</span><Toggle on={state.hotspotEnabled} onClick={toggleHotspot}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">VPN</span><Toggle on={state.vpnEnabled} onClick={()=>patch({vpnEnabled:!state.vpnEnabled})}/></div></div></div>:null}
                {settingsPage==="battery"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><BatteryFull className="size-7 text-emerald-600"/><b className="mt-3 block">Battery</b><p className="mt-1 text-xs text-slate-500">{state.battery}% charge · {state.batteryHealth}% maximum health · {state.charging?"charging":"on battery"}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Connected to charger</span><Toggle on={state.charging} onClick={()=>patch({charging:!state.charging,battery:!state.charging?Math.max(state.battery,55):state.battery})}/></div><div className="mt-4 flex items-center justify-between"><span className="text-xs">Restrict background activity</span><Toggle on={state.backgroundRestricted} onClick={()=>patch({backgroundRestricted:!state.backgroundRestricted})}/></div><p className="mt-3 text-[10px] text-slate-400">{state.backgroundRestricted?"Background-heavy apps are restricted.":"Background apps may continue using power."}</p></div></div>:null}
                {settingsPage==="system"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">{os==="android"?"System update":"Software Update"}</b><p className="mt-1 text-xs text-slate-500">{state.updateInstalled?"Latest training update installed.":state.updateAvailable?"A training system update is ready.":"Device is up to date."}</p>{state.updateAvailable&&!state.updateInstalled?<button onClick={()=>update(current=>updateReady?{...current,updateInstalled:true,updateAvailable:false}:{...current,notifications:["Update needs a network connection, at least 50% battery, and free storage.",...current.notifications]})} className={cn("mt-4 rounded-xl px-3 py-2 text-xs font-semibold text-white",updateReady?"bg-blue-600":"bg-slate-400")}>Install update</button>:null}</div><div className="rounded-2xl bg-white p-4 text-xs shadow-sm"><b>Device information</b><p className="mt-2 text-slate-500">Name: {state.machine.hostname}</p><p className="text-slate-500">Platform: {os==="android"?"IT PATH Mobile · Android-style support model":"PathOS Pocket · iOS-style support model"}</p><p className="text-slate-500">Management: {state.managementProfile?"Enrolled":"Not enrolled"}</p></div></div>:null}
                {settingsPage==="bluetooth"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Bluetooth</b><span className="text-xs text-slate-500">{state.bluetoothEnabled?"Ready for nearby devices":"Disabled"}</span></span><Toggle on={state.bluetoothEnabled} onClick={toggleBluetooth}/></div></div>{state.bluetoothEnabled?<div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Devices</b><p className="mt-1 text-xs text-slate-500">IT PATH Buds</p><button onClick={()=>patch({pairedBluetooth:state.pairedBluetooth.includes("IT PATH Buds")?state.pairedBluetooth.filter(item=>item!=="IT PATH Buds"):[...state.pairedBluetooth,"IT PATH Buds"]})} className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">{state.pairedBluetooth.includes("IT PATH Buds")?"Forget device":"Pair device"}</button><p className="mt-2 text-[10px] text-slate-400">{state.pairedBluetooth.includes("IT PATH Buds")?"Connected and available for audio.":"Nearby · not paired"}</p></div>:null}</div>:null}
                {settingsPage==="storage"?<div className="m-3 rounded-2xl bg-white p-4 shadow-sm"><b>Device storage</b><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-500" style={{width:state.storageUsed+"%"}}/></div><p className="mt-2 text-xs text-slate-500">{state.storageUsed}% used · training data, apps, photos and cache</p><button onClick={()=>update(current=>({...current,storageUsed:Math.max(20,current.storageUsed-Math.min(12,current.installedApps.reduce((sum,item)=>sum+item.cacheMb,0)/100)),installedApps:current.installedApps.map(item=>({...item,cacheMb:0})), files:clearTemporaryFiles(current.files)}),"storage")} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Clear temporary cache</button></div>:null}
                {settingsPage==="apps"?<div className="m-3 space-y-2"><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">{os==="android"?"App management":"Privacy & background access"}</b><p className="mt-1 text-xs text-slate-500">{os==="android"?"Inspect each app’s enabled state, temporary data, permissions and background use.":"Review per-app privacy access here. Background Refresh is managed separately from cache and app enablement."}</p>{os==="phone"?<div className="mt-3 flex items-center justify-between"><span className="text-xs">Background Refresh</span><Toggle on={state.backgroundRefresh} onClick={()=>patch({backgroundRefresh:!state.backgroundRefresh})}/></div>:null}</div>{state.installedApps.map(item=><div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><b className="block text-sm">{item.name}</b><span className="text-[11px] text-slate-500">{item.permission} · {item.cacheMb} MB cache</span><span className="mt-1 block text-[10px] text-slate-400">{item.enabled?"Enabled":"Disabled"} · permission {item.permissionGranted===false?"denied":"allowed"}{item.backgroundUse?" · background use":""}</span></span>{os==="android"?<button onClick={()=>update(current=>({...current,installedApps:current.installedApps.map(app=>app.id===item.id?{...app,cacheMb:0}:app)}))} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold">Clear cache</button>:<span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Privacy</span>}</div><div className="mt-3 grid grid-cols-2 gap-2">{os==="android"?<button onClick={()=>update(current=>({...current,installedApps:current.installedApps.map(app=>app.id===item.id?{...app,enabled:!app.enabled}:app)}))} className="rounded-lg border px-2 py-1.5 text-[10px] font-semibold">{item.enabled?"Disable app":"Enable app"}</button>:<span className="rounded-lg border px-2 py-1.5 text-center text-[10px] text-slate-500">Installed</span>}<button onClick={()=>update(current=>({...current,installedApps:current.installedApps.map(app=>app.id===item.id?{...app,permissionGranted:app.permissionGranted===false}:app)}))} className="rounded-lg border px-2 py-1.5 text-[10px] font-semibold">{item.permissionGranted===false?"Allow permission":"Deny permission"}</button></div></div>)}</div>:null}
                {settingsPage==="security"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><ShieldCheck className="size-7 text-emerald-600"/><b className="mt-3 block">Device protection</b><div className="mt-4 flex items-center justify-between"><span className="text-xs">Screen lock</span><Toggle on={state.screenLock} onClick={()=>patch({screenLock:!state.screenLock})}/></div></div><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Management profile</b><p className="mt-1 text-xs text-slate-500">{state.managementProfile?"IT PATH Training Management is installed.":"No management profile installed."}</p><button onClick={toggleManagementProfile} className="mt-3 min-h-11 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">{state.managementProfile?"Remove training profile":"Install training profile"}</button></div><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Configuration profiles</b>{state.installedProfiles.map(profile=><div key={profile} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><span className="min-w-0 truncate text-xs">{profile}</span>{profile!=="corp-wifi.mobileconfig"?<button onClick={()=>removeProfile(profile)} className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">Remove</button>:null}</div>)}</div></div>:null}
                {settingsPage==="sync"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><UserRound className="size-7 text-blue-600"/><b className="mt-3 block">IT PATH Student</b><p className="text-xs text-slate-500">student@itpath.local</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Mail sync</span><Toggle on={state.mailSync} onClick={()=>patch({mailSync:!state.mailSync})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">Cloud sync</span><Toggle on={state.cloudSync} onClick={()=>patch({cloudSync:!state.cloudSync})}/></div></div></div>:null}
                {settingsPage==="account"?<div className="m-3 rounded-2xl bg-white p-4 shadow-sm"><UserRound className="size-7 text-blue-600"/><b className="mt-3 block">IT PATH Student</b><p className="text-xs text-slate-500">student@itpath.local</p><p className={cn("mt-4 text-xs",state.managementProfile?"text-emerald-600":"text-amber-600")}>Management status: {state.managementProfile?"enrolled":"not enrolled"}</p></div>:null}
              </div>:null}
              {app==="files"?<div className="p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">{os==="android"?"Internal storage":"Browse"}</h2><span className="text-xs text-slate-500">{state.files.length} files</span></div><div className="mt-3 space-y-2">{state.files.map(file=><div key={file.path} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="min-w-0"><p className="truncate text-xs font-semibold">{file.path}</p><p className="text-[10px] text-slate-500">{Math.round(file.bytes/1024)} KB · {file.kind}</p></div>{file.kind==="cache"?<button onClick={()=>update(current=>({...current,files:current.files.filter(item=>item.path!==file.path)}),"files")} className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold">Delete</button>:<span className="text-[10px] text-slate-400">User data</span>}</div>)}</div></div>:null}
              {app==="browser"?<div className="p-4"><div className="rounded-xl border bg-white p-3 text-xs text-slate-500">https://support.itpath.local</div><div className="mt-4 rounded-2xl bg-white p-5 shadow-sm"><Globe2 className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">IT PATH Support</h2><p className="mt-2 text-xs text-slate-500">{!mobileOnline&&state.airplaneMode?"Airplane mode is on and no Wi-Fi connection is available.":mobileOnline?(state.networkCacheStale?"The device is connected, but stale local network state is sending this request to the wrong destination.":"The simulated support portal is reachable."):"No usable Wi-Fi or cellular data connection is available."}</p><p className="mt-3 text-[10px] text-slate-400">Path: {wifiOnline?"Wi-Fi":cellularOnline?"Cellular":"Offline"} · VPN {state.vpnEnabled?"on":"off"}</p></div></div>:null}
              {app==="messages"?<div className="p-4"><div className="rounded-2xl bg-white p-4 shadow-sm"><b>IT Support</b><p className="mt-2 text-sm text-slate-600">Your training device is ready. Future mobile tickets will arrive here as realistic user symptoms and support messages.</p></div></div>:null}
              {app==="photos"?<div className="p-4">{photosApp?.permissionGranted===false?<div className="rounded-2xl bg-white p-5 shadow-sm"><Image className="size-8 text-amber-600"/><h2 className="mt-3 font-semibold">Photos access required</h2><p className="mt-2 text-xs text-slate-500">The app is installed, but access to photos and media is denied. Change the app permission in Settings.</p></div>:<div className="grid grid-cols-3 gap-2">{Array.from({length:9},(_,i)=><div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-sky-200 to-indigo-300"/>)}</div>}</div>:null}
              {app==="account"?<div className="p-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><UserRound className="size-9 text-blue-600"/><h2 className="mt-3 font-semibold">IT PATH Student</h2><p className="text-xs text-slate-500">Managed training account</p><p className={cn("mt-4 text-xs",workServicesReady?"text-emerald-600":"text-amber-600")}>{!state.accountSignedIn?"Account signed out":!state.managementProfile?"Device is not managed":"Account and device enrollment active"}</p><button onClick={()=>patch({accountSignedIn:!state.accountSignedIn,cloudSync:!state.accountSignedIn?true:false})} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">{state.accountSignedIn?"Sign out":"Sign in"}</button></div></div>:null}
              {app==="apps"?<div className="p-4 space-y-3"><h2 className="font-semibold">Installed apps</h2>{state.installedApps.map(item=><div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">{item.name}</b><p className="mt-1 text-xs text-slate-500">{item.permission}</p><p className="mt-1 text-xs text-slate-400">{item.cacheMb} MB temporary data</p></div>)}</div>:null}
              {app==="mail"?<div className="p-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><Mail className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">Work Mail</h2><p className="mt-2 text-xs text-slate-500">{!mailApp?.enabled?"Mail is disabled on this device.":!mailOperational?"Mail closes while opening because its temporary app data is corrupted.":!mobileOnline?"Mail cannot reach the server. Check Wi-Fi, cellular data, SIM state, or airplane mode.":!state.mailSync?"Mail sync is paused. New messages will not arrive automatically.":state.backgroundRestricted?"Background activity is restricted; delivery may be delayed until Mail is opened.":!state.notificationPermission?"Mail is syncing, but notifications are blocked.":"Mail is connected and syncing normally."}</p><button onClick={()=>patch({mailSync:!state.mailSync})} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">{state.mailSync?"Pause sync":"Resume sync"}</button><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-xs">Notifications</span><Toggle on={state.notificationPermission} onClick={()=>patch({notificationPermission:!state.notificationPermission})}/></div></div></div>:null}
              {app==="console"?<div className="flex h-full flex-col bg-slate-950 p-3 font-mono text-[11px] text-slate-100"><div className="mb-2 rounded-lg bg-white/5 p-2 text-slate-400">{os==="android"?"Simulated Android support shell. Type help for available commands.":"Simulated managed-device support console. Type help for available commands."}</div><div className="min-h-0 flex-1 overflow-y-auto">{consoleLines.map((line,i)=><div key={i} className="mb-3"><p className="text-cyan-300">$ {line.command}</p><pre className={cn("whitespace-pre-wrap",line.error?"text-red-300":"text-slate-300")}>{line.output}</pre></div>)}</div><form onSubmit={e=>{e.preventDefault();runMobileConsole()}} className="mt-2 flex gap-2"><input value={consoleCommand} onChange={e=>setConsoleCommand(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none" placeholder="help"/><button className="rounded-lg bg-cyan-500 px-3 py-2 font-sans font-semibold text-slate-950">Run</button></form></div>:null}
              {app==="support"?<div className="p-4 space-y-3"><div className="rounded-2xl bg-white p-5 shadow-sm"><ShieldCheck className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">Device health</h2><div className="mt-4 space-y-2 text-xs"><p>Wi-Fi <b className="float-right">{state.wifiEnabled&&iface.up?"On":"Off"}</b></p><p>Cellular <b className="float-right">{state.cellularEnabled&&state.simActive&&!state.airplaneMode?"Ready":"Unavailable"}</b></p><p>Mail sync <b className="float-right">{state.mailSync?"On":"Off"}</b></p><p>Account <b className="float-right">{state.accountSignedIn?"Signed in":"Signed out"}</b></p><p>Management <b className="float-right">{state.managementProfile?"Enrolled":"Missing"}</b></p><p>Bluetooth accessory <b className="float-right">{state.bluetoothEnabled&&state.pairedBluetooth.length?"Connected":"Unavailable"}</b></p><p>Storage <b className={cn("float-right",storageCritical&&"text-red-600")}>{state.storageUsed}% used{storageCritical?" · critical":""}</b></p><p>Network path <b className="float-right">{wifiOnline?"Wi-Fi":cellularOnline?"Cellular":"Offline"}</b></p><p>Battery health <b className="float-right">{state.batteryHealth}%</b></p></div></div></div>:null}
              {notice?<div className="mx-4 mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">{notice}</div>:null}
            </div>
          </div>}

          {shade?<div className={cn("absolute z-50 bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-xl",os==="android"?"inset-x-2 top-9 rounded-[1.5rem]":"right-2 top-9 w-[78%] rounded-[2rem] border border-white/10")}><div className={cn("grid gap-3",os==="android"?"grid-cols-3":"grid-cols-2")}><button onClick={toggleWifi} className={cn("min-h-14 rounded-2xl p-3 text-center text-[10px] transition active:scale-95",state.wifiEnabled&&!state.airplaneMode?"bg-blue-500":"bg-white/10")}><Wifi className="mx-auto mb-1 size-5"/>Wi-Fi</button><button onClick={toggleBluetooth} className={cn("min-h-14 rounded-2xl p-3 text-center text-[10px] transition active:scale-95",state.bluetoothEnabled?"bg-blue-500":"bg-white/10")}><Bluetooth className="mx-auto mb-1 size-5"/>Bluetooth</button><button onClick={toggleAirplane} className={cn("min-h-14 rounded-2xl p-3 text-center text-[10px] transition active:scale-95",state.airplaneMode?"bg-blue-500":"bg-white/10")}><Phone className="mx-auto mb-1 size-5"/>Airplane</button></div><div className="mt-4 border-t border-white/10 pt-3"><b className="text-xs">Notifications</b>{state.notifications.map((n,i)=><p key={i} className="mt-2 rounded-xl bg-white/10 p-2 text-[10px]">{n}</p>)}</div></div>:null}
        </div>

        <div className="absolute inset-x-0 bottom-1 z-40 flex items-center justify-center">
          {os==="android"?<div className="flex w-full items-center justify-around px-20 text-slate-400"><button onClick={()=>{setApp(null);setSettingsPage("main");setShade(false)}} className="grid size-11 place-items-center touch-manipulation" aria-label="Back">‹</button><button onClick={()=>{setApp(null);setSettingsPage("main");setShade(false)}} className="grid size-11 place-items-center rounded-full" aria-label="Home"><span className="size-3 rounded-full border-2 border-current"/></button><button onClick={()=>setNotice("Recent apps are represented by the currently open training app.")} className="grid size-11 place-items-center" aria-label="Recent apps"><span className="size-3 rounded-sm border-2 border-current"/></button></div>:<button onClick={()=>{setApp(null);setSettingsPage("main");setShade(false)}} className={cn("h-1.5 w-28 rounded-full",app?"bg-slate-400":"bg-white/70")} aria-label="Home"/>}
        </div>
      </div>
    </main>
  </div>;
}
