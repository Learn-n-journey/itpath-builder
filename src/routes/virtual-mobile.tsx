import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BatteryFull, Bluetooth, ChevronLeft, Download, Folder, Globe2, Image, KeyRound, Mail, MessageSquare, Phone, RotateCcw, Settings, ShieldCheck, Smartphone, Trash2, UserRound, Wifi, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTrainingTickets, type MobileTrainingTicket } from "@/lib/training/mobile-tickets";
import { createMachine, primaryInterface, setServiceStatus, type MachineState } from "@/lib/terminal/machine";
import { execute } from "@/lib/terminal/shells";
import { applyTrainingNetworkAction, observeTrainingNetwork } from "@/lib/training/network-capabilities";

export const Route = createFileRoute("/virtual-mobile")({
  validateSearch: (search: Record<string, unknown>): { activity?: "lab"; lab?: string; topic?: string } => ({
    ...(search.activity === "lab" ? { activity:"lab" as const } : {}),
    ...(typeof search.lab === "string" ? { lab:search.lab } : {}),
    ...(typeof search.topic === "string" ? { topic:search.topic } : {}),
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
  updateAvailable: boolean;
  updateInstalled: boolean;
  notificationPermission: boolean;
  installedProfiles: string[];
  networkCacheStale: boolean;
  pairedBluetooth: string[];
  charging: boolean;
  accountSignedIn: boolean;
};

const STORAGE_KEY = "itpath-virtual-mobile-v1";

function freshMobile(os: MobileOs): MobileState {
  const shell = os === "android" ? "android" : "ios";
  const machine = createMachine({ shell, hostname: os === "android" ? "path-mobile-a" : "path-mobile-p" });
  return {
    machine,
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
  const [os, setOs] = useState<MobileOs>("android");
  const [devices, setDevices] = useState<Record<MobileOs, MobileState>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
        if (saved?.android?.machine && saved?.phone?.machine) {
          const hydrate = (value: MobileState, kind: MobileOs): MobileState => ({ ...freshMobile(kind), ...value, installedApps: value.installedApps ?? freshMobile(kind).installedApps });
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
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketBaseline, setTicketBaseline] = useState<MobileState | null>(null);
  const [ticketVerified, setTicketVerified] = useState(false);
  const [gaylLevel, setGaylLevel] = useState(0);
  const [consoleCommand, setConsoleCommand] = useState("");
  const [consoleLines, setConsoleLines] = useState<{command:string;output:string;error:boolean}[]>([]);
  const [ticketHistory, setTicketHistory] = useState<{id:string;title:string;os:MobileOs;assisted:boolean;completedAt:string}[]>(() => {
    if(typeof window==="undefined") return [];
    try { return JSON.parse(localStorage.getItem("itpath-mobile-ticket-history-v1") || "[]"); } catch { return []; }
  });

  const state = devices[os];
  const iface = useMemo(() => primaryInterface(state.machine), [state.machine]);
  const network = useMemo(() => observeTrainingNetwork(state.machine), [state.machine]);
  const mobileOnline = !state.airplaneMode && ((state.wifiEnabled && network.localReady) || (state.cellularEnabled && state.simActive));
  const storageCritical = state.storageUsed >= 95;
  const mailApp = state.installedApps.find(item=>item.id==="mail");
  const mailOperational = Boolean(mailApp?.enabled) && (mailApp?.cacheMb ?? 0) < 400;
  const photosApp = state.installedApps.find(item=>item.id==="photos");
  const browserApp = state.installedApps.find(item=>item.id==="browser");
  const updateReady = mobileOnline && state.battery >= 50 && !storageCritical;
  const workServicesReady = state.accountSignedIn && state.managementProfile;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  }, [devices]);
  useEffect(() => {
    localStorage.setItem("itpath-mobile-ticket-history-v1", JSON.stringify(ticketHistory.slice(0,50)));
  }, [ticketHistory]);

  const update = (fn: (draft: MobileState) => MobileState) => setDevices(current => ({ ...current, [os]: fn(current[os]) }));
  const patch = (values: Partial<MobileState>) => update(current => ({ ...current, ...values }));

  const toggleWifi = () => update(current => {
    const next = !current.wifiEnabled;
    const network = observeTrainingNetwork(current.machine);
    const machine = applyTrainingNetworkAction(current.machine, { type: "set-interface", name: network.interfaceName, up: next && !current.airplaneMode });
    return { ...current, machine, wifiEnabled: next };
  });
  const toggleBluetooth = () => update(current => {
    const next = !current.bluetoothEnabled;
    const machine = structuredClone(current.machine);
    setServiceStatus(machine, "bluetooth", next ? "running" : "stopped");
    return { ...current, machine, bluetoothEnabled: next };
  });
  const toggleAirplane = () => update(current => {
    const next = !current.airplaneMode;
    const network = observeTrainingNetwork(current.machine);
    const machine = applyTrainingNetworkAction(current.machine, { type: "set-interface", name: network.interfaceName, up: !next && current.wifiEnabled });
    return { ...current, machine, airplaneMode: next, cellularEnabled: next ? false : current.cellularEnabled };
  });
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
    }
  })() : false;

  const startTicket = (ticket: MobileTrainingTicket) => {
    const target = ticket.os;
    setTicketBaseline(structuredClone(devices[target]));
    setOs(target);
    setDevices(current => {
      const next = structuredClone(current[target]);
      if (ticket.fault==="battery-drain") { next.backgroundRestricted=false; next.battery=38; next.installedApps=next.installedApps.map(item=>item.id==="mail"?{...item,backgroundUse:true}:item); }
      if (ticket.fault==="wifi-off") { next.wifiEnabled=false; primaryInterface(next.machine).up=false; }
      if (ticket.fault==="mail-cache") next.installedApps=next.installedApps.map(item=>item.id==="mail"?{...item,cacheMb:486}:item);
      if (ticket.fault==="cloud-sync-off" || ticket.fault==="account-sync-off") next.cloudSync=false;
      if (ticket.fault==="legacy-profile" && !next.installedProfiles.includes("legacy-restrictions.mobileconfig")) next.installedProfiles.push("legacy-restrictions.mobileconfig");
      if (ticket.fault==="network-cache") next.networkCacheStale=true;
      if (ticket.fault==="bluetooth-off") next.bluetoothEnabled=false;
      if (ticket.fault==="mail-sync-off") next.mailSync=false;
      if (ticket.fault==="retired-profile" && !next.installedProfiles.includes("retired-test.mobileconfig")) next.installedProfiles.push("retired-test.mobileconfig");
      if (ticket.fault==="storage-full") { next.storageUsed=98; next.installedApps=next.installedApps.map(item=>({...item,cacheMb:item.cacheMb+650})); }
      if (ticket.fault==="notifications-blocked") { next.notificationPermission=false; next.mailSync=true; }
      if (ticket.fault==="sim-disabled") { next.simActive=false; next.cellularEnabled=true; next.wifiEnabled=true; }
      if (ticket.fault==="bluetooth-unpaired") { next.bluetoothEnabled=true; next.pairedBluetooth=next.pairedBluetooth.filter(item=>item!=="IT PATH Buds"); }
      if (ticket.fault==="photos-permission") next.installedApps=next.installedApps.map(item=>item.id==="photos"?{...item,permissionGranted:false}:item);
      if (ticket.fault==="update-prereq") { next.updateAvailable=true; next.updateInstalled=false; next.battery=24; }
      if (ticket.fault==="account-signed-out") { next.accountSignedIn=false; next.cloudSync=false; }
      next.notifications=[ticket.brief,...next.notifications];
      return {...current,[target]:next};
    });
    setActiveTicketId(ticket.id); setTicketVerified(false); setGaylLevel(0); setApp(null); setSettingsPage("main"); setTicketOpen(true);
  };
  const cancelTicket = () => {
    if(activeTicket && ticketBaseline) setDevices(current=>({...current,[activeTicket.os]:ticketBaseline}));
    setActiveTicketId(null); setTicketBaseline(null); setTicketVerified(false); setGaylLevel(0); setApp(null); setTicketOpen(false);
  };
  const verifyTicket = () => {
    setTicketVerified(ticketResolved);
    setNotice(ticketResolved ? "Fix verified against the simulated device state." : "The device still shows evidence of the problem.");
  };
  const closeTicket = () => {
    if(!ticketResolved || !activeTicket)return;
    setTicketHistory(history=>[{id:activeTicket.id,title:activeTicket.title,os:activeTicket.os,assisted:gaylLevel>0,completedAt:new Date().toISOString()},...history].slice(0,50));
    setActiveTicketId(null); setTicketBaseline(null); setTicketVerified(false); setGaylLevel(0); setTicketOpen(false); setConsoleLines([]);
  };
  const syncUiFromMachine = (machine:MachineState) => update(current => {
    const service = (name:string) => machine.services.find(item=>item.name===name)?.status === "running";
    return {
      ...current, machine,
      wifiEnabled: service("wifi") || current.wifiEnabled && primaryInterface(machine).up,
      bluetoothEnabled: service("bluetooth") || false,
      cellularEnabled: service("data") || service("cellular") || current.cellularEnabled,
      cloudSync: os==="phone" ? service("icloud") : service("sync"),
      mailSync: os==="phone" ? service("mail") : current.mailSync,
    };
  });
  const runMobileConsole = () => {
    const raw=consoleCommand.trim(); if(!raw)return;
    const result=execute(state.machine,raw);
    syncUiFromMachine(result.state);
    setConsoleLines(lines=>[...lines,{command:raw,output:result.output,error:result.error}].slice(-40));
    setConsoleCommand("");
  };
  const clearNetworkState = () => update(current => ({ ...current, networkCacheStale:false, machine: applyTrainingNetworkAction(current.machine, { type: "flush-dns" }) }));
  const removeProfile = (name:string) => update(current=>({...current,installedProfiles:current.installedProfiles.filter(item=>item!==name)}));

  const open = (next: MobileApp) => { setApp(next); setShade(false); setNotice(""); };
  const switchOs = (next: MobileOs) => { setOs(next); setApp(null); setSettingsPage("main"); setShade(false); setNotice(""); };

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

  const SettingRow = ({title,detail,onClick}:{title:string;detail:string;onClick:()=>void}) => <button onClick={onClick} className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-4 text-left last:border-0"><span><b className="block text-sm text-slate-900">{title}</b><span className="text-xs text-slate-500">{detail}</span></span><span className="text-slate-400">›</span></button>;
  const Toggle = ({on,onClick}:{on:boolean;onClick:()=>void}) => <button onClick={onClick} aria-pressed={on} className={cn("relative h-7 w-12 rounded-full transition",on?"bg-emerald-500":"bg-slate-300")}><span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition",on?"left-6":"left-1")}/></button>;

  return <div className="fixed inset-0 z-50 overflow-hidden bg-[#07111f] text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.16),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,.14),transparent_38%)]"/>
    <header className="absolute inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#07111f]/90 px-3 backdrop-blur-xl">
      <div className="flex items-center gap-2"><Link to="/dashboard" className="grid size-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Exit Virtual Mobile"><ChevronLeft className="size-5"/></Link><Smartphone className="size-5 text-cyan-300"/><div><b className="text-sm">Virtual Mobile</b><p className="text-[10px] text-slate-400">Shared mobile simulation foundation</p></div></div>
      <div className="flex items-center gap-2">{practiceMode?<span className="hidden rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-2 py-1.5 text-xs font-semibold text-emerald-100 sm:inline">Practice lab</span>:null}<button onClick={()=>setTicketOpen(v=>!v)} className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-2 py-1.5 text-xs font-semibold text-cyan-100">Tickets{activeTicket?" · 1":""}</button><select value={os} onChange={e=>switchOs(e.target.value as MobileOs)} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs"><option value="android" className="text-black">IT PATH Mobile</option><option value="phone" className="text-black">PathOS Pocket</option></select><button onClick={resetDevice} className="rounded-lg border border-white/10 px-2 py-1.5 text-xs hover:bg-white/10">Reset</button></div>
    </header>


    {ticketOpen?<div className="absolute right-3 top-16 z-[70] w-[min(25rem,94vw)] overflow-hidden rounded-2xl border border-white/15 bg-[#0d1b2e]/95 shadow-2xl backdrop-blur-2xl"><div className="flex items-center justify-between border-b border-white/10 p-4"><div><b>Mobile Help Desk</b><p className="text-[10px] text-slate-400">Problems are injected into the simulated device.</p></div><button onClick={()=>setTicketOpen(false)}><X className="size-4"/></button></div>{activeTicket?<div className="p-4"><div className="flex items-center justify-between"><span className="text-[10px] text-cyan-300">#{activeTicket.id.replace("mobile-","")} · {activeTicket.requester}</span><span className={cn("rounded-full px-2 py-1 text-[10px]",ticketResolved?"bg-emerald-500/20 text-emerald-300":"bg-amber-500/20 text-amber-200")}>{ticketResolved?"Resolved":"Open"}</span></div><h3 className="mt-2 font-semibold">{activeTicket.title}</h3><p className="mt-2 text-xs leading-5 text-slate-300">{activeTicket.brief}</p><div className="mt-3 rounded-xl bg-white/5 p-3"><b className="text-[10px] text-slate-300">VERIFY</b>{activeTicket.verification.map(item=><p key={item} className="mt-1 text-[10px] text-slate-400">• {item}</p>)}</div><div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3"><div className="flex items-center justify-between"><b className="text-xs text-violet-200">GAYL</b><button onClick={()=>setGaylLevel(level=>Math.min(level+1,activeTicket.hints.length))} className="rounded-lg border border-violet-300/25 px-2 py-1 text-[10px]">Give me a hint</button></div><p className="mt-2 text-xs leading-5 text-slate-300">{gaylLevel===0?"I’ll stay out of the way unless you need me.":activeTicket.hints[Math.min(gaylLevel-1,activeTicket.hints.length-1)]}</p></div>{notice?<p className="mt-3 text-xs text-cyan-200">{notice}</p>:null}<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={cancelTicket} className="rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">Cancel ticket</button>{ticketResolved?<button onClick={closeTicket} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950">Close resolved ticket</button>:<button onClick={verifyTicket} className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950">Verify fix</button>}</div></div>:<div className="max-h-[65vh] space-y-2 overflow-y-auto p-3">{mobileTrainingTickets.map(ticket=><button key={ticket.id} onClick={()=>startTicket(ticket)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-cyan-400/50"><div className="flex items-center justify-between"><span className="text-[10px] text-cyan-300">#{ticket.id.replace("mobile-","")} · {ticket.requester}</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px]">{ticket.os==="android"?"IT PATH Mobile":"PathOS Pocket"}</span></div><p className="mt-1 text-sm font-semibold">{ticket.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-400">{ticket.brief}</p></button>)}{ticketHistory.length?<div className="mt-4 border-t border-white/10 pt-3"><b className="px-1 text-[10px] uppercase tracking-wider text-slate-500">Recent completed</b>{ticketHistory.slice(0,5).map(item=><div key={item.id+item.completedAt} className="mt-2 rounded-xl bg-emerald-500/5 p-3"><div className="flex justify-between gap-2"><span className="text-xs text-slate-300">{item.title}</span><span className="text-[9px] text-emerald-300">{item.assisted?"GAYL assisted":"Independent"}</span></div></div>)}</div>:null}</div>}</div>:null}
    <main className="absolute inset-x-0 bottom-0 top-14 grid place-items-center overflow-auto p-3 sm:p-6">
      <div className={cn("relative h-[min(780px,calc(100vh-5rem))] w-[min(390px,94vw)] overflow-hidden border-[7px] border-slate-950 bg-slate-100 shadow-2xl",os==="android"?"rounded-[2.1rem]":"rounded-[3.2rem]")}>
        <div className="absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-between px-5 text-[10px] font-semibold text-white">
          <span>9:41</span><button onClick={()=>setShade(v=>!v)} className="flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 backdrop-blur"><Wifi className={cn("size-3",(!state.wifiEnabled||state.airplaneMode)&&"opacity-35")}/><BatteryFull className="size-3"/><span>{state.battery}%</span></button>
        </div>
        {os==="phone"?<div className="absolute left-1/2 top-2 z-40 h-5 w-24 -translate-x-1/2 rounded-full bg-black"/>:<div className="absolute left-1/2 top-3 z-40 size-2 -translate-x-1/2 rounded-full bg-black"/>}

        <div className={cn("absolute inset-0",os==="android"?"bg-gradient-to-br from-cyan-700 via-blue-800 to-slate-950":"bg-gradient-to-br from-indigo-500 via-sky-600 to-slate-900")}>
          {!app ? <div className="flex h-full flex-col px-5 pb-20 pt-16">
            <div className="mb-8"><p className="text-sm text-white/70">Training device</p><h1 className="mt-1 text-3xl font-semibold">{os==="android"?"IT PATH Mobile":"PathOS Pocket"}</h1><p className="mt-2 text-xs text-white/65">{iface.up?"Connected to training Wi-Fi":"Offline"} · {Math.round(state.storageUsed)}% storage used</p></div>
            <div className="grid grid-cols-3 gap-x-5 gap-y-6">{apps.map(item=><button key={item.id} onClick={()=>open(item.id)} className="group flex flex-col items-center gap-2 text-xs"><span className="grid size-14 place-items-center rounded-2xl bg-white/90 text-slate-800 shadow-lg transition group-active:scale-95"><item.icon className="size-6"/></span>{item.label}</button>)}</div>
            <div className="mt-auto rounded-3xl bg-white/10 p-3 backdrop-blur-xl"><div className="grid grid-cols-3 gap-2"><button onClick={()=>open("messages")} className="grid h-12 place-items-center rounded-2xl bg-white/15"><MessageSquare className="size-5"/></button><button onClick={()=>open("browser")} className="grid h-12 place-items-center rounded-2xl bg-white/15"><Globe2 className="size-5"/></button><button onClick={()=>open("settings")} className="grid h-12 place-items-center rounded-2xl bg-white/15"><Settings className="size-5"/></button></div></div>
          </div> : <div className="absolute inset-0 flex flex-col bg-slate-50 pt-8 text-slate-900">
            <div className="flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-3"><button onClick={()=>{setApp(null);setSettingsPage("main")}} className="grid size-8 place-items-center rounded-full hover:bg-slate-100"><ChevronLeft className="size-5"/></button><b className="capitalize">{app}</b><button onClick={()=>setApp(null)} className="ml-auto grid size-8 place-items-center rounded-full hover:bg-slate-100" aria-label="Close app"><X className="size-4"/></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {app==="settings"?<div>
                {settingsPage!=="main"?<button onClick={()=>setSettingsPage("main")} className="m-3 text-xs font-semibold text-blue-600">‹ Settings</button>:null}
                {settingsPage==="main"?<div className="m-3 overflow-hidden rounded-2xl bg-white shadow-sm"><SettingRow title="Network & internet" detail={state.wifiEnabled&&!state.airplaneMode?"Training Wi-Fi connected":"Offline"} onClick={()=>setSettingsPage("network")}/><SettingRow title="Bluetooth" detail={state.bluetoothEnabled?"On":"Off"} onClick={()=>setSettingsPage("bluetooth")}/><SettingRow title="Cellular & SIM" detail={state.simActive&&state.cellularEnabled&&!state.airplaneMode?"Connected":state.simActive?"Cellular off":"SIM unavailable"} onClick={()=>setSettingsPage("cellular")}/><SettingRow title="Battery" detail={state.battery+"% · "+state.batteryHealth+"% health"} onClick={()=>setSettingsPage("battery")}/><SettingRow title="Storage" detail={state.storageUsed+"% used"} onClick={()=>setSettingsPage("storage")}/><SettingRow title="Apps & permissions" detail={state.installedApps.length+" installed apps"} onClick={()=>setSettingsPage("apps")}/><SettingRow title="Privacy & security" detail="Permissions and device protection" onClick={()=>setSettingsPage("security")}/><SettingRow title="Accounts & sync" detail="student@itpath.local" onClick={()=>setSettingsPage("sync")}/><SettingRow title="System & updates" detail={state.updateAvailable&&!state.updateInstalled?"Update available":"Up to date"} onClick={()=>setSettingsPage("system")}/></div>:null}
                {settingsPage==="network"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Wi-Fi</b><span className="text-xs text-slate-500">Training Wi-Fi</span></span><Toggle on={state.wifiEnabled&&!state.airplaneMode} onClick={toggleWifi}/></div></div><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Airplane mode</b><span className="text-xs text-slate-500">Disable wireless connections</span></span><Toggle on={state.airplaneMode} onClick={toggleAirplane}/></div></div><div className="rounded-2xl bg-white p-4 text-xs shadow-sm"><b>Connection details</b><p className="mt-2 text-slate-500">Address: {iface.ip}</p><p className="text-slate-500">Gateway: {iface.gateway||"None"}</p><p className="text-slate-500">DNS: {iface.dns.join(", ")||"None"}</p><p className={cn("mt-2 font-semibold",state.networkCacheStale?"text-amber-600":"text-emerald-600")}>Local network state: {state.networkCacheStale?"Stale":"Current"}</p>{state.networkCacheStale?<button onClick={clearNetworkState} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-semibold text-white">Reset local network state</button>:null}</div></div>:null}
                {settingsPage==="cellular"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Mobile network</b><p className="mt-1 text-xs text-slate-500">{state.simType==="esim"?"eSIM":"Physical SIM"} · {state.simActive?"Active":"Inactive"}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Cellular data</span><Toggle on={state.cellularEnabled&&!state.airplaneMode} onClick={()=>patch({cellularEnabled:!state.cellularEnabled})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">SIM active</span><Toggle on={state.simActive} onClick={()=>patch({simActive:!state.simActive})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">Personal hotspot</span><Toggle on={state.hotspotEnabled} onClick={()=>patch({hotspotEnabled:!state.hotspotEnabled && state.cellularEnabled && state.simActive && !state.airplaneMode})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">VPN</span><Toggle on={state.vpnEnabled} onClick={()=>patch({vpnEnabled:!state.vpnEnabled})}/></div></div></div>:null}
                {settingsPage==="battery"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><BatteryFull className="size-7 text-emerald-600"/><b className="mt-3 block">Battery</b><p className="mt-1 text-xs text-slate-500">{state.battery}% charge · {state.batteryHealth}% maximum health · {state.charging?"charging":"on battery"}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Connected to charger</span><Toggle on={state.charging} onClick={()=>patch({charging:!state.charging,battery:!state.charging?Math.max(state.battery,55):state.battery})}/></div><div className="mt-4 flex items-center justify-between"><span className="text-xs">Restrict background activity</span><Toggle on={state.backgroundRestricted} onClick={()=>patch({backgroundRestricted:!state.backgroundRestricted})}/></div><p className="mt-3 text-[10px] text-slate-400">{state.backgroundRestricted?"Background-heavy apps are restricted.":"Background apps may continue using power."}</p></div></div>:null}
                {settingsPage==="system"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Software update</b><p className="mt-1 text-xs text-slate-500">{state.updateInstalled?"Latest training update installed.":state.updateAvailable?"A training system update is ready.":"Device is up to date."}</p>{state.updateAvailable&&!state.updateInstalled?<button onClick={()=>update(current=>updateReady?{...current,updateInstalled:true,updateAvailable:false}:{...current,notifications:["Update needs a network connection, at least 50% battery, and free storage.",...current.notifications]})} className={cn("mt-4 rounded-xl px-3 py-2 text-xs font-semibold text-white",updateReady?"bg-blue-600":"bg-slate-400")}>Install update</button>:null}</div><div className="rounded-2xl bg-white p-4 text-xs shadow-sm"><b>Device information</b><p className="mt-2 text-slate-500">Name: {state.machine.hostname}</p><p className="text-slate-500">Platform: {os==="android"?"IT PATH Mobile":"PathOS Pocket"}</p><p className="text-slate-500">Management: {state.managementProfile?"Enrolled":"Not enrolled"}</p></div></div>:null}
                {settingsPage==="bluetooth"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Bluetooth</b><span className="text-xs text-slate-500">{state.bluetoothEnabled?"Ready for nearby devices":"Disabled"}</span></span><Toggle on={state.bluetoothEnabled} onClick={toggleBluetooth}/></div></div>{state.bluetoothEnabled?<div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Devices</b><p className="mt-1 text-xs text-slate-500">IT PATH Buds</p><button onClick={()=>patch({pairedBluetooth:state.pairedBluetooth.includes("IT PATH Buds")?state.pairedBluetooth.filter(item=>item!=="IT PATH Buds"):[...state.pairedBluetooth,"IT PATH Buds"]})} className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">{state.pairedBluetooth.includes("IT PATH Buds")?"Forget device":"Pair device"}</button><p className="mt-2 text-[10px] text-slate-400">{state.pairedBluetooth.includes("IT PATH Buds")?"Connected and available for audio.":"Nearby · not paired"}</p></div>:null}</div>:null}
                {settingsPage==="storage"?<div className="m-3 rounded-2xl bg-white p-4 shadow-sm"><b>Device storage</b><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-500" style={{width:state.storageUsed+"%"}}/></div><p className="mt-2 text-xs text-slate-500">{state.storageUsed}% used · training data, apps, photos and cache</p><button onClick={()=>update(current=>({...current,storageUsed:Math.max(20,current.storageUsed-Math.min(12,current.installedApps.reduce((sum,item)=>sum+item.cacheMb,0)/100)),installedApps:current.installedApps.map(item=>({...item,cacheMb:0}))}))} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Clear temporary cache</button></div>:null}
                {settingsPage==="apps"?<div className="m-3 space-y-2">{state.installedApps.map(item=><div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><b className="block text-sm">{item.name}</b><span className="text-[11px] text-slate-500">{item.permission} · {item.cacheMb} MB cache</span><span className="mt-1 block text-[10px] text-slate-400">{item.enabled?"Enabled":"Disabled"} · permission {item.permissionGranted===false?"denied":"allowed"}{item.backgroundUse?" · background use":""}</span></span><button onClick={()=>update(current=>({...current,installedApps:current.installedApps.map(app=>app.id===item.id?{...app,cacheMb:0}:app)}))} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold">Clear cache</button></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>update(current=>({...current,installedApps:current.installedApps.map(app=>app.id===item.id?{...app,enabled:!app.enabled}:app)}))} className="rounded-lg border px-2 py-1.5 text-[10px] font-semibold">{item.enabled?"Disable app":"Enable app"}</button><button onClick={()=>update(current=>({...current,installedApps:current.installedApps.map(app=>app.id===item.id?{...app,permissionGranted:app.permissionGranted===false}:app)}))} className="rounded-lg border px-2 py-1.5 text-[10px] font-semibold">{item.permissionGranted===false?"Allow permission":"Deny permission"}</button></div></div>)}</div>:null}
                {settingsPage==="security"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><ShieldCheck className="size-7 text-emerald-600"/><b className="mt-3 block">Device protection</b><div className="mt-4 flex items-center justify-between"><span className="text-xs">Screen lock</span><Toggle on={state.screenLock} onClick={()=>patch({screenLock:!state.screenLock})}/></div></div><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Management profile</b><p className="mt-1 text-xs text-slate-500">{state.managementProfile?"IT PATH Training Management is installed.":"No management profile installed."}</p><button onClick={()=>patch({managementProfile:!state.managementProfile})} className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">{state.managementProfile?"Remove training profile":"Install training profile"}</button></div><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Configuration profiles</b>{state.installedProfiles.map(profile=><div key={profile} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><span className="min-w-0 truncate text-xs">{profile}</span>{profile!=="corp-wifi.mobileconfig"?<button onClick={()=>removeProfile(profile)} className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">Remove</button>:null}</div>)}</div></div>:null}
                {settingsPage==="sync"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><UserRound className="size-7 text-blue-600"/><b className="mt-3 block">IT PATH Student</b><p className="text-xs text-slate-500">student@itpath.local</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Mail sync</span><Toggle on={state.mailSync} onClick={()=>patch({mailSync:!state.mailSync})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">Cloud sync</span><Toggle on={state.cloudSync} onClick={()=>patch({cloudSync:!state.cloudSync})}/></div></div></div>:null}
                {settingsPage==="account"?<div className="m-3 rounded-2xl bg-white p-4 shadow-sm"><UserRound className="size-7 text-blue-600"/><b className="mt-3 block">IT PATH Student</b><p className="text-xs text-slate-500">student@itpath.local</p><p className="mt-4 text-xs text-emerald-600">Management status: enrolled</p></div>:null}
              </div>:null}
              {app==="files"?<div className="p-4"><h2 className="font-semibold">On this device</h2><div className="mt-3 grid grid-cols-2 gap-3">{["Downloads","Documents","Pictures","Support"].map(name=><button key={name} onClick={()=>setNotice(name+" folder opened. File-state integration comes next.")} className="rounded-2xl bg-white p-4 text-left shadow-sm"><Folder className="size-7 text-blue-500"/><b className="mt-3 block text-sm">{name}</b></button>)}</div></div>:null}
              {app==="browser"?<div className="p-4"><div className="rounded-xl border bg-white p-3 text-xs text-slate-500">https://support.itpath.local</div><div className="mt-4 rounded-2xl bg-white p-5 shadow-sm"><Globe2 className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">IT PATH Support</h2><p className="mt-2 text-xs text-slate-500">{state.airplaneMode?"Airplane mode is on. Wireless data is unavailable.":mobileOnline?(state.networkCacheStale?"The device is connected, but stale local network state is sending this request to the wrong destination.":"The simulated support portal is reachable."):"No usable Wi-Fi or cellular data connection is available."}</p><p className="mt-3 text-[10px] text-slate-400">Path: {state.wifiEnabled&&network.localReady?"Wi-Fi":state.cellularEnabled&&state.simActive&&!state.airplaneMode?"Cellular":"Offline"} · VPN {state.vpnEnabled?"on":"off"}</p></div></div>:null}
              {app==="messages"?<div className="p-4"><div className="rounded-2xl bg-white p-4 shadow-sm"><b>IT Support</b><p className="mt-2 text-sm text-slate-600">Your training device is ready. Future mobile tickets will arrive here as realistic user symptoms and support messages.</p></div></div>:null}
              {app==="photos"?<div className="p-4">{photosApp?.permissionGranted===false?<div className="rounded-2xl bg-white p-5 shadow-sm"><Image className="size-8 text-amber-600"/><h2 className="mt-3 font-semibold">Photos access required</h2><p className="mt-2 text-xs text-slate-500">The app is installed, but access to photos and media is denied. Change the app permission in Settings.</p></div>:<div className="grid grid-cols-3 gap-2">{Array.from({length:9},(_,i)=><div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-sky-200 to-indigo-300"/>)}</div>}</div>:null}
              {app==="account"?<div className="p-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><UserRound className="size-9 text-blue-600"/><h2 className="mt-3 font-semibold">IT PATH Student</h2><p className="text-xs text-slate-500">Managed training account</p><p className={cn("mt-4 text-xs",workServicesReady?"text-emerald-600":"text-amber-600")}>{!state.accountSignedIn?"Account signed out":!state.managementProfile?"Device is not managed":"Account and device enrollment active"}</p><button onClick={()=>patch({accountSignedIn:!state.accountSignedIn,cloudSync:!state.accountSignedIn?true:false})} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">{state.accountSignedIn?"Sign out":"Sign in"}</button></div></div>:null}
              {app==="apps"?<div className="p-4 space-y-3"><h2 className="font-semibold">Installed apps</h2>{state.installedApps.map(item=><div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">{item.name}</b><p className="mt-1 text-xs text-slate-500">{item.permission}</p><p className="mt-1 text-xs text-slate-400">{item.cacheMb} MB temporary data</p></div>)}</div>:null}
              {app==="mail"?<div className="p-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><Mail className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">Work Mail</h2><p className="mt-2 text-xs text-slate-500">{!mailApp?.enabled?"Mail is disabled on this device.":!mailOperational?"Mail closes while opening because its temporary app data is corrupted.":!mobileOnline?"Mail cannot reach the server. Check Wi-Fi, cellular data, SIM state, or airplane mode.":!state.mailSync?"Mail sync is paused. New messages will not arrive automatically.":state.backgroundRestricted?"Background activity is restricted; delivery may be delayed until Mail is opened.":!state.notificationPermission?"Mail is syncing, but notifications are blocked.":"Mail is connected and syncing normally."}</p><button onClick={()=>patch({mailSync:!state.mailSync})} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">{state.mailSync?"Pause sync":"Resume sync"}</button><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-xs">Notifications</span><Toggle on={state.notificationPermission} onClick={()=>patch({notificationPermission:!state.notificationPermission})}/></div></div></div>:null}
              {app==="console"?<div className="flex h-full flex-col bg-slate-950 p-3 font-mono text-[11px] text-slate-100"><div className="mb-2 rounded-lg bg-white/5 p-2 text-slate-400">{os==="android"?"Simulated Android support shell. Type help for available commands.":"Simulated managed-device support console. Type help for available commands."}</div><div className="min-h-0 flex-1 overflow-y-auto">{consoleLines.map((line,i)=><div key={i} className="mb-3"><p className="text-cyan-300">$ {line.command}</p><pre className={cn("whitespace-pre-wrap",line.error?"text-red-300":"text-slate-300")}>{line.output}</pre></div>)}</div><form onSubmit={e=>{e.preventDefault();runMobileConsole()}} className="mt-2 flex gap-2"><input value={consoleCommand} onChange={e=>setConsoleCommand(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none" placeholder="help"/><button className="rounded-lg bg-cyan-500 px-3 py-2 font-sans font-semibold text-slate-950">Run</button></form></div>:null}
              {app==="support"?<div className="p-4 space-y-3"><div className="rounded-2xl bg-white p-5 shadow-sm"><ShieldCheck className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">Device health</h2><div className="mt-4 space-y-2 text-xs"><p>Wi-Fi <b className="float-right">{state.wifiEnabled&&!state.airplaneMode?"On":"Off"}</b></p><p>Cellular <b className="float-right">{state.cellularEnabled&&state.simActive&&!state.airplaneMode?"Ready":"Unavailable"}</b></p><p>Mail sync <b className="float-right">{state.mailSync?"On":"Off"}</b></p><p>Account <b className="float-right">{state.accountSignedIn?"Signed in":"Signed out"}</b></p><p>Management <b className="float-right">{state.managementProfile?"Enrolled":"Missing"}</b></p><p>Bluetooth accessory <b className="float-right">{state.bluetoothEnabled&&state.pairedBluetooth.length?"Connected":"Unavailable"}</b></p><p>Storage <b className={cn("float-right",storageCritical&&"text-red-600")}>{state.storageUsed}% used{storageCritical?" · critical":""}</b></p><p>Network path <b className="float-right">{mobileOnline?(state.wifiEnabled&&network.localReady?"Wi-Fi":"Cellular"):"Offline"}</b></p><p>Battery health <b className="float-right">{state.batteryHealth}%</b></p></div></div></div>:null}
              {notice?<div className="mx-4 mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">{notice}</div>:null}
            </div>
          </div>}

          {shade?<div className="absolute inset-x-2 top-9 z-50 rounded-3xl bg-slate-950/90 p-4 text-white shadow-2xl backdrop-blur-xl"><div className="grid grid-cols-3 gap-3"><button onClick={toggleWifi} className={cn("rounded-2xl p-3 text-center text-[10px]",state.wifiEnabled&&!state.airplaneMode?"bg-blue-500":"bg-white/10")}><Wifi className="mx-auto mb-1 size-5"/>Wi-Fi</button><button onClick={toggleBluetooth} className={cn("rounded-2xl p-3 text-center text-[10px]",state.bluetoothEnabled?"bg-blue-500":"bg-white/10")}><Bluetooth className="mx-auto mb-1 size-5"/>Bluetooth</button><button onClick={toggleAirplane} className={cn("rounded-2xl p-3 text-center text-[10px]",state.airplaneMode?"bg-blue-500":"bg-white/10")}><Phone className="mx-auto mb-1 size-5"/>Airplane</button></div><div className="mt-4 border-t border-white/10 pt-3"><b className="text-xs">Notifications</b>{state.notifications.map((n,i)=><p key={i} className="mt-2 rounded-xl bg-white/10 p-2 text-[10px]">{n}</p>)}</div></div>:null}
        </div>

        <div className="absolute inset-x-0 bottom-2 z-40 flex justify-center"><button onClick={()=>{setApp(null);setSettingsPage("main");setShade(false)}} className={cn("h-1.5 w-28 rounded-full",app?"bg-slate-400":"bg-white/70")} aria-label="Home"/></div>
      </div>
    </main>
  </div>;
}
