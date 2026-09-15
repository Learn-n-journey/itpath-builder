/**
 * Deep instructional reading for the Year 1 test curriculum.
 * This is the primary teaching material of the Learn page: each topic has its
 * own genuinely different content. No template text is reused between topics.
 */

import { advancedSecurityDeepLessons } from "./deep-lessons/phase-advanced-security";
import { fundamentalsAPlusDeepLessons } from "./deep-lessons/phase-fundamentals-aplus";
import { linuxServersCloudDeepLessons } from "./deep-lessons/phase-linux-servers-cloud";
import { mobileDevicesDeepLessons } from "./deep-lessons/phase-mobile-devices";
import { networkSecurityDeepLessons } from "./deep-lessons/phase-network-security";
import { advancedSecurityLessonDepth } from "./deep-lessons/depth-advanced-security";
import { foundationLessonDepth } from "./deep-lessons/depth-foundation";
import { fundamentalsAPlusLessonDepth } from "./deep-lessons/depth-fundamentals-aplus";
import { linuxServersCloudLessonDepth } from "./deep-lessons/depth-linux-servers-cloud";
import { mobileDevicesLessonDepth } from "./deep-lessons/depth-mobile-devices";
import { networkSecurityLessonDepth } from "./deep-lessons/depth-network-security";
import type { DeepLesson, DeepLessonSection, LessonDepth } from "./deep-lessons/types";

export type { DeepLesson, DeepLessonSection, LessonDepth };

