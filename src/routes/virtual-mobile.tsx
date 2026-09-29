import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BatteryFull, Bluetooth, ChevronLeft, Download, Folder, Globe2, Image, KeyRound, Mail, MessageSquare, Phone, RotateCcw, Settings, ShieldCheck, Smartphone, Trash2, UserRound, Wifi, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createMachine, primaryInterface, setServiceStatus, type MachineState } from "@/lib/terminal/machine";

export const Route = createFileRoute("/virtual-mobile")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Virtual Mobile | IT PATH" }, { name: "description", content: "Practice mobile support inside safe simulated Android-style and phone-style devices." }] }),
  component: VirtualMobilePage,
});

type MobileOs = "android" | "phone";
type MobileApp = "settings" | "files" | "browser" | "messages" | "photos" | "account" | "apps" | "mail" | "support" | null;
type MobileState = {
  machine: MachineState;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  airplaneMode: boolean;
  battery: number;
  storageUsed: number;
  notifications: string[];
  installedApps: { id:string; name:string; permission:string; cacheMb:number; enabled:boolean }[];
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
      { id:"mail", name:"Mail", permission:"Contacts, Notifications", cacheMb:186, enabled:true },
      { id:"browser", name:"Browser", permission:"Location while using", cacheMb:94, enabled:true },
      { id:"photos", name:"Photos", permission:"Photos and media", cacheMb:248, enabled:true },
      { id:"support", name:"IT PATH Support", permission:"Notifications", cacheMb:38, enabled:true },
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
  };
}

