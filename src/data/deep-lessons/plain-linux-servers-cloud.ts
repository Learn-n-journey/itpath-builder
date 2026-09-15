/** Beginner layer for the linux-servers-cloud topics. Filled in per topic. */
import type { LessonPlainLanguage } from "./types";

export const linuxServersCloudPlainLanguage: Record<string, LessonPlainLanguage> = {
  "topic-linux-filesystem-and-permissions": {
    plainIntro:
      "Every file and folder on a Linux computer has an owner and a set of rules about who is allowed to look at it, change it, or run it. Picture a shared office building where every drawer has a label saying whose it is and who else may open it. If you try to open a drawer you are not allowed into, the building simply refuses, no matter how politely you ask. Learning to read those labels turns confusing 'permission denied' errors into something you can fix in seconds. This matters at work because almost every broken login, broken script, or broken web app you will meet traces back to the wrong person owning or being blocked from a file.",
    wordList: [
      { term: "Owner", plain: "The account that created a file or was later given it, usually with the most control over it." },
      { term: "Group", plain: "A second label on a file that lets several accounts share access without all of them being the owner." },
      { term: "Permissions (read, write, execute)", plain: "The three abilities a file can allow: looking at it, changing it, and running it as a program." },
      { term: "chmod", plain: "The command used to change what a file's owner, group, and everyone else are allowed to do with it." },
      { term: "chown", plain: "The command used to change who owns a file." },
      { term: "Octal mode (like 644 or 755)", plain: "A short number that stands for the read, write, and execute permissions all at once." },
      { term: "umask", plain: "A setting that automatically trims down the permissions given to any newly created file." },
      { term: "setuid and setgid", plain: "Special settings that let a program run using someone else's identity instead of the person who started it." },
      { term: "Sticky bit", plain: "A special setting on a shared folder that stops one person from deleting another person's files there." },
      { term: "Root", plain: "The one account on a Linux machine that can override almost every permission rule." },
    ],
  },

  "topic-linux-package-and-service-management": {
    plainIntro:
      "A Linux server is only ever the plain operating system plus whatever software has been added to it and whatever programs have been told to run in the background. A package manager is like a well-run warehouse: instead of downloading random files and hoping they work, it fetches trusted, checked software and keeps a record of exactly what was installed. The programs that quietly run in the background, like a website server or a database, are called services, and a tool called systemd is the shift manager that starts them in the right order and restarts them if they crash. Getting comfortable with both is what lets you install software safely and keep important programs running even after a reboot.",
    wordList: [
      { term: "Package manager", plain: "The tool that installs, updates, and removes software, and automatically grabs anything else that software needs to run." },
      { term: "Repository", plain: "A trusted online source the package manager downloads software from." },
      { term: "apt / dnf", plain: "Two common package managers, apt on Ubuntu-style systems and dnf on Red Hat-style systems." },
      { term: "Dependency", plain: "A piece of software that another program needs installed in order to work." },
      { term: "Service", plain: "A program that runs quietly in the background, such as a website server, rather than something you open and close by hand." },
      { term: "systemd", plain: "The system that starts, stops, and restarts background services on most modern Linux computers." },
      { term: "Unit file", plain: "A small text file that tells systemd how to start a particular service and what it needs to be ready first." },
      { term: "Enable versus start", plain: "Starting runs a service right now; enabling makes it start automatically the next time the computer reboots." },
      { term: "journalctl", plain: "The tool used to read the log of what services have been doing and why one might have failed." },
    ],
  },

  "topic-bash-scripting-and-automation": {
    plainIntro:
      "A shell script is simply a list of computer commands saved into a file, so that instead of typing the same ten steps every day, you type one word and the computer does all ten for you. Think of it as writing a recipe for someone with no common sense who will follow it exactly, at three in the morning, with nobody watching, so every step has to be spelled out and every mistake has to be caught rather than shrugged off. Automation like this only pays off if the script is honest about failure: a script that quietly breaks and says nothing is worse than no script at all, because it gives you false confidence that something happened when it did not. This is why real automation scripts check their own work at every step instead of just hoping for the best.",
    wordList: [
      { term: "Shell script", plain: "A saved file of commands that the computer runs in order, as if you had typed them yourself." },
      { term: "Shebang line", plain: "The first line of a script that tells the computer which program should be used to run it." },
      { term: "Exit code", plain: "A number every command produces when it finishes, where zero means it worked and anything else means it failed." },
      { term: "Variable", plain: "A named container that holds a piece of information a script can reuse, like a filename or a number." },
      { term: "Quoting", plain: "Wrapping a variable in quote marks so the computer treats its whole value as one thing, even if it contains spaces." },
      { term: "set -e", plain: "A setting that makes a script stop immediately the moment any command inside it fails." },
      { term: "Loop (for/while)", plain: "An instruction that repeats a block of commands, either for every item in a list or until a condition changes." },
      { term: "Cron / scheduled task", plain: "A way of telling the computer to run a script automatically at a set time, without anyone starting it by hand." },
      { term: "Idempotent", plain: "Describes a script that gives the same safe result even if it is accidentally run more than once." },
    ],
  },

  "topic-linux-networking-and-troubleshooting": {
    plainIntro:
      "Most servers have no screen or network icon to click, so every network question has to be answered by typing commands. A server's network setup is a lot like a building's postal address: it needs a valid street address to receive anything, a sign pointing to the nearest post office to send things onward, and a phone book to turn a company name into an actual address. If any one of those three is missing or wrong, messages either never arrive, arrive at the wrong place, or cannot even be looked up. This matters because when a server cannot be reached, being able to check each of these pieces one by one, instead of guessing, is what quickly separates a real problem from a five-minute fix.",
    wordList: [
      { term: "IP address", plain: "The numeric address that lets a computer be found on a network." },
      { term: "Default gateway", plain: "The device a computer sends traffic to whenever the destination is outside its own local network." },
      { term: "Routing table", plain: "The list of rules a computer uses to decide which direction to send traffic for a given destination." },
      { term: "DNS", plain: "The system that turns a name like a website address into the numeric address a computer actually uses." },
      { term: "Port", plain: "A numbered door on a computer where a specific program listens for incoming connections." },
      { term: "Firewall", plain: "A guard that decides which network traffic is allowed through and which is blocked." },
      { term: "ping", plain: "A simple test that asks another computer to reply, showing whether it can be reached at all." },
      { term: "traceroute", plain: "A test that shows every stop a message passes through on its way to a destination, useful for finding where a connection breaks." },
      { term: "Persistent configuration", plain: "Network settings that are saved so they still apply after the computer restarts, instead of disappearing." },
    ],
  },

  "topic-server-hardware-and-storage-arrays": {
    plainIntro:
      "A desktop computer is built cheaply on the assumption that if it breaks, you fix it over a weekend. A server is built on the opposite assumption: something inside it will eventually fail while it is running, and it has to keep working anyway, because a website or database going down is not acceptable. That is why servers duplicate their most failure-prone parts, like power supplies and disks, so losing one does not stop the whole machine. Storage arrays take this further with RAID, which spreads or copies your data across several disks so a single broken disk does not mean lost data. Servers also usually have a separate, independent way to reach and control them remotely, even if the main system has completely crashed.",
    wordList: [
      { term: "Redundancy", plain: "Having a spare of an important part so the whole system keeps working if one copy fails." },
      { term: "RAID", plain: "A way of arranging several physical disks so they act like one drive, with extra protection against a disk failing." },
      { term: "Mirroring (RAID 1)", plain: "Keeping an identical copy of the same data on two disks, so either one can fail without losing anything." },
      { term: "Striping with parity (RAID 5/6)", plain: "Spreading data across several disks along with extra recovery information, so the array can rebuild lost data if a disk fails." },
      { term: "Hot-swappable", plain: "Describes a part, like a drive or fan, that can be pulled out and replaced without turning the server off." },
      { term: "Degraded array", plain: "A storage array that is still working after a disk failure but has lost some or all of its extra protection." },
      { term: "Hot spare", plain: "A spare drive sitting ready in the server that automatically takes over as soon as another drive fails." },
      { term: "Out-of-band management", plain: "A separate, independent connection into a server that still works even if its main operating system has crashed." },
      { term: "ECC memory", plain: "Memory that can detect and quietly fix small errors on its own, instead of causing random crashes." },
    ],
  },

  "topic-windows-server-and-active-directory": {
    plainIntro:
      "Most office networks run on a single central list that decides who exists, what they can log into, and what rules apply to their computer. Active Directory is that central list for Windows networks, working like a company's staff register and rulebook combined in one place, so nobody has to update permissions separately on every single computer. When someone joins, leaves, or changes role, it is changed once in this central register, and every computer respects the new answer automatically. Group Policy is the rulebook part of the same system, letting an administrator write a setting once and have it apply automatically to everyone in the right department, rather than trying to configure hundreds of computers by hand. This matters because a huge share of everyday helpdesk tickets, like someone suddenly unable to log in, trace back to something going wrong in this system.",
    wordList: [
      { term: "Active Directory", plain: "The central Windows system that keeps track of every user, computer, and group on a network and controls who can log in where." },
      { term: "Domain controller", plain: "A server that holds a copy of the central directory and checks people's logins against it." },
      { term: "Domain", plain: "A group of users and computers that are all managed together under the same central directory." },
      { term: "Organizational Unit (OU)", plain: "A folder-like container used to organize users and computers so rules can be applied to a whole group at once." },
      { term: "Group Policy Object (GPO)", plain: "A saved set of settings that gets applied automatically to a group of users or computers." },
      { term: "Replication", plain: "The process of domain controllers copying changes to each other so every copy of the directory stays up to date." },
      { term: "Trust relationship", plain: "An agreement that lets logins from one domain be accepted in another domain." },
      { term: "Security group", plain: "A group of accounts that can be given shared access to something, as opposed to a group used only for email lists." },
    ],
  },

  "topic-backup-and-disaster-recovery": {
    plainIntro:
      "A backup that has never actually been restored is only a hope, not a real safety net. It is like keeping a spare key hidden away in case you get locked out, but never once trying it in the lock, so you have no idea if it still works until the day you desperately need it. Good backup planning starts by agreeing exactly how much data loss and downtime the business can live with, then builds a process proven to meet those numbers, including surviving an attack that specifically targets the backups themselves. Disaster recovery is the bigger version of the same idea: not just getting one file back, but knowing exactly what order to rebuild everything in if the whole system went down at once, written down ahead of time instead of decided in a panic.",
    wordList: [
      { term: "Recovery Point Objective (RPO)", plain: "The most amount of data you can afford to lose, measured in how long since the last good backup." },
      { term: "Recovery Time Objective (RTO)", plain: "The longest amount of time you can afford to be down before service is restored." },
      { term: "Full backup", plain: "A backup that copies everything selected, every single time it runs." },
      { term: "Incremental backup", plain: "A backup that only copies what has changed since the last backup of any kind." },
      { term: "3-2-1 rule", plain: "A backup guideline: keep three copies of data, on two different types of storage, with one copy kept somewhere else entirely." },
      { term: "Offsite / air-gapped backup", plain: "A backup copy kept physically or digitally separate from the main system, so one disaster or attack cannot destroy both at once." },
      { term: "Immutable backup", plain: "A backup stored so it cannot be changed or deleted for a set period, even by someone with access to the system." },
      { term: "Restore testing", plain: "Actually practicing bringing data back from a backup, to prove the backup really works before you need it." },
      { term: "Hot, warm, and cold sites", plain: "Backup locations ranging from ready to take over immediately, to needing some setup time, to needing significant time to become usable." },
    ],
  },

  "topic-monitoring-and-patch-management": {
    plainIntro:
      "Monitoring is like having a smoke detector instead of only finding out about a fire once the building is already burning: it should go off reliably when there is a real problem and stay quiet the rest of the time. If it goes off too often for no good reason, like a smoke detector triggered by toast, people eventually stop trusting it and ignore it completely, which is exactly the danger with alerts that go off for nothing. Patch management is like servicing a whole fleet of delivery vans: you cannot fix every van in the country on the same afternoon, because if the new part turns out faulty, they would all break down at once. Instead you update a small group first, watch closely, and only roll it out further once you are confident it is safe.",
    wordList: [
      { term: "Metric", plain: "A number tracked over time, like how busy a processor is, used to notice trends and problems early." },
      { term: "Baseline", plain: "What normal looks like for a system, so you can tell when something is actually unusual." },
      { term: "Threshold alert", plain: "A warning that fires automatically once a measurement crosses a set limit." },
      { term: "Alert fatigue", plain: "Becoming numb to warnings because there have been too many false alarms, so real problems get missed." },
      { term: "Centralized logging", plain: "Collecting the activity records from many computers into one place that is easy to search during a problem." },
      { term: "Patch", plain: "An update to software, usually to fix a bug or close a security hole." },
      { term: "Staged rollout", plain: "Applying an update to a small test group of machines first before sending it to everyone." },
      { term: "Maintenance window", plain: "A planned time slot for making changes when the fewest people will be affected." },
      { term: "Rollback plan", plain: "A prepared way to undo an update if it causes unexpected problems." },
    ],
  },

  "topic-cloud-service-models-and-deployment": {
    plainIntro:
      "Moving to the cloud does not remove the work of running a system, it just changes who does which part of it. Think of it like the difference between owning a car, renting one, or taking a taxi: owning means you handle everything yourself, renting means the company still handles the big maintenance while you handle the driving and fuel, and a taxi means someone else handles nearly everything except telling the driver where to go. Cloud service models work the same way, with the provider handling more or less of the underlying technology depending on which option you choose. A separate question is where all of this actually lives, entirely with an outside provider, entirely on infrastructure your own company controls, or some planned mix of both. Getting confused about which side is responsible for what is one of the most common causes of real security incidents.",
    wordList: [
      { term: "IaaS (Infrastructure as a Service)", plain: "The provider manages the physical hardware, and you manage everything from the operating system upward." },
      { term: "PaaS (Platform as a Service)", plain: "The provider also manages the operating system and runtime, leaving you responsible only for your own application and its data." },
      { term: "SaaS (Software as a Service)", plain: "The provider manages the entire application, leaving you responsible mainly for your data and who has access to it." },
      { term: "Shared responsibility model", plain: "The agreement spelling out exactly which security and maintenance tasks belong to the provider and which belong to you." },
      { term: "Public cloud", plain: "Computing infrastructure owned by an outside provider and shared among many different customers." },
      { term: "Private cloud", plain: "Computing infrastructure set aside for just one organization, whether run by them or hosted for them alone." },
      { term: "Hybrid cloud", plain: "A deliberate mix of private and public cloud resources connected together and used as one system." },
      { term: "Multi-tenancy", plain: "Several different customers sharing the same underlying cloud infrastructure while being kept separate from each other." },
      { term: "Elasticity", plain: "The cloud's ability to automatically add or remove resources as demand goes up or down." },
    ],
  },

  "topic-cloud-compute-and-networking": {
    plainIntro:
      "In the cloud, an entire network of addresses, subnets, firewalls, and traffic routing is built using settings and configuration files instead of actual cables and switches. It is like designing the layout of a new office building entirely on paper before any walls exist: you decide how the floors and rooms are divided up, and separately you decide which doors are locked to whom. A load balancer works like a receptionist who sends each visitor to whichever available staff member can help, rather than everyone squeezing through one office door. Scaling means the building automatically brings on more staff during a busy day and sends them home again once things quiet down, so you are not paying for a full building of staff around the clock. A mistake in this setup is invisible until real traffic tries to flow through it, so getting the design right matters.",
    wordList: [
      { term: "Virtual network (VPC/VNet)", plain: "A private network space defined entirely in the cloud, kept separate from other customers' networks." },
      { term: "Subnet", plain: "A smaller section carved out of a larger network's address space, often marked as either public or private." },
      { term: "Security group", plain: "A set of firewall-like rules attached to a specific cloud resource, controlling what traffic is allowed in and out." },
      { term: "Load balancer", plain: "A service that spreads incoming traffic across several servers so no single one is overwhelmed." },
      { term: "Health check", plain: "A regular test that decides whether a server is working well enough to keep receiving traffic." },
      { term: "Auto-scaling group", plain: "A set of servers that automatically grows or shrinks in number based on how much demand there is." },
      { term: "Public IP address", plain: "A fixed address that lets a server be reached directly from the internet." },
      { term: "Private subnet", plain: "A section of the network that has no direct path to the internet, reached only through something like a load balancer." },
      { term: "NAT gateway", plain: "A service that lets servers with no direct internet address still reach out to the internet without being reachable from it." },
    ],
  },

  "topic-cloud-identity-and-security": {
    plainIntro:
      "In the cloud there are no physical walls to lock, so identity, meaning proving exactly who or what is asking to do something, becomes the real security perimeter. Every single action, from creating a server to deleting a database, only happens if the account or program asking for it has been specifically given permission to do that exact thing. Handing out a password or key that never expires is like giving someone a spare house key that works forever, even after they no longer need it or if it gets copied. Modern cloud security prefers something more like a hotel key card instead, one that only opens your specific room, only for your stay, and stops working automatically the day you leave. Getting identity and key management wrong is the single most common way real cloud accounts actually get broken into.",
    wordList: [
      { term: "IAM (Identity and Access Management)", plain: "The system that decides which accounts are allowed to do which actions in the cloud." },
      { term: "Principle of least privilege", plain: "Giving an account only the exact permissions it needs to do its job, and nothing extra." },
      { term: "Role", plain: "A set of permissions that can be temporarily borrowed by a user or program instead of stored permanently on it." },
      { term: "Policy", plain: "A written rule stating exactly which actions are allowed or denied on which resources." },
      { term: "Multi-factor authentication (MFA)", plain: "Requiring a second proof of identity beyond just a password, like a code from a phone." },
      { term: "Access key", plain: "A long-lived pair of codes used to prove identity to cloud services, risky if it leaks because it does not expire on its own." },
      { term: "Temporary credentials", plain: "Login details that are issued for a short time and expire automatically, limiting the damage if they are ever stolen." },
      { term: "Encryption at rest / in transit", plain: "Scrambling data so it cannot be read by outsiders, either while it is stored or while it is traveling across a network." },
      { term: "Audit log", plain: "A record of exactly who did what and when, used to investigate anything suspicious." },
    ],
  },

  "topic-containers-and-infrastructure-as-code": {
    plainIntro:
      "A container is like a fully packed shipping crate for a piece of software: the code, its exact settings, and everything it needs to run travel together sealed in one box, so it behaves the same whether it is opened on a laptop or in the cloud. Without that crate, software quietly depends on whatever happens to already be installed on a particular machine, which is exactly why something can work perfectly on one computer and break mysteriously on another. Infrastructure as code applies the same idea to the surrounding computer environment itself, not just the software: instead of clicking through settings by hand, the whole setup is written down in a file, the same way a recipe is written down rather than kept only in someone's memory. Anyone can then read that file to see exactly what exists, recreate it elsewhere, and see precisely what changed by comparing an old version to a new one.",
    wordList: [
      { term: "Container", plain: "A packaged application bundled with everything it needs to run, sharing the host computer's core system rather than needing its own." },
      { term: "Virtual machine", plain: "A heavier alternative to a container that runs a whole separate pretend computer, including its own full operating system." },
      { term: "Dockerfile", plain: "A text file listing the step-by-step instructions used to build a container." },
      { term: "Container image", plain: "The finished, ready-to-run package built from a Dockerfile." },
      { term: "Infrastructure as code", plain: "Describing an entire computing setup as a written file instead of building it manually by clicking through settings." },
      { term: "Terraform", plain: "A common tool that reads a written file describing cloud resources and creates or updates them to match." },
      { term: "Idempotency", plain: "Running the same setup instructions more than once still produces exactly the same result, without duplicating anything." },
      { term: "Kubernetes", plain: "A tool that automatically starts, restarts, and scales containers across a group of machines." },
      { term: "Configuration drift", plain: "When the real, running setup slowly stops matching what its written definition says it should be." },
    ],
  },
};