const foundationDeepLessons: DeepLesson[] = [
  {
    topicId: "topic-computer-hardware-basics",
    readingMinutes: 18,
    intro:
      "A computer is a small number of cooperating parts, each solving one problem: calculate, remember, store, connect, power, and cool. Once you can name each part and say what it does, most hardware faults stop being mysterious and become a question of which part is not doing its job.",
    whereYouMeetIt:
      "Every desk-side repair, every laptop that will not power on, every 'my computer is slow' ticket, and every hardware purchase decision.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "Computer hardware is the physical machinery that executes software. The processor performs arithmetic and logic, memory holds what is currently being worked on, storage keeps data when the power is off, the motherboard wires everything together, the power supply converts wall electricity into the low voltages chips need, and the cooling system removes the heat that all of this produces.",
          "The single most useful idea in hardware is the memory hierarchy. Data closest to the CPU is fastest and smallest: CPU registers, then cache (L1, L2, L3), then RAM, then an SSD or hard disk. Each step down is roughly an order of magnitude slower and an order of magnitude larger. Performance problems are usually a question of data sitting too far down that hierarchy for the work being asked of it.",
        ],
      },
      {
        heading: "Components and What Each One Actually Does",
        paragraphs: [
          "Learn these by function, not by appearance. In a ticket you will rarely see the part; you will see the symptom it produces.",
        ],
        bullets: [
          "CPU: executes instructions. Key specs are core count (how many things at once), clock speed (how fast each core steps), and cache size. A CPU-bound machine is pinned near 100% processor use while everything else is idle.",
          "RAM: fast volatile working memory. Specs are capacity (GB), generation (DDR4/DDR5, not interchangeable), and form factor (DIMM for desktops, SO-DIMM for laptops). When RAM runs out the OS pages to disk and the machine feels catastrophically slow even though the CPU is not busy.",
          "Storage: persistent data. A SATA SSD is roughly 500 MB/s, an NVMe SSD several GB/s, a spinning hard disk around 100 MB/s with mechanical seek delay. Replacing a hard disk with an SSD is still the single largest perceived speed upgrade on old hardware.",
          "Motherboard: the wiring and chipset. It defines which CPU socket, which RAM generation, how many M.2 and PCIe slots, and which form factor (ATX, microATX, ITX) fits which case.",
          "PSU: converts AC mains to +12V, +5V and +3.3V rails. Sized in watts with an 80 PLUS efficiency rating. An undersized or dying PSU fails under load, not at idle.",
          "GPU: parallel graphics and compute. Integrated graphics share system RAM; a discrete card has its own VRAM and needs slot space, power connectors, and airflow.",
          "Cooling: heatsinks, fans, thermal paste, and case airflow. Modern CPUs do not usually burn out; they throttle, trading speed for survival.",
          "Peripherals and expansion: USB, DisplayPort/HDMI, Ethernet, and PCIe cards, all of which have their own bandwidth limits.",
        ],
      },
      {
        heading: "How It Works: One Instruction, Start to Finish",
        paragraphs: [
          "You double-click an application. Its executable is read from the SSD into RAM. The OS creates a process and hands the CPU an entry point. The CPU fetches an instruction from RAM (usually from cache, which already holds a copy), decodes it, executes it in an arithmetic unit, and writes the result back to a register or memory. This fetch–decode–execute cycle repeats billions of times per second.",
          "Each of those steps consumes power and produces heat. The PSU delivers stable voltage through the motherboard; the voltage regulator modules near the socket step it down for the CPU; the heatsink moves the resulting heat into the air, and case fans move that air out of the chassis. Break any link in that chain and the machine either slows down, shuts down, or does not start.",
        ],
      },
      {
        heading: "Real-World Applications",
        paragraphs: [
          "Specifying a machine: a finance user running large spreadsheets needs RAM and single-core speed. A video editor needs cores, fast NVMe scratch storage, and a GPU. A call-centre thin client needs almost nothing. Buying identical hardware for everyone wastes money in one direction and creates tickets in the other.",
          "Diagnosing 'slow': open the OS resource monitor before touching hardware. High memory pressure with low CPU means add RAM or close software. Disk at 100% active time with low throughput means a failing or saturated drive. High CPU with high temperature means cooling. The evidence tells you which component to buy.",
        ],
      },
      {
        heading: "Common Problems and How Hardware Fails",
        paragraphs: [
          "Hardware rarely fails cleanly. It degrades, and the symptom is often intermittent, which is exactly why documenting conditions matters.",
        ],
        bullets: [
          "No power at all: dead outlet, failed PSU, disconnected front-panel power switch header, or a dead laptop battery and charger combination.",
          "Powers on, no display: reseat RAM and the GPU, check the monitor input, listen for POST beeps and read motherboard diagnostic LEDs.",
          "Random reboots under load: overheating or a PSU that cannot hold voltage when demand rises.",
          "Blue screens and application crashes: frequently faulty RAM. Run a memory test overnight before replacing anything else.",
          "Slow boot, freezes, file corruption: a failing drive. Check the drive's SMART attributes, especially reallocated sector count.",
          "Fans loud and machine sluggish: dust-blocked heatsink or dried thermal paste causing thermal throttling.",
        ],
      },
      {
        heading: "How to Troubleshoot Hardware Methodically",
        paragraphs: [
          "Use the CompTIA six-step model and change one variable at a time. Identify the problem and gather the exact conditions. Form a theory. Test the theory. Establish a plan of action. Implement and verify full functionality. Document the outcome.",
          "In practice this means: reproduce the fault, strip the system to minimum viable hardware (one RAM stick, integrated graphics, boot drive only), then add parts back until the fault returns. Swap with known-good parts rather than guessing. Always power down and disconnect mains, discharge static with a wrist strap or by touching bare chassis metal, and never work inside a PSU.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "CompTIA A+ Core 1 tests hardware heavily: RAM types and form factors, storage interfaces (SATA, M.2, NVMe), motherboard form factors, PSU wattage and connectors, cooling, and above all the symptom-to-cause mapping used in performance-based questions. Expect scenarios that give you a symptom and ask for the most likely component or the next best troubleshooting step.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "Hiring managers use hardware questions to test structured thinking, not memorisation. If asked 'a PC will not turn on, what do you do?', the winning answer walks a path: confirm power at the outlet, check the cable and PSU switch, look for motherboard LEDs or fan movement, then narrow to PSU versus board. Saying what evidence you would collect matters more than naming a part.",
        ],
      },
    ],
  },
  {
    topicId: "topic-operating-systems-overview",
    readingMinutes: 20,
    intro:
      "An operating system is the referee between hardware, applications, and people. It decides which program gets the CPU, who is allowed to open which file, and how a device request becomes electrical activity. Almost every support task you will ever perform happens through OS concepts.",
    whereYouMeetIt:
      "Windows endpoints, Linux servers, macOS creative machines, mobile devices, and every permission, driver, update, or boot problem in a ticket queue.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "An operating system provides four services that applications cannot safely provide for themselves: process management (which code runs and when), memory management (who gets which region of RAM), filesystem and device management (how storage and hardware are addressed), and security (who may do what).",
          "It enforces these with a hardware-supported privilege boundary. Kernel mode has unrestricted access to memory and devices; user mode does not. When your application needs to read a file or send a packet it makes a system call, which traps into the kernel, does the privileged work, and returns. That boundary is why one crashing application usually does not take the machine down, and why a bad driver, which runs in kernel space, can.",
        ],
      },
      {
        heading: "Core Concepts",
        paragraphs: [
          "These five ideas explain the majority of OS tickets you will see.",
        ],
        bullets: [
          "Process and thread: a process owns memory and handles; threads are the schedulable units inside it. 'Not responding' usually means a UI thread is blocked, not that the process is dead.",
          "Scheduling: the kernel time-slices cores across runnable threads by priority. This is why a single busy program rarely freezes a healthy modern system.",
          "Virtual memory: every process sees its own address space. Pages are mapped to physical RAM, and pushed to a pagefile or swap when RAM is scarce. Heavy paging is the technical definition of 'thrashing'.",
          "Filesystem: NTFS on Windows (journalling, ACLs, alternate data streams), ext4 or XFS on Linux, APFS on macOS, FAT32/exFAT for cross-platform removable media. Filesystem choice determines maximum file size, permission model, and recoverability.",
          "Accounts and permissions: Windows uses ACLs plus UAC elevation and security groups; Linux uses owner/group/other rwx bits, plus sudo. Different behaviour for two accounts on the same machine is nearly always a permission or profile problem.",
        ],
      },
      {
        heading: "How It Works: From Power to Login",
        paragraphs: [
          "Firmware (UEFI, or legacy BIOS) initialises hardware and runs POST. It reads the boot entry, loads the bootloader from the EFI System Partition, Windows Boot Manager, or GRUB on Linux, which loads the kernel and an initial RAM image. The kernel initialises drivers, mounts the root filesystem, and starts the first user-space process: services.exe and the Session Manager on Windows, systemd (PID 1) on most Linux systems.",
          "Only then do services, the login manager, and finally your user profile load. Knowing this sequence lets you place a boot failure precisely: no firmware screen is hardware; 'no bootable device' is disk or boot entry; a kernel panic or stop code is driver or filesystem; a hang after login is profile or startup applications.",
        ],
      },
      {
        heading: "Comparing the Major Operating Systems",
        paragraphs: [
          "You are not learning five systems, you are learning one set of concepts with five vocabularies.",
        ],
        bullets: [
          "Windows: dominant on business desktops. Registry-based configuration, Group Policy, Event Viewer, Task Manager, Device Manager, PowerShell, Windows Update.",
          "Linux: dominant on servers and cloud. Text configuration files under /etc, systemd services, journalctl and /var/log, package managers (apt, dnf), and a shell-first workflow.",
          "macOS: BSD-derived Unix under a proprietary interface. Terminal, launchd, Console.app, and Apple's own MDM and update flow.",
          "Android and iOS: sandboxed mobile systems where per-app permissions and MDM enrolment replace traditional filesystem administration.",
        ],
      },
      {
        heading: "Real-World Applications",
        paragraphs: [
          "A user reports that an application works for you but not for them. The concepts above give you an ordered plan: is it the account (test a second login), the profile (test a new profile), the permissions (inspect the ACL on the target folder), the service (check that its dependency is running), or the OS state (check pending updates and free disk space)?",
          "Disk space is the underrated one. A system volume near full breaks updates, breaks temp files, breaks printing, and produces symptoms that look like a dozen unrelated faults. Check free space early; it costs ten seconds.",
        ],
      },
      {
        heading: "Common Problems, Failure Modes, Troubleshooting",
        paragraphs: [
          "Investigate in the order of narrowing scope: one application, one user, one machine, or many machines. That single question eliminates most wrong theories immediately.",
        ],
        bullets: [
          "Failed or looping updates: check free space, then the update log, then reset the update components.",
          "Missing or unstable hardware after an update: a driver regression. Roll back the driver from Device Manager before assuming hardware failure.",
          "Blue screen / kernel panic: record the stop code or panic string, then check recent driver and hardware changes. Boot into Safe Mode or single-user mode to work without third-party drivers.",
          "Corrupt system files on Windows: sfc /scannow, then DISM /Online /Cleanup-Image /RestoreHealth.",
          "Slow login: roaming profile size, mapped drives to unreachable servers, or too many startup items.",
          "Permission denied: read the exact path in the error, then inspect effective permissions rather than adding the user to an administrators group.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "A+ Core 2 is largely an operating systems exam: Windows editions and features, installation and upgrade paths, control panel and settings utilities, command-line tools, NTFS versus share permissions, and OS troubleshooting. Linux+ and Server+ go deeper into boot, services, and filesystems. Learn the boot chain and the permission models; they are examined repeatedly in different wording.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "Expect 'what happens when you press the power button?' and 'how would you handle an application that only fails for one user?'. Both reward a layered answer that names the boundary being tested at each step and states the evidence that would move you to the next.",
        ],
      },
    ],
  },
  {
    topicId: "topic-basic-networking-concepts",
    readingMinutes: 18,
    intro:
      "Networking is the study of how a message gets from one program on one machine to another program on a different machine. The whole subject becomes tractable once you accept a single idea: the work is divided into layers, and each layer solves exactly one delivery problem.",
    whereYouMeetIt:
      "Wi-Fi complaints, 'the internet is down', printers that vanish, VPN problems, and every cloud application your organisation depends on.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "A network is a set of devices that agree on protocols, shared rules for formatting, addressing, and sequencing data. Most communication follows the client-server model: a client initiates a request, a server listens on a known port and responds. Peer-to-peer networks let each device act as both.",
          "Devices are grouped by scale: a LAN covers one site, a WAN links sites over provider circuits, a WLAN is the wireless portion of a LAN, and the internet is the global interconnection of independently operated networks.",
        ],
      },
      {
        heading: "The Layered Model",
        paragraphs: [
          "The OSI model has seven layers; the TCP/IP model collapses them to four. You will use OSI vocabulary to describe problems and TCP/IP structure to describe reality. Each layer wraps the layer above in its own header, that is encapsulation, and the receiving device unwraps them in reverse.",
        ],
        bullets: [
          "Layer 1 Physical: cable, radio, connectors, light. Symptoms: no link light, damaged cable, bad SFP.",
          "Layer 2 Data Link: MAC addresses, Ethernet frames, switches, VLANs, Wi-Fi association. Symptoms: local-only communication, VLAN mismatch, switching loop.",
          "Layer 3 Network: IP addresses, subnets, routers, ICMP. Symptoms: can reach local devices but not remote networks.",
          "Layer 4 Transport: TCP (ordered, acknowledged, connection-oriented) and UDP (fast, connectionless), plus port numbers. Symptoms: ping works but one service is blocked.",
          "Layers 5–7 Session, Presentation, Application: HTTP/HTTPS, DNS, SMTP, SSH, TLS. Symptoms: certificate errors, application-level failures on a healthy network.",
        ],
      },
      {
        heading: "The Devices and What They Decide",
        paragraphs: [
          "A switch learns MAC addresses and forwards frames only to the port that needs them, inside one broadcast domain. A router joins different IP networks and makes forwarding decisions using a routing table, and is where most filtering, NAT, and inter-VLAN routing happens. An access point converts wireless frames to wired frames; it is a Layer 2 device, so a client can be perfectly associated to Wi-Fi and still have no route to anything.",
          "A firewall enforces policy on traffic between zones, typically at Layer 3 and 4 and increasingly at Layer 7. A modem adapts your provider's medium (DOCSIS, fibre, DSL) to Ethernet. In homes and small offices all four functions often live in a single box, which is why a single reboot appears to fix unrelated problems.",
        ],
      },
      {
        heading: "How a Web Request Actually Travels",
        paragraphs: [
          "You type an address. The OS resolves the hostname to an IP address through DNS. It compares the destination against its own address and subnet mask: local destinations are sent directly, remote destinations go to the default gateway. To send to either, it needs the destination's MAC address, obtained with ARP.",
          "The frame reaches the switch, which forwards it to the router. The router strips the frame, examines the destination IP, consults its routing table, rewrites the frame for the next hop, and forwards it. This repeats across many routers, each one a hop, until the packet reaches the destination network. TCP then completes a three-way handshake (SYN, SYN-ACK, ACK), TLS negotiates encryption, and only then does the HTTP request travel. The reply retraces the path.",
          "That description is also a troubleshooting script. Every step is a place the request can stop, and every step has a test.",
        ],
      },
      {
        heading: "Real-World Applications",
        paragraphs: [
          "Scope tells you the layer. One device affected points at that device's configuration or cable. One room points at a switch or access point. One application for everyone points at the server or its port. Everyone and everything points at the router, ISP, or DNS.",
          "Comparing against a known-good device on the same network is the fastest diagnostic in existence, it eliminates the entire shared path in one test.",
        ],
      },
      {
        heading: "Common Problems and How Networks Fail",
        paragraphs: [
          "Networks rarely fail totally. Partial failure is the norm, and partial failure is informative.",
        ],
        bullets: [
          "Connected to Wi-Fi, no internet: association succeeded at Layer 2, but DHCP, gateway, or DNS failed above it.",
          "Duplex or speed mismatch: the link works but throughput collapses and error counters climb.",
          "Broadcast storm from a switching loop: one plugged-in patch cable takes a whole floor offline. Spanning Tree exists to prevent this.",
          "Wireless interference and channel overlap: intermittent slowness that follows the user around the building.",
          "Blocked port: ping succeeds, the application fails, because ICMP and the application use different protocols and ports.",
        ],
      },
      {
        heading: "Troubleshooting Approach",
        paragraphs: [
          "Work bottom-up when the symptom is total loss, and top-down when one application misbehaves while everything else works. Confirm link, then addressing, then gateway, then name resolution, then the service port. Use ping for reachability, traceroute for path, and a port test for the service itself. Record what worked as carefully as what failed, a successful test eliminates an entire layer.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "Network+ is built around this material: OSI layer identification, device roles, cable and connector types, wireless standards, and troubleshooting methodology. A+ Core 1 covers a lighter version. Expect questions that describe a symptom and ask which layer or device is responsible.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "'Explain what happens when you type a URL and press enter' is the most common technical interview question in all of IT. Answer it in order, DNS, ARP, routing, TCP handshake, TLS, HTTP, and you demonstrate the whole subject in ninety seconds.",
        ],
      },
    ],
  },
  {
    topicId: "topic-command-line-fundamentals",
    readingMinutes: 22,
    intro:
      "The command line is the interface where professional IT work actually gets done: it is scriptable, remote-friendly, precise, and it leaves a record. This lesson teaches the structure of commands, the filesystem paths they operate on, and a working starter vocabulary in both Bash and PowerShell.",
    whereYouMeetIt:
      "Remote server sessions over SSH, Windows administration with PowerShell, network diagnostics, cloud shells, container work, and every automation task.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "A shell is a program that reads a line of text, interprets it, asks the operating system to do the work, and prints the result. Bash is the standard Linux and macOS shell; PowerShell is the standard Windows administrative shell; cmd.exe survives as a legacy Windows shell.",
          "The critical difference: Bash passes plain text between commands, while PowerShell passes .NET objects with named properties. That is why Bash pipelines lean on text tools such as grep, awk, and cut, and PowerShell pipelines use property names directly.",
        ],
      },
      {
        heading: "Command Structure and Paths",
        paragraphs: [
          "Every command has the same shape: the command name, then options (also called flags or switches), then arguments. In `ls -la /var/log`, `ls` is the command, `-la` combines two options, and `/var/log` is the argument. PowerShell uses a Verb-Noun convention with named parameters: `Get-ChildItem -Path C:\\Logs -Recurse`.",
          "An absolute path starts from the root (`/etc/hosts` or `C:\\Windows\\System32`) and means the same thing from anywhere. A relative path starts from your current working directory: `.` is here, `..` is the parent, and `~` is your home directory. Most beginner errors are simply being in the wrong directory, print it before you act.",
          "The shell finds executables by searching the directories listed in the PATH variable. 'command not found' usually means a typo, a missing package, or a program that exists but is not on PATH.",
        ],
      },
      {
        heading: "A Working Vocabulary",
        paragraphs: [
          "Learn these pairs together. Where they differ, the concept is identical and only the name changes.",
        ],
        bullets: [
          "Where am I: `pwd` (Bash) / `Get-Location` (PowerShell).",
          "List contents: `ls -la` / `Get-ChildItem -Force`.",
          "Change directory: `cd /var/log` / `Set-Location C:\\Logs`.",
          "Read a file: `cat`, `less`, `head -n 20`, `tail -f` / `Get-Content -Tail 20 -Wait`.",
          "Search inside files: `grep -ri \"error\" .` / `Select-String -Pattern \"error\" -Path .\\*.log`.",
          "Find files: `find /home -name \"*.conf\"` / `Get-ChildItem -Recurse -Filter *.conf`.",
          "Copy, move, delete: `cp`, `mv`, `rm` / `Copy-Item`, `Move-Item`, `Remove-Item`.",
          "Processes: `ps aux`, `top`, `kill <pid>` / `Get-Process`, `Stop-Process -Id`.",
          "Services: `systemctl status sshd` / `Get-Service -Name Spooler`.",
          "Permissions and elevation: `chmod`, `chown`, `sudo` / `icacls`, and Run as Administrator.",
          "Networking: `ip a`, `ping`, `ss -tulpn`, `dig` / `Get-NetIPConfiguration`, `Test-NetConnection`, `Resolve-DnsName`.",
          "Help: `man ls`, `ls --help` / `Get-Help Get-ChildItem -Examples`.",
        ],
      },
      {
        heading: "How It Works: Streams, Pipes, and Exit Codes",
        paragraphs: [
          "Every command has three streams: standard input (stdin), standard output (stdout), and standard error (stderr). Redirection sends them somewhere else: `>` overwrites a file, `>>` appends, `2>` captures errors, and `<` feeds input. A pipe `|` connects one command's stdout to the next command's stdin, which is how small tools combine into powerful ones: `cat access.log | grep 500 | wc -l` counts server errors.",
          "Every command also returns an exit code: 0 means success, anything else means failure. Bash exposes it as `$?`, PowerShell as `$LASTEXITCODE` or `$?`. Scripts rely on this, which is why silently ignoring a non-zero exit is such a common source of broken automation.",
          "Wildcards are expanded by the shell before the command runs. `rm *.log` never sees the asterisk, the shell hands it a full list of filenames. This is precisely why an unquoted or mistyped wildcard is dangerous.",
        ],
      },
      {
        heading: "Real-World Applications",
        paragraphs: [
          "Reading a log on a server with no desktop: `tail -f /var/log/syslog` shows events as they happen while you reproduce the fault. Finding which process holds a port: `ss -tulpn | grep :443`. Bulk-renaming or archiving files, checking certificate expiry, restarting a service across twenty machines, all are one line in a shell and an afternoon of clicking in a GUI.",
          "The command line also produces evidence. You can paste the exact command and its output into a ticket, and the next technician can reproduce it precisely.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "Command-line errors are usually about context, not syntax knowledge.",
        ],
        bullets: [
          "Wrong working directory, so a relative path targets the wrong files.",
          "Unquoted paths containing spaces, so one argument becomes several.",
          "Permission denied because the file is owned by another user or requires elevation.",
          "Case sensitivity: Linux distinguishes `Config.yml` from `config.yml`; Windows generally does not.",
          "Line endings: a script written on Windows can fail on Linux with a confusing '\\r: command not found'.",
          "Destructive commands with no undo: `rm -rf` and `Remove-Item -Recurse -Force` delete immediately, with no recycle bin.",
        ],
      },
      {
        heading: "Working Safely",
        paragraphs: [
          "Adopt three habits permanently. First, run a read-only version before the destructive version: list what a wildcard matches before you delete it, and use PowerShell's `-WhatIf` parameter. Second, never paste a command from the internet that you cannot explain word by word, resolve every path and flag first. Third, use least privilege: work as a normal user and elevate only for the specific command that needs it.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "A+ Core 2 tests Windows and Linux command-line tools and safe use of elevation. Linux+ tests shell navigation, file manipulation, permissions, redirection, and scripting in depth. Performance-based questions frequently ask you to type or select the correct command for a stated goal, so practise typing them rather than recognising them.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "Common questions: the difference between absolute and relative paths, what a pipe does, how you would find the largest files on a full disk, and how you would safely test an unfamiliar command. The last one is really a question about judgement, and a candid 'I read the help, resolve the path, and run a read-only version first' answers it well.",
        ],
      },
    ],
  },
  {
    topicId: "topic-virtualization-basics",
    readingMinutes: 17,
    intro:
      "Virtualisation breaks the assumption that one physical computer runs one operating system. A hypervisor divides real hardware into isolated virtual machines, which is the foundation of the modern data centre, of cloud computing, and of the lab you will use to practise everything else in this programme.",
    whereYouMeetIt:
      "Server consolidation, test environments, your own study lab, and every cloud instance you will ever provision.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "A hypervisor presents virtual CPUs, memory, disks, and network adapters to guest operating systems, and schedules the real hardware underneath. The physical machine is the host; each virtual computer is a guest. Guests are isolated from each other: a guest crash does not affect its neighbours, and a guest believes it owns a complete machine.",
          "Type 1 hypervisors (VMware ESXi, Microsoft Hyper-V, Proxmox/KVM) install directly on the hardware and are used in production. Type 2 hypervisors (VirtualBox, VMware Workstation) run as an application on a desktop OS and are what you will use to learn. Type 1 gives better performance and density; Type 2 gives convenience.",
        ],
      },
      {
        heading: "Components and Concepts",
        paragraphs: [
          "Five concepts cover almost all practical virtualisation work.",
        ],
        bullets: [
          "vCPU: a scheduled slice of physical CPU time. Assigning more vCPUs than the workload needs can slow a VM down, because the scheduler must find that many free cores simultaneously.",
          "Memory allocation: RAM is the resource that genuinely runs out. Overcommitting memory across guests forces host swapping and destroys performance for everyone.",
          "Virtual disk: a file (VHDX, VMDK, QCOW2) on the host. Thin provisioning allocates space as it is used; thick provisioning reserves it up front.",
          "Virtual networking: bridged puts the guest on the physical LAN with its own address; NAT hides guests behind the host; host-only creates a private lab network with no internet access. Choosing the wrong mode is the most common lab connectivity fault.",
          "Snapshot: a point-in-time state you can roll back to. Snapshots are a short-term safety net for changes, not a backup, they usually depend on the original disk files and grow until they fill the datastore.",
        ],
      },
      {
        heading: "How It Works",
        paragraphs: [
          "Modern CPUs include hardware virtualisation extensions, Intel VT-x or AMD-V, that let guest instructions execute directly on the processor while the hypervisor intercepts only the privileged operations. Nested paging (EPT/RVI) does the same for memory translation. This is why a VM runs at close to native speed and why virtualisation must be enabled in firmware before any hypervisor will start a 64-bit guest.",
          "Guest additions or integration tools install paravirtualised drivers inside the guest, giving faster disk and network I/O, clipboard sharing, and proper display resizing. Installing them is normally the first step after a guest OS installation.",
        ],
      },
      {
        heading: "Containers: The Other Kind of Isolation",
        paragraphs: [
          "A container does not virtualise hardware. It isolates a process on the host kernel using namespaces and cgroups. That makes containers start in milliseconds and use a fraction of the memory of a VM, but every container on a host shares that host's kernel, so you cannot run Windows containers on a Linux kernel, and kernel-level isolation is weaker than a hypervisor boundary.",
          "The practical rule: use a VM when you need a different operating system, kernel-level isolation, or a full machine to administer. Use a container when you need to ship and scale one application consistently.",
        ],
      },
      {
        heading: "Real-World Applications",
        paragraphs: [
          "Consolidation: ten lightly used physical servers become ten VMs on two hosts, cutting power, rack space, and hardware spend, while live migration lets you patch a host without downtime. Test and development: engineers get identical disposable environments. Disaster recovery: a VM is a set of files, so it can be replicated to another site and started there.",
          "For your own study, build a small lab: one Windows Server guest, one Linux guest, and a client, all on an internal virtual network. Every networking, DNS, and command-line lesson in this programme becomes hands-on the moment that lab exists.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "Virtualisation faults are usually resource or configuration faults, not software defects.",
        ],
        bullets: [
          "VM will not start with a 64-bit guest error: hardware virtualisation is disabled in UEFI, or a conflicting hypervisor (Hyper-V, WSL2) already owns the extensions.",
          "Everything on the host becomes slow: memory overcommitment, so the host is swapping.",
          "One VM has no network: the virtual adapter is disconnected or attached to the wrong virtual switch or network mode.",
          "Datastore full: unmanaged snapshots or thin disks that have grown. The result is that all guests on that datastore pause.",
          "Poor performance despite plenty of RAM: too many vCPUs per guest causing scheduling contention, or missing guest integration drivers.",
        ],
      },
      {
        heading: "Troubleshooting Approach",
        paragraphs: [
          "Always ask whether the problem is at host level or guest level. Check host CPU, memory, and datastore capacity first, a host under pressure produces symptoms in every guest at once. If only one guest is affected, inspect its virtual hardware, network attachment, and snapshot chain, then treat it as an ordinary operating system problem inside the guest.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "A+ Core 1 covers client-side virtualisation: purpose, resource requirements, and security concerns. Server+ and the cloud certifications go into hypervisor types, resource pooling, high availability, and migration. Expect to be asked why a VM will not start and to identify the correct network mode for a stated requirement.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "Two questions come up constantly: 'what is the difference between a virtual machine and a container?' and 'why is a snapshot not a backup?'. Strong answers mention the kernel boundary for the first and dependency on the original storage for the second.",
        ],
      },
    ],
  },
  {
    topicId: "topic-it-career-overview",
    readingMinutes: 15,
    intro:
      "IT is not one job; it is a set of connected roles with different daily work, different evidence of competence, and different entry points. This lesson maps those roles and the professional behaviour, ticket discipline, escalation, communication, that determines who gets promoted out of the service desk.",
    whereYouMeetIt:
      "Your first role, your first performance review, every ticket you write, and every interview you sit.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "Most IT organisations are structured around service management. Work arrives as incidents (something broken), service requests (something needed), problems (the underlying cause of repeated incidents), and changes (planned modifications). Tickets carry that work, service level agreements set the expected response and resolution times, and escalation moves work to the right authority or expertise.",
          "Support is usually tiered. Tier 1 handles high-volume, well-documented issues and gathers information. Tier 2 handles deeper technical faults. Tier 3 is specialist or vendor-level. Progression is not about time served; it is about consistently resolving work at the next tier and documenting it well enough that others can follow.",
        ],
      },
      {
        heading: "The Roles and What Each One Does Daily",
        paragraphs: [
          "These are the realistic first- and second-role destinations for the path you are on.",
        ],
        bullets: [
          "Help Desk / Service Desk Analyst: password and account issues, software installs, printing, basic connectivity, triage and escalation. Skills: communication, ticket hygiene, OS fundamentals.",
          "IT Technician / Desktop Support: hardware repair, imaging and deployment, endpoint configuration, on-site fixes. Skills: A+ level hardware and Windows, asset discipline.",
          "Network Technician: switching, cabling, wireless, VLANs, address management, first-line network faults. Skills: Network+ level knowledge, methodical layer-based troubleshooting.",
          "Junior Systems Administrator: servers, Active Directory, file and print services, backups, patching, scripting. Skills: Windows Server or Linux administration, PowerShell or Bash.",
          "Junior Security Analyst / SOC Tier 1: alert triage, log review, phishing analysis, incident documentation. Skills: Security+ level knowledge, networking, and disciplined evidence handling.",
          "Cloud and DevOps roles: usually reached from sysadmin or network foundations, not from a standing start.",
        ],
      },
      {
        heading: "How the Work Actually Flows",
        paragraphs: [
          "A user reports a problem. You verify their identity, capture the symptom in their words, establish scope and business impact, and set priority. You reproduce the fault where possible, collect evidence, and attempt approved low-risk steps. If it resolves, you verify with the user, document the cause and fix, and close. If it does not, you escalate with a summary that lets the next person start where you stopped.",
          "The quality of that last step is what senior staff notice. A useful escalation states the symptom, scope, what you tested, the exact results, what you ruled out, and what you did not have authority to do.",
        ],
      },
      {
        heading: "Evidence of Competence",
        paragraphs: [
          "Employers hire on evidence, and there are only four kinds that matter early: certifications, demonstrable hands-on work, documented projects, and the ability to explain your reasoning out loud. Certifications open interviews, A+ then Network+ then Security+ is the standard entry sequence, but a home lab you can describe in detail is what wins them.",
          "This is why IT PATH stores labs, assignments, and portfolio entries: they become the specific, concrete answers you give when an interviewer asks what you have actually built or fixed.",
        ],
      },
      {
        heading: "Common Problems and Professional Failure Modes",
        paragraphs: [
          "Early careers stall for behavioural reasons far more often than technical ones.",
        ],
        bullets: [
          "Thin ticket notes: 'fixed it' teaches nobody and guarantees the repeat incident lands on you again.",
          "Skipping identity verification before an account or password change, the classic social engineering opening.",
          "Escalating instantly without collecting evidence, or refusing to escalate and burning an SLA.",
          "Making an undocumented change outside your authority, then being unable to explain the outage.",
          "Talking to non-technical users in jargon and mistaking their confusion for hostility.",
          "Never asking about business impact, so genuinely urgent work waits behind trivial work.",
        ],
      },
      {
        heading: "How to Work Well",
        paragraphs: [
          "Write every note in the same shape: symptom, evidence, action, result. Confirm the fix with the user rather than assuming. Protect confidential information, verify identity every time, and stay inside your authority, 'I need to escalate this because it requires domain admin' is a professional answer, not an admission of weakness.",
          "Communicate impact in the user's language. 'Your mailbox is fine and I have restored access, but I need ten minutes to confirm nothing else was affected' is better than any technical explanation of what you did.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "A+ Core 2 explicitly tests professionalism and communication, change management, ticketing documentation, incident response basics, and prohibited-content handling. These questions are easy points if you have internalised the process, and are frequently missed by candidates who study only hardware.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "Expect behavioural questions: describe a time you could not solve something; how do you explain a technical problem to a non-technical user; when do you escalate. Use a structured answer, situation, action, result, and name the evidence you collected. Interviewers are testing whether you will be safe and clear under pressure.",
        ],
      },
    ],
  },
  {
    topicId: "topic-networking-basics",
    readingMinutes: 20,
    intro:
      "This lesson turns the conceptual model of networking into concrete configuration: IPv4 addresses, subnet masks, gateways, DHCP, ports, and the diagnostic commands that read them. This is the material you will use on real connectivity tickets every week.",
    whereYouMeetIt:
      "ipconfig output on a user's laptop, DHCP scopes on a server, port checks against an application, and any 'no internet' ticket.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "An IPv4 address is 32 bits, written as four decimal octets such as 192.168.1.40. It has two parts: a network portion and a host portion. The subnet mask defines the split, 255.255.255.0, also written /24, means the first 24 bits identify the network and the remaining 8 bits identify hosts on it.",
          "That split answers one question, and it is the question the operating system asks for every single packet: is this destination on my own network? If yes, deliver it directly over the local link. If no, hand it to the default gateway.",
        ],
      },
      {
        heading: "Addressing You Must Recognise on Sight",
        paragraphs: [
          "Reading an address correctly eliminates whole categories of theory before you test anything.",
        ],
        bullets: [
          "Private ranges (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. These are not routable on the internet and are translated by NAT.",
          "APIPA: 169.254.x.x means the host asked for DHCP, got no answer, and self-assigned. This is a DHCP or Layer 2 problem, never a DNS problem.",
          "Loopback: 127.0.0.1 tests only the local TCP/IP stack.",
          "Default gateway: the router interface on your subnet. Wrong gateway means local devices work and everything remote fails.",
          "IPv6: 128-bit addresses in hex, with link-local addresses beginning fe80:: appearing on almost every modern interface.",
        ],
      },
      {
        heading: "How Addressing Is Assigned: DHCP",
        paragraphs: [
          "Most clients are configured automatically by DHCP through a four-message exchange, Discover, Offer, Request, Acknowledge (DORA). The server supplies an address, a subnet mask, a default gateway, DNS servers, and a lease time. Reservations tie a specific MAC address to a specific IP so that printers and servers stay predictable.",
          "Static configuration is used for infrastructure. The risk with static addressing is duplication and stale settings: a laptop hard-coded for the old office subnet will fail silently on a new one, and a duplicate address takes two devices offline at once.",
        ],
      },
      {
        heading: "Transport, Ports, and Services",
        paragraphs: [
          "IP gets a packet to a host; ports get it to the right program. TCP provides ordered, acknowledged delivery through a three-way handshake and is used where correctness matters. UDP is connectionless and lightweight, used for DNS queries, DHCP, voice, and video, where speed matters more than retransmission.",
          "Memorise the common ports: 20/21 FTP, 22 SSH and SFTP, 23 Telnet, 25 SMTP, 53 DNS, 67/68 DHCP, 80 HTTP, 110 POP3, 143 IMAP, 389 LDAP, 443 HTTPS, 445 SMB, 3389 RDP. Most 'the network is fine but the app is broken' tickets are a single blocked port on this list.",
        ],
      },
      {
        heading: "The Diagnostic Commands and What Each Proves",
        paragraphs: [
          "Every command answers a specific question. Run them in an order that narrows the fault instead of collecting noise.",
        ],
        bullets: [
          "`ipconfig /all` (Windows) or `ip a` and `ip r` (Linux): shows address, mask, gateway, DNS servers, and DHCP source. Read this first, always.",
          "`ping 127.0.0.1`: the local stack works. `ping <own IP>`: the interface is configured. `ping <local peer>`: Layer 2 and local delivery work.",
          "`ping <default gateway>`: routing off the subnet is possible. Failure here stops you going further out.",
          "`ping 8.8.8.8`: internet routing works using IP only, which deliberately excludes DNS from the test.",
          "`nslookup example.com` or `dig example.com`: name resolution works. If IP ping succeeds and this fails, the fault is DNS.",
          "`tracert` / `traceroute`: shows where along the path the failure begins.",
          "`Test-NetConnection host -Port 443` or `ss -tulpn`: proves whether a specific service port is reachable or listening.",
          "`ipconfig /release` then `/renew`: forces a fresh DHCP lease when the host is stuck on APIPA.",
        ],
      },
      {
        heading: "Real-World Applications",
        paragraphs: [
          "A user cannot reach anything. `ipconfig /all` shows 169.254.14.7. You now know DHCP failed, so you check the physical link and switch port, verify the DHCP scope has free addresses, and renew the lease. You never touch DNS, because APIPA already told you the fault is below it.",
          "Another user reaches websites but not the file server. Ping to the server succeeds. `Test-NetConnection fileserver -Port 445` fails. The network is healthy and the fault is the SMB service or a firewall rule, a completely different team and a completely different fix.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "Configuration faults produce distinctive, readable symptoms once you know them.",
        ],
        bullets: [
          "Wrong subnet mask: some destinations work and others do not, apparently at random, because the host misjudges which addresses are local.",
          "Wrong or unreachable gateway: local resources fine, everything remote dead.",
          "Duplicate IP address: intermittent loss on two machines at once, with a conflict warning in the event log.",
          "DHCP scope exhaustion: new devices get APIPA while existing devices with valid leases keep working.",
          "Wrong DNS server: everything resolves slowly or not at all, while ping by IP is perfect.",
          "Blocked port on a firewall: connectivity tests pass, one application fails for everyone.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "Network+ and A+ Core 1 both test private ranges, APIPA recognition, subnet masks, DHCP behaviour, common ports, and command output interpretation. Performance-based questions often show `ipconfig /all` output and ask what is wrong, practise reading that output until the diagnosis is immediate.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "'What does 169.254.x.x tell you?', 'what does the default gateway do?', and 'a user has no internet, walk me through your first five checks' are near-universal. Answer with the tests in narrowing order and state what each result would eliminate.",
        ],
      },
    ],
  },
  {
    topicId: "topic-dns-fundamentals",
    readingMinutes: 20,
    intro:
      "DNS is the distributed directory that turns names people can remember into addresses machines can route to. It is also, by a wide margin, the most common cause of failures that look like something else. Learning DNS properly makes you noticeably faster than colleagues who guess.",
    whereYouMeetIt:
      "Website and email failures, new service cutovers, certificate validation, Active Directory logons, and half of all 'the internet is broken' reports.",
    sections: [
      {
        heading: "What It Is",
        paragraphs: [
          "DNS is a hierarchical, distributed, cached database. The hierarchy is read right to left: the root, then the top-level domain (com, org, uk), then the registered domain (example.com), then any subdomains (mail.example.com). No single server holds the whole database; each zone is delegated to servers that are authoritative for it.",
          "Two roles matter. A recursive resolver works on behalf of the client, doing whatever queries are needed to produce a final answer and caching the result. An authoritative server holds the actual zone data for a domain and answers with authority. Your laptop talks to a resolver; a resolver talks to authoritative servers.",
        ],
      },
      {
        heading: "The Record Types You Will Use",
        paragraphs: [
          "A DNS answer is always a typed record. Asking for the wrong type is a common self-inflicted diagnostic error.",
        ],
        bullets: [
          "A: hostname to IPv4 address. AAAA: hostname to IPv6 address.",
          "CNAME: an alias pointing to another name. A CNAME cannot coexist with other records at the same name, which is why it cannot be used at a zone apex.",
          "MX: mail exchanger for the domain, with a preference value; lower preference is tried first.",
          "TXT: arbitrary published text, used in practice for SPF, DKIM, DMARC, and domain-ownership verification.",
          "NS: which servers are authoritative for the zone. SOA: the zone's primary server, contact, serial number, and timers.",
          "PTR: reverse lookup, IP address back to a name, held in a separate reverse zone and used by mail filtering and logging.",
          "SRV: locates a service by protocol and port, the mechanism Active Directory uses to find domain controllers.",
        ],
      },
      {
        heading: "How Resolution Actually Works",
        paragraphs: [
          "Your application asks the OS resolver. The OS checks its own cache and the hosts file first, an entry there overrides all of DNS, which makes the hosts file both a useful test tool and a nasty hidden cause of faults. If there is no local answer, the query goes to the configured recursive resolver.",
          "If the resolver has a valid cached answer, it returns it immediately. Otherwise it starts at a root server, which refers it to the TLD servers for .com; those refer it to the authoritative name servers for example.com; those return the record. The resolver caches the answer for the record's TTL and passes it back. All of this typically takes tens of milliseconds and is invisible until it breaks.",
          "TTL is the number of seconds any cache may keep the answer. It explains the single most confusing DNS symptom in existence: after a record change, some users see the new value and others still see the old one, because their resolvers hold different unexpired copies.",
        ],
      },
      {
        heading: "Real-World Applications",
        paragraphs: [
          "Migrating a website: you lower the TTL to 300 seconds a day before the cutover, change the A record, and the world follows within minutes instead of hours. Forgetting to lower the TTL first is the classic cutover mistake.",
          "Email delivery: a missing or wrong MX record stops inbound mail, while a broken SPF or DKIM TXT record sends outbound mail to spam. Both are DNS problems reported as 'the mail server is down'.",
          "Active Directory: domain controllers publish SRV records, and clients find them through DNS. A workstation pointed at a public resolver instead of the internal DNS server cannot log on to the domain, cannot apply Group Policy, and produces symptoms that look like an account problem.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "DNS failure is usually partial, which is what makes it confusing.",
        ],
        bullets: [
          "Works by IP, fails by name: the definitive signature of a name resolution problem.",
          "Stale cache: an old answer served after a legitimate change, until the TTL expires.",
          "Wrong resolver configured: internal names fail while public names work, or vice versa.",
          "Missing record or typo in the zone: NXDOMAIN for a name that should exist.",
          "Broken delegation: the parent zone's NS records point to servers that are no longer authoritative, so resolution fails intermittently depending on which path a resolver takes.",
          "Split-horizon confusion: internal and external DNS return different answers for the same name by design, and a VPN client ends up asking the wrong one.",
          "Slow resolution: an unreachable primary resolver, where every lookup waits for a timeout before the secondary answers.",
        ],
      },
      {
        heading: "How to Troubleshoot DNS",
        paragraphs: [
          "Prove basic IP connectivity first, ping the gateway and a public IP such as 8.8.8.8. If IP works and names do not, you have isolated DNS in two commands.",
          "Then query deliberately. `nslookup example.com`, or `dig example.com A +noall +answer`, shows the answer and which server gave it. Query a second resolver explicitly (`nslookup example.com 1.1.1.1`) to compare a cached answer against a different cache. Query the authoritative server directly (`dig @ns1.example.com example.com`) to see the truth without any cache. Ask for the specific record type you care about rather than assuming.",
          "Check the TTL in the answer to predict how long a stale answer will persist. Clear the local cache (`ipconfig /flushdns`, or restart the resolver service) to eliminate the client. Finally, inspect the hosts file before concluding that the zone is wrong.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "Network+ and Security+ both test record types, the recursive-versus-authoritative distinction, TTL and caching behaviour, DNS ports (UDP 53 for queries, TCP 53 for zone transfers and large responses), and DNS-based attacks such as cache poisoning and hijacking, along with DNSSEC as the mitigation. A+ tests recognising DNS as the cause of a name-resolution symptom.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "Frequent questions: the difference between a recursive resolver and an authoritative server; what a CNAME is and why it cannot sit at the zone apex; why some users see an old site after a migration; and how you would prove that a fault is DNS rather than connectivity. Each of these is answered directly by the sections above.",
        ],
      },
    ],
  },
];

const lessonDepthByTopic: Record<string, LessonDepth> = {
  ...foundationLessonDepth,
  ...fundamentalsAPlusLessonDepth,
  ...mobileDevicesLessonDepth,
  ...networkSecurityLessonDepth,
  ...linuxServersCloudLessonDepth,
  ...advancedSecurityLessonDepth,
};

export const deepLessons: DeepLesson[] = [
  ...foundationDeepLessons,
  ...fundamentalsAPlusDeepLessons,
  ...mobileDevicesDeepLessons,
  ...networkSecurityDeepLessons,
  ...linuxServersCloudDeepLessons,
  ...advancedSecurityDeepLessons,
].map((lesson) => {
  const depth = lessonDepthByTopic[lesson.topicId];
  return depth ? { ...lesson, depth } : lesson;
});

export function getDeepLesson(topicId: string): DeepLesson | undefined {
  return deepLessons.find((lesson) => lesson.topicId === topicId);
}