function VirtualMobilePage() {
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

  const state = devices[os];
  const iface = useMemo(() => primaryInterface(state.machine), [state.machine]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  }, [devices]);

  const update = (fn: (draft: MobileState) => MobileState) => setDevices(current => ({ ...current, [os]: fn(current[os]) }));
  const patch = (values: Partial<MobileState>) => update(current => ({ ...current, ...values }));

  const toggleWifi = () => update(current => {
    const next = !current.wifiEnabled;
    const machine = structuredClone(current.machine);
    const network = primaryInterface(machine);
    network.up = next && !current.airplaneMode;
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
    const machine = structuredClone(current.machine);
    primaryInterface(machine).up = !next && current.wifiEnabled;
    return { ...current, machine, airplaneMode: next, cellularEnabled: next ? false : current.cellularEnabled };
  });
  const resetDevice = () => {
    setDevices(current => ({ ...current, [os]: freshMobile(os) }));
    setApp(null); setSettingsPage("main"); setShade(false); setNotice("Device reset to its training baseline.");
  };
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
  ];

  const SettingRow = ({title,detail,onClick}:{title:string;detail:string;onClick:()=>void}) => <button onClick={onClick} className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-4 text-left last:border-0"><span><b className="block text-sm text-slate-900">{title}</b><span className="text-xs text-slate-500">{detail}</span></span><span className="text-slate-400">›</span></button>;
  const Toggle = ({on,onClick}:{on:boolean;onClick:()=>void}) => <button onClick={onClick} aria-pressed={on} className={cn("relative h-7 w-12 rounded-full transition",on?"bg-emerald-500":"bg-slate-300")}><span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition",on?"left-6":"left-1")}/></button>;

  return <div className="fixed inset-0 z-50 overflow-hidden bg-[#07111f] text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.16),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,.14),transparent_38%)]"/>
    <header className="absolute inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#07111f]/90 px-3 backdrop-blur-xl">
      <div className="flex items-center gap-2"><Link to="/dashboard" className="grid size-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Exit Virtual Mobile"><ChevronLeft className="size-5"/></Link><Smartphone className="size-5 text-cyan-300"/><div><b className="text-sm">Virtual Mobile</b><p className="text-[10px] text-slate-400">Shared mobile simulation foundation</p></div></div>
      <div className="flex items-center gap-2"><select value={os} onChange={e=>switchOs(e.target.value as MobileOs)} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs"><option value="android" className="text-black">IT PATH Mobile</option><option value="phone" className="text-black">PathOS Pocket</option></select><button onClick={resetDevice} className="rounded-lg border border-white/10 px-2 py-1.5 text-xs hover:bg-white/10">Reset</button></div>
    </header>

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
                {settingsPage==="network"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Wi-Fi</b><span className="text-xs text-slate-500">Training Wi-Fi</span></span><Toggle on={state.wifiEnabled&&!state.airplaneMode} onClick={toggleWifi}/></div></div><div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Airplane mode</b><span className="text-xs text-slate-500">Disable wireless connections</span></span><Toggle on={state.airplaneMode} onClick={toggleAirplane}/></div></div><div className="rounded-2xl bg-white p-4 text-xs shadow-sm"><b>Connection details</b><p className="mt-2 text-slate-500">Address: {iface.ip}</p><p className="text-slate-500">Gateway: {iface.gateway||"None"}</p><p className="text-slate-500">DNS: {iface.dns.join(", ")||"None"}</p></div></div>:null}
                {settingsPage==="cellular"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Mobile network</b><p className="mt-1 text-xs text-slate-500">{state.simType==="esim"?"eSIM":"Physical SIM"} · {state.simActive?"Active":"Inactive"}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Cellular data</span><Toggle on={state.cellularEnabled&&!state.airplaneMode} onClick={()=>patch({cellularEnabled:!state.cellularEnabled})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">SIM active</span><Toggle on={state.simActive} onClick={()=>patch({simActive:!state.simActive})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">Personal hotspot</span><Toggle on={state.hotspotEnabled} onClick={()=>patch({hotspotEnabled:!state.hotspotEnabled})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">VPN</span><Toggle on={state.vpnEnabled} onClick={()=>patch({vpnEnabled:!state.vpnEnabled})}/></div></div></div>:null}
                {settingsPage==="battery"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><BatteryFull className="size-7 text-emerald-600"/><b className="mt-3 block">Battery</b><p className="mt-1 text-xs text-slate-500">{state.battery}% charge · {state.batteryHealth}% maximum health</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Restrict background activity</span><Toggle on={state.backgroundRestricted} onClick={()=>patch({backgroundRestricted:!state.backgroundRestricted})}/></div></div></div>:null}
                {settingsPage==="system"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Software update</b><p className="mt-1 text-xs text-slate-500">{state.updateInstalled?"Latest training update installed.":state.updateAvailable?"A training system update is ready.":"Device is up to date."}</p>{state.updateAvailable&&!state.updateInstalled?<button onClick={()=>patch({updateInstalled:true,updateAvailable:false})} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Install update</button>:null}</div><div className="rounded-2xl bg-white p-4 text-xs shadow-sm"><b>Device information</b><p className="mt-2 text-slate-500">Name: {state.machine.hostname}</p><p className="text-slate-500">Platform: {os==="android"?"IT PATH Mobile":"PathOS Pocket"}</p><p className="text-slate-500">Management: {state.managementProfile?"Enrolled":"Not enrolled"}</p></div></div>:null}
                {settingsPage==="bluetooth"?<div className="m-3 rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block">Bluetooth</b><span className="text-xs text-slate-500">{state.bluetoothEnabled?"Ready for nearby devices":"Disabled"}</span></span><Toggle on={state.bluetoothEnabled} onClick={toggleBluetooth}/></div></div>:null}
                {settingsPage==="storage"?<div className="m-3 rounded-2xl bg-white p-4 shadow-sm"><b>Device storage</b><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-blue-500" style={{width:state.storageUsed+"%"}}/></div><p className="mt-2 text-xs text-slate-500">{state.storageUsed}% used · training data, apps, photos and cache</p><button onClick={()=>patch({storageUsed:Math.max(20,state.storageUsed-8)})} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Clear temporary cache</button></div>:null}
                {settingsPage==="apps"?<div className="m-3 space-y-2">{state.installedApps.map(item=><div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span><b className="block text-sm">{item.name}</b><span className="text-[11px] text-slate-500">{item.permission} · {item.cacheMb} MB cache</span></span><button onClick={()=>update(current=>({...current,installedApps:current.installedApps.map(app=>app.id===item.id?{...app,cacheMb:0}:app)}))} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold">Clear cache</button></div></div>)}</div>:null}
                {settingsPage==="security"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><ShieldCheck className="size-7 text-emerald-600"/><b className="mt-3 block">Device protection</b><div className="mt-4 flex items-center justify-between"><span className="text-xs">Screen lock</span><Toggle on={state.screenLock} onClick={()=>patch({screenLock:!state.screenLock})}/></div></div><div className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">Management profile</b><p className="mt-1 text-xs text-slate-500">{state.managementProfile?"IT PATH Training Management is installed.":"No management profile installed."}</p><button onClick={()=>patch({managementProfile:!state.managementProfile})} className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">{state.managementProfile?"Remove training profile":"Install training profile"}</button></div></div>:null}
                {settingsPage==="sync"?<div className="m-3 space-y-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><UserRound className="size-7 text-blue-600"/><b className="mt-3 block">IT PATH Student</b><p className="text-xs text-slate-500">student@itpath.local</p><div className="mt-4 flex items-center justify-between"><span className="text-xs">Mail sync</span><Toggle on={state.mailSync} onClick={()=>patch({mailSync:!state.mailSync})}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs">Cloud sync</span><Toggle on={state.cloudSync} onClick={()=>patch({cloudSync:!state.cloudSync})}/></div></div></div>:null}
                {settingsPage==="account"?<div className="m-3 rounded-2xl bg-white p-4 shadow-sm"><UserRound className="size-7 text-blue-600"/><b className="mt-3 block">IT PATH Student</b><p className="text-xs text-slate-500">student@itpath.local</p><p className="mt-4 text-xs text-emerald-600">Management status: enrolled</p></div>:null}
              </div>:null}
              {app==="files"?<div className="p-4"><h2 className="font-semibold">On this device</h2><div className="mt-3 grid grid-cols-2 gap-3">{["Downloads","Documents","Pictures","Support"].map(name=><button key={name} onClick={()=>setNotice(name+" folder opened. File-state integration comes next.")} className="rounded-2xl bg-white p-4 text-left shadow-sm"><Folder className="size-7 text-blue-500"/><b className="mt-3 block text-sm">{name}</b></button>)}</div></div>:null}
              {app==="browser"?<div className="p-4"><div className="rounded-xl border bg-white p-3 text-xs text-slate-500">https://support.itpath.local</div><div className="mt-4 rounded-2xl bg-white p-5 shadow-sm"><Globe2 className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">IT PATH Support</h2><p className="mt-2 text-xs text-slate-500">{iface.up?"The simulated support portal is reachable.":"No connection. Check the device network settings."}</p></div></div>:null}
              {app==="messages"?<div className="p-4"><div className="rounded-2xl bg-white p-4 shadow-sm"><b>IT Support</b><p className="mt-2 text-sm text-slate-600">Your training device is ready. Future mobile tickets will arrive here as realistic user symptoms and support messages.</p></div></div>:null}
              {app==="photos"?<div className="p-4"><div className="grid grid-cols-3 gap-2">{Array.from({length:9},(_,i)=><div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-sky-200 to-indigo-300"/>)}</div></div>:null}
              {app==="account"?<div className="p-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><UserRound className="size-9 text-blue-600"/><h2 className="mt-3 font-semibold">IT PATH Student</h2><p className="text-xs text-slate-500">Managed training account</p><p className={cn("mt-4 text-xs",state.managementProfile?"text-emerald-600":"text-amber-600")}>{state.managementProfile?"Device enrollment active":"Device is not managed"}</p></div></div>:null}
              {app==="apps"?<div className="p-4 space-y-3"><h2 className="font-semibold">Installed apps</h2>{state.installedApps.map(item=><div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm"><b className="text-sm">{item.name}</b><p className="mt-1 text-xs text-slate-500">{item.permission}</p><p className="mt-1 text-xs text-slate-400">{item.cacheMb} MB temporary data</p></div>)}</div>:null}
              {app==="mail"?<div className="p-4"><div className="rounded-2xl bg-white p-5 shadow-sm"><Mail className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">Work Mail</h2><p className="mt-2 text-xs text-slate-500">{!state.notificationPermission?"Mail can sync, but notifications are blocked.":state.backgroundRestricted?"Background activity is restricted; delivery may be delayed.":state.mailSync?"Mail is syncing normally.":"Mail sync is paused. New messages will not arrive automatically."}</p><button onClick={()=>patch({mailSync:!state.mailSync})} className="mt-4 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">{state.mailSync?"Pause sync":"Resume sync"}</button><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-xs">Notifications</span><Toggle on={state.notificationPermission} onClick={()=>patch({notificationPermission:!state.notificationPermission})}/></div></div></div>:null}
              {app==="support"?<div className="p-4 space-y-3"><div className="rounded-2xl bg-white p-5 shadow-sm"><ShieldCheck className="size-8 text-blue-600"/><h2 className="mt-3 font-semibold">Device health</h2><div className="mt-4 space-y-2 text-xs"><p>Wi-Fi <b className="float-right">{state.wifiEnabled&&!state.airplaneMode?"On":"Off"}</b></p><p>Cellular <b className="float-right">{state.cellularEnabled&&state.simActive&&!state.airplaneMode?"Ready":"Unavailable"}</b></p><p>Mail sync <b className="float-right">{state.mailSync?"On":"Off"}</b></p><p>Management <b className="float-right">{state.managementProfile?"Enrolled":"Missing"}</b></p><p>Storage <b className="float-right">{state.storageUsed}% used</b></p><p>Battery health <b className="float-right">{state.batteryHealth}%</b></p></div></div></div>:null}
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
