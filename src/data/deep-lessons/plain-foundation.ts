/**
 * Beginner layer for the foundation topics.
 *
 * Each entry says the whole topic in ordinary words before any technical term
 * appears, then gives the plain meaning of every term the lesson uses. Written
 * per topic, nothing templated.
 */
import type { LessonPlainLanguage } from "./types";

export const foundationPlainLanguage: Record<string, LessonPlainLanguage> = {
  "topic-computer-hardware-basics": {
    plainIntro:
      "A computer is a small team of parts, and each one has a single job. One part does the thinking, one holds what you are working on right now, one keeps your files when the power is off, one carries electricity in, and one carries heat out. Almost every hardware fault comes down to one of those jobs not being done, so once you know who does what, you already know where to look.",
    wordList: [
      { term: "CPU", plain: "The part that does the thinking. It follows instructions one after another, billions of times a second." },
      { term: "RAM", plain: "The desk you work on. Whatever you have open sits here. Switch the power off and the desk is cleared." },
      { term: "Storage (SSD or hard drive)", plain: "The filing cabinet. It keeps your files when the power is off. An SSD has no moving parts and is much faster than an old spinning hard drive." },
      { term: "Motherboard", plain: "The big board everything plugs into. It is the wiring that lets the parts talk to each other." },
      { term: "PSU (power supply)", plain: "The box that turns wall electricity into the gentler power the parts need." },
      { term: "GPU", plain: "The part that draws what you see on screen. Some computers have a separate card for it, others build it into the CPU." },
      { term: "Cache", plain: "A tiny, very fast pocket of memory right next to the CPU, holding what it is about to need." },
      { term: "Thermal throttling", plain: "When a part gets too hot it slows itself down on purpose so it does not damage itself. The machine feels sluggish rather than breaking." },
      { term: "POST", plain: "The quick self-check a computer runs the moment you press power, before anything appears on screen." },
    ],
  },

  "topic-operating-systems-overview": {
    plainIntro:
      "An operating system is the manager sitting between you and the hardware. When you open an app, the app does not talk to the memory or the disk itself. It asks the manager, and the manager decides who gets what and in which order. Learning an operating system is mostly learning how that manager shares out time, memory, files and permissions.",
    wordList: [
      { term: "Operating system", plain: "The software that runs the machine and everything else on it. Windows, macOS, Linux, Android and iOS are all operating systems." },
      { term: "Kernel", plain: "The core of the operating system. It is the part with direct control over the hardware." },
      { term: "Process", plain: "One running program. Open the same app twice and you have two processes." },
      { term: "Multitasking", plain: "Switching between programs so quickly that they all look like they are running at once." },
      { term: "File system", plain: "The way files are named, arranged in folders, and found again on a drive." },
      { term: "Driver", plain: "A small piece of software that teaches the operating system how to talk to one specific piece of hardware." },
      { term: "Permissions", plain: "The rules about who is allowed to open, change or delete something." },
      { term: "Virtual memory", plain: "When the desk is full, the machine parks some of the work on the drive to make room. It works, but it is much slower." },
    ],
  },

  "topic-basic-networking-concepts": {
    plainIntro:
      "A network is just machines passing messages to each other. Every message needs an address so it knows where to go, a route to travel along, and an agreed set of manners at each end so both sides understand what arrived. That is the whole idea. Everything else is detail about addresses, routes and manners.",
    wordList: [
      { term: "Network", plain: "Two or more devices connected so they can send each other messages." },
      { term: "IP address", plain: "A device's address on the network, like a house number for data." },
      { term: "Protocol", plain: "An agreed set of manners. Both sides follow the same steps, so a message sent one way is understood at the other end." },
      { term: "Router", plain: "The device that decides which way a message should travel to reach a different network." },
      { term: "Switch", plain: "The device that passes messages between machines inside the same local network." },
      { term: "LAN", plain: "The local network in one place, such as a home or an office." },
      { term: "WAN", plain: "A network that spans distance and joins separate sites together. The internet is the biggest one." },
      { term: "Packet", plain: "A message chopped into small pieces for travel. Each piece carries the address on the front." },
      { term: "Bandwidth", plain: "How much data can flow at once. Think of the width of the pipe, not the speed of the water." },
      { term: "Latency", plain: "How long one message takes to get there and back. Think of the length of the pipe." },
    ],
  },

  "topic-command-line-fundamentals": {
    plainIntro:
      "The command line is the same computer you already use, only you type what you want instead of clicking it. It feels unfriendly at first because nothing offers itself to you, but that is also why it is powerful: you can say exactly what you mean, repeat it, and hand the same instruction to a hundred machines. Every command follows the same shape, which is the command, then options, then what to act on.",
    wordList: [
      { term: "Command line", plain: "A window where you type instructions to the computer instead of clicking them." },
      { term: "Shell", plain: "The program that reads what you type and carries it out. Command Prompt, PowerShell, Bash and zsh are all shells." },
      { term: "Directory", plain: "Another word for a folder." },
      { term: "Path", plain: "The full address of a file or folder, showing every folder it sits inside." },
      { term: "Argument", plain: "The thing you want the command to act on, usually a file or a folder name." },
      { term: "Flag or switch", plain: "A short extra instruction on a command, such as asking it to list more detail." },
      { term: "Working directory", plain: "The folder you are currently standing in. Commands act here unless you say otherwise." },
      { term: "Administrator or root", plain: "A level of access that can change the whole machine. Useful when needed, risky the rest of the time." },
    ],
  },

  "topic-virtualization-basics": {
    plainIntro:
      "Virtualisation means running a whole pretend computer inside a real one. The pretend computer believes it has its own processor, memory and disk, but the real machine is quietly sharing what it has. This is how one server can do the job of ten, and how you can break an operating system on purpose at four in the afternoon and have a clean one back by five past.",
    wordList: [
      { term: "Virtual machine", plain: "A complete pretend computer running inside a real one, with its own operating system." },
      { term: "Host", plain: "The real physical machine doing the work." },
      { term: "Guest", plain: "The pretend machine running on top of the host." },
      { term: "Hypervisor", plain: "The software that creates the pretend machines and shares the real hardware between them." },
      { term: "Snapshot", plain: "A saved moment in a virtual machine's life that you can jump back to if something goes wrong." },
      { term: "Resource allocation", plain: "Deciding how much processor, memory and disk each pretend machine is allowed." },
      { term: "Container", plain: "A lighter version of the same idea. It shares the host's operating system instead of carrying its own." },
    ],
  },

  "topic-it-career-overview": {
    plainIntro:
      "IT is not one job, it is a set of related jobs that all start from the same base. Most people begin where problems arrive, usually a help desk or support role, then move toward whatever they enjoyed most: networks, servers, cloud or security. Certificates open the first doors, but what keeps them open is evidence that you can work through a problem calmly and explain it to someone who is frustrated.",
    wordList: [
      { term: "Help desk", plain: "The first point of contact when something breaks. The usual starting job, and the fastest way to see a lot of faults." },
      { term: "Tier 1, 2 and 3", plain: "How support is layered. Tier 1 handles common issues, and anything harder moves up the tiers." },
      { term: "Certification", plain: "An exam from an outside body that shows you know a defined body of material." },
      { term: "SLA", plain: "A written promise about how fast an issue will be answered and fixed." },
      { term: "Ticket", plain: "The record of one reported problem, from the first report to the fix." },
      { term: "Sysadmin", plain: "Someone who looks after servers and the services running on them." },
      { term: "SOC analyst", plain: "Someone who watches security alerts and investigates the ones that matter." },
    ],
  },

  "topic-networking-basics": {
    plainIntro:
      "This is where the general idea of a network becomes specific. You learn how a device gets an address, how it finds the way out to the rest of the world, and what each piece of equipment in the cupboard actually does. Nearly every network fault you will ever meet is one of four things: no address, wrong address, no route out, or a name that will not resolve.",
    wordList: [
      { term: "Subnet mask", plain: "The part of the address setup that says which addresses count as local neighbours and which are further away." },
      { term: "Default gateway", plain: "The way out. Anything not local gets handed to this address to be passed along." },
      { term: "DHCP", plain: "The service that hands out addresses automatically so nobody has to type them in." },
      { term: "MAC address", plain: "The permanent hardware address burned into a network card, used only on the local network." },
      { term: "Port", plain: "A numbered door on a device. Different services listen at different doors, such as web traffic at 80 and 443." },
      { term: "Firewall", plain: "A guard that decides which traffic is allowed through and which is turned away." },
      { term: "ping", plain: "A small test message that asks another device to reply, so you can tell whether it is reachable." },
      { term: "traceroute", plain: "A test that shows every hop a message passes through on its way to a destination." },
    ],
  },

  "topic-dns-fundamentals": {
    plainIntro:
      "Computers find each other by number, but people remember names. DNS is the phone book that turns a name you typed into the number a machine can use. It is worth learning well because when DNS is broken, everything looks broken: the connection is fine, the site is fine, but nothing can find anything. Half of all \"the internet is down\" reports are really a name that would not resolve.",
    wordList: [
      { term: "DNS", plain: "The system that turns a name such as example.com into the numeric address behind it." },
      { term: "Resolve", plain: "To look a name up and get the address back." },
      { term: "Resolver", plain: "The service your device asks first when it needs a name looked up." },
      { term: "A record", plain: "The entry holding the address for a name." },
      { term: "CNAME", plain: "An entry saying this name is really another name. A forwarding note in the phone book." },
      { term: "MX record", plain: "The entry saying which server receives email for a domain." },
      { term: "TTL", plain: "How long an answer may be remembered before it has to be looked up again. Why a change can take a while to show up everywhere." },
      { term: "Cache", plain: "A saved copy of a recent answer, kept so the same question does not have to be asked twice." },
      { term: "Authoritative server", plain: "The server that holds the real, official answers for a domain." },
    ],
  },
};
