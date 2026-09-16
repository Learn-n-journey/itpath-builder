/** Extra Linux+ topics: users and sudo, storage and LVM, logging and boot process. */
import type { TopicSeed } from "./builder";

const L = "cert-comptia-linux-plus";

export const linuxExtraSeeds: TopicSeed[] = [
  {
    slug: "linux-users-groups-and-sudo",
    title: "Linux Users, Groups and Sudo",
    summary: "Create and manage local users and groups, and delegate administrative privilege safely with sudo instead of shared root logins.",
    cert: L, month: 14, week: 2, difficulty: "standard", minutes: 55,
    prereqs: ["linux-filesystem-and-permissions", "command-line-fundamentals"],
    objectives: [
      "Create, modify, and remove users and groups with useradd, usermod, and groupadd.",
      "Read and interpret /etc/passwd, /etc/shadow, and /etc/group.",
      "Configure sudo access through /etc/sudoers and sudoers.d drop-in files with least privilege.",
    ],
    lesson: {
      title: "Identity and delegated privilege",
      body: "Every process on a Linux system runs as some user, and every administrative action should be traceable to a person, not to an anonymous shared root session. Users, groups, and sudo are how Linux turns 'who can do what' into an auditable, enforceable policy.",
      definition: "A user account has a numeric UID, a primary group, optional supplementary groups, a home directory, and a login shell, recorded in /etc/passwd with the hashed password in /etc/shadow. Groups, listed in /etc/group, bundle users for shared access. sudo allows a permitted user to run commands as another user, typically root, based on rules in /etc/sudoers, edited safely with visudo, or in individual files under /etc/sudoers.d/. Sudo logs every invocation, unlike a shared root shell.",
      whyItMatters: "Shared root passwords make incident investigation impossible because no log entry says who actually ran a destructive command. Sudo with per-user rules gives administrators exactly the access their job requires while preserving an audit trail, which is required in most compliance frameworks and expected in any real operations team.",
      keyTerms: [
        ["UID", "The numeric identifier the kernel actually uses to represent a user."],
        ["/etc/shadow", "The file holding hashed passwords and aging policy, readable only by root."],
        ["Primary group", "The default group assigned to files a user creates."],
        ["visudo", "The safe editor for /etc/sudoers that validates syntax before saving."],
        ["sudoers.d", "A directory of separate drop-in files merged into the sudo configuration."],
      ],
      examples: [
        "usermod -aG developers alice adds alice to the developers group without removing her existing groups.",
        "A sudoers.d file granting %backupadmins ALL=(root) /usr/bin/systemctl restart backup.service limits a group to one specific command.",
      ],
      misconceptions: [
        "usermod -G, without -a, replaces all supplementary groups instead of adding one, which silently strips existing access.",
        "Giving someone sudo ALL=(ALL) ALL because they need one command is not least privilege and defeats the purpose of using sudo at all.",
      ],
      summary: "Manage identity through the standard account files, always add rather than overwrite group membership, and grant sudo rights as narrowly as the task allows using visudo or sudoers.d files.",
      nextSteps: [
        "Create a test user, add it to a secondary group with -aG, and confirm membership with the groups command.",
        "Write a sudoers.d rule that permits one command for one group and test it as that user.",
      ],
    },
    module: {
      howItWorks: [
        "useradd creates the account and home directory; passwd sets the password hash in /etc/shadow.",
        "The kernel checks UID and GID membership, not usernames, when evaluating file access.",
        "sudo consults /etc/sudoers and sudoers.d, matching user or group, host, and allowed command before permitting an action.",
      ],
      whereYouSeeIt: ["Onboarding and offboarding staff, shared team servers, CI service accounts, and any environment with compliance or audit requirements."],
      commonProblems: ["Locked out after a group change removed existing access", "New user cannot sudo at all", "Password expired unexpectedly", "Duplicate UID after manual account creation", "Group membership not applied until re-login"],
      howItFails: [
        "Using usermod -G instead of -aG removes a user from every group not explicitly listed, breaking access that worked yesterday.",
        "A sudoers syntax error edited outside visudo can lock out sudo entirely until fixed from a root or recovery console.",
        "Group membership changes do not apply to an already open session, so a user who was just added to a group must log out and back in.",
      ],
      troubleshooting: [
        "Check id username to see current UID, GID, and all group memberships.",
        "Read /var/log/auth.log or the journal for sudo denial messages, which state exactly which rule was missing.",
        "Always edit sudoers files with visudo or visudo -f so a syntax error is caught before saving.",
      ],
      practicalKnowledge: [
        "Prefer group-based sudo rules over per-user rules so access follows role changes automatically.",
        "Remove accounts promptly on offboarding and audit sudoers.d periodically for stale entries.",
      ],
      examCoverage: ["User and group management commands", "Account files and password aging", "sudo configuration and privilege delegation"],
      interviewQuestions: ["What is the difference between usermod -G and usermod -aG, and why does it matter?", "How would you grant a junior admin the ability to restart one service without giving full root access?"],
    },
    recall: [
      ["Which file stores hashed passwords rather than account metadata?", ["/etc/shadow", "hashed", "root only"], "/etc/shadow holds password hashes and aging data, readable only by root, separate from /etc/passwd."],
      ["What mistake does usermod -G developers alice make if alice is already in the admins group?", ["removes", "overwrites", "admins group", "not additive"], "Without -a, usermod -G replaces the full supplementary group list, dropping alice from admins."],
      ["What tool should be used to edit /etc/sudoers directly and why?", ["visudo", "syntax check", "lockout"], "visudo validates syntax before saving, preventing a broken sudoers file from locking out administrative access."],
    ],
    practice: {
      title: "Diagnose a broken sudo rule",
      prompt: "A new administrator reports 'alice is not in the sudoers file. This incident will be reported.' when running a permitted command. What is the most likely cause?",
      choices: ["Alice's password has expired", "Alice has not been granted a matching rule in /etc/sudoers or sudoers.d", "Alice's home directory has wrong permissions", "The sudo package is not installed on the client machine she is connecting from"],
      answerIndex: 1,
      explanation: "That exact message means sudo found no rule for the user or their groups on that host, not a password or permission problem.",
    },
    scenario: {
      title: "Group change removes access",
      situation: "After running usermod -G contractors bob to add him to a new project group, bob reports he can no longer access the shared engineering directory he used yesterday.",
      decisionPrompt: "What happened, and how do you restore his access without repeating the mistake?",
      expectedConcepts: ["usermod -aG", "overwritten groups", "supplementary group", "re-login"],
      guidance: "Using -G without -a replaced bob's group list instead of adding to it, dropping the engineering group. Re-add both groups with usermod -aG and have him log out and back in for the change to take effect.",
    },
  },
  {
    slug: "linux-storage-filesystems-and-lvm",
    title: "Linux Storage, Filesystems and LVM",
    summary: "Partition disks, create and mount filesystems, and manage flexible storage with the Logical Volume Manager.",
    cert: L, month: 15, week: 2, difficulty: "challenging", minutes: 60,
    prereqs: ["linux-filesystem-and-permissions", "linux-package-and-service-management"],
    objectives: [
      "Partition a disk and create filesystems using fdisk, parted, and mkfs.",
      "Mount filesystems persistently through /etc/fstab using UUIDs.",
      "Create and extend logical volumes across physical volumes and volume groups with LVM.",
    ],
    lesson: {
      title: "From raw disk to usable, growable storage",
      body: "A blank disk is useless until it is partitioned, formatted, and mounted. On production servers that storage also needs to grow without downtime, which is exactly what LVM was built for.",
      definition: "Storage moves through layers: a block device is divided into partitions with fdisk, parted, or gdisk, then formatted with a filesystem such as ext4 or xfs using mkfs, then mounted onto a directory. LVM adds a flexible layer between disks and filesystems: physical volumes are combined into a volume group, from which logical volumes are carved out and can be resized while the system runs. Persistent mounts belong in /etc/fstab, referenced by UUID rather than device name because device names can shift between boots.",
      whyItMatters: "Disks fill up, and swapping hardware or resizing a traditional partition is disruptive. LVM lets an administrator extend a logical volume and its filesystem live, add new physical disks into an existing volume group, and take snapshots before risky changes, all without unmounting the filesystem or rebooting the server.",
      keyTerms: [
        ["Physical volume (PV)", "A disk or partition initialized for use by LVM."],
        ["Volume group (VG)", "A pool of storage formed from one or more physical volumes."],
        ["Logical volume (LV)", "A resizable virtual partition carved out of a volume group."],
        ["UUID", "A unique filesystem identifier used in fstab so mounts survive device renaming."],
        ["xfs_growfs / resize2fs", "Commands that grow a filesystem after its underlying logical volume is extended."],
      ],
      examples: [
        "lvextend -L +20G /dev/vg_data/lv_home followed by resize2fs grows a home volume without unmounting it.",
        "blkid lists each partition's UUID, which is then copied into /etc/fstab instead of a device path like /dev/sdb1.",
      ],
      misconceptions: [
        "Extending a logical volume alone does not grow the filesystem inside it; the filesystem must be resized separately with resize2fs or xfs_growfs.",
        "Using /dev/sdb1 in fstab instead of its UUID can mount the wrong disk after a reboot if device enumeration order changes.",
      ],
      summary: "Understand the layering from block device to partition to filesystem, prefer UUID-based fstab entries, and use LVM so storage can grow without downtime or reformatting.",
      nextSteps: [
        "Create a physical volume, volume group, and logical volume on a spare disk, then mount it via UUID.",
        "Extend that logical volume and its filesystem live and confirm the extra space with df -h.",
      ],
    },
    module: {
      howItWorks: [
        "Partitioning tools write a partition table (MBR or GPT) describing where partitions start and end on the disk.",
        "mkfs writes filesystem metadata structures onto a partition or logical volume so the kernel can store files on it.",
        "LVM's device mapper layer presents logical volumes to the kernel as if they were ordinary block devices, hiding the underlying physical layout.",
      ],
      whereYouSeeIt: ["Server root and data partitions, database storage that must grow over time, virtual machine disks, and backup or snapshot workflows."],
      commonProblems: ["Filesystem full despite LV having free space", "fstab entry referencing a device name that changed", "Volume group has no free physical extents to extend into", "Filesystem type mismatch between mkfs and mount options", "Unmounted or busy device preventing resize"],
      howItFails: [
        "An administrator extends the logical volume but forgets to resize the filesystem, so df still reports the old, smaller size.",
        "A disk is unplugged and reinserted in a different slot, changing /dev/sdb to /dev/sdc, and a device-path fstab entry mounts the wrong volume or fails at boot.",
        "A volume group runs out of free physical extents because no additional physical volume was ever added, blocking further growth.",
      ],
      troubleshooting: [
        "Compare lvs and df -h output; a mismatch between LV size and filesystem size means the filesystem resize step was skipped.",
        "Use blkid or lsblk to confirm UUIDs match what is in /etc/fstab before rebooting after any storage change.",
        "Check vgs for free physical extents before attempting to extend a logical volume.",
      ],
      practicalKnowledge: [
        "Always test a new or edited fstab entry with mount -a before rebooting, so a mistake surfaces immediately rather than at boot.",
        "Take an LVM snapshot before a risky upgrade so a failed change can be rolled back quickly.",
      ],
      examCoverage: ["Partitioning and filesystem creation tools", "Persistent mounts and fstab syntax", "LVM concepts: PV, VG, LV, and resizing"],
      interviewQuestions: ["Why should fstab entries use UUIDs instead of device names?", "Walk through the steps to add space to a filesystem that is running out of room using LVM."],
    },
    recall: [
      ["Why does df still show the old size after lvextend succeeds?", ["filesystem not resized", "resize2fs", "xfs_growfs", "separate step"], "Extending the logical volume only changes the block device size; the filesystem itself must be grown separately with resize2fs or xfs_growfs."],
      ["Why prefer UUIDs over device names in /etc/fstab?", ["device names can change", "enumeration order", "wrong disk mounted"], "Device names like /dev/sdb1 can shift between boots depending on detection order, while a UUID uniquely and permanently identifies the filesystem."],
      ["What blocks a volume group from being extended further?", ["no free physical extents", "no additional PV", "vgs"], "A volume group can only grow if it has free physical extents or a new physical volume is added to it."],
    ],
    practice: {
      title: "Resize a full filesystem",
      prompt: "A logical volume was successfully extended with lvextend, but df -h still shows the filesystem as full. What step was missed?",
      choices: ["The volume group needs a new physical volume added", "The filesystem itself needs to be resized with resize2fs or xfs_growfs", "The logical volume needs to be remounted read-only first", "The partition table needs to be rewritten with parted"], 
      answerIndex: 1,
      explanation: "lvextend only changes the size of the underlying block device; the filesystem metadata must be grown separately to make the new space usable.",
    },
    scenario: {
      title: "Storage mount fails after maintenance",
      situation: "After a hardware technician reseats drives during scheduled maintenance, the server fails to boot cleanly and drops to an emergency shell reporting it cannot mount a filesystem listed in /etc/fstab by device name.",
      decisionPrompt: "What caused the failure, and how should the fstab entry be corrected to prevent it from happening again?",
      expectedConcepts: ["device name changed", "UUID", "blkid", "fstab"], 
      guidance: "Reseating drives changed device enumeration order, so /dev/sdb1 no longer points to the intended filesystem. Identify the correct UUID with blkid and replace the device path in fstab with that UUID.",
    },
  },
  {
    slug: "linux-logging-systemd-and-boot-process",
    title: "Linux Logging, systemd and Boot Process",
    summary: "Trace a Linux system from firmware to login prompt and use journald and syslog to diagnose startup and runtime failures.",
    cert: L, month: 15, week: 4, difficulty: "challenging", minutes: 55,
    prereqs: ["linux-package-and-service-management", "linux-filesystem-and-permissions"],
    objectives: [
      "Describe the Linux boot sequence from firmware through the bootloader, kernel, and init system to a login prompt.",
      "Use journalctl and traditional syslog files to locate the cause of a boot or runtime failure.",
      "Change and diagnose systemd targets, including recovering a system stuck in the wrong target.",
    ],
    lesson: {
      title: "From power-on to a working shell",
      body: "Every Linux boot follows the same sequence of handoffs, and every one of those handoffs can fail in its own distinctive way. Recognizing which stage failed is what separates a five-minute fix from a reinstalled server.",
      definition: "Boot begins with firmware, either legacy BIOS or UEFI, which locates and runs a bootloader such as GRUB. GRUB loads the kernel and an initial RAM filesystem, then hands control to the kernel, which mounts the real root filesystem and starts PID 1, normally systemd. systemd then activates units in dependency order to reach a target, the modern equivalent of a runlevel, such as multi-user.target for a normal server or graphical.target for a desktop. Throughout this process and during normal operation, systemd's journald collects structured logs, viewable with journalctl, while many services also write to traditional syslog-style files under /var/log.",
      whyItMatters: "When a server fails to come back up after a patch or power event, knowing which stage failed points directly to the fix: a GRUB problem needs a rescue boot, a filesystem problem needs fsck, and a unit dependency problem needs systemctl and journalctl. Guessing at this sequence wastes outage time that a clear mental model avoids.",
      keyTerms: [
        ["GRUB", "The bootloader that loads the Linux kernel and passes it boot parameters."],
        ["initramfs", "A small temporary root filesystem used to load drivers needed to mount the real root."],
        ["PID 1", "The first process started by the kernel, normally systemd, which starts everything else."],
        ["Target", "A systemd unit representing a boot state, such as multi-user.target or rescue.target."],
        ["journald", "The systemd logging service that stores structured, indexed logs queried with journalctl."],
      ],
      examples: [
        "systemctl get-default and systemctl set-default multi-user.target check and change which target a server boots into.",
        "journalctl -b -p err shows only error-level messages from the current boot, quickly narrowing a large log.",
      ],
      misconceptions: [
        "A server that boots to an emergency shell is not necessarily corrupted; it is very often a filesystem failing fsck or a bad fstab entry.",
        "journalctl logs are not automatically permanent on every distribution; persistent storage under /var/log/journal must be configured or the logs vanish on reboot.",
      ],
      summary: "Follow the boot handoff from firmware to bootloader to kernel to systemd targets, and use journalctl alongside traditional log files to pinpoint exactly which stage failed.",
      nextSteps: [
        "Run journalctl -b -1 to review the previous boot's log and identify the last messages before a shutdown or crash.",
        "Deliberately set a test system to a different target with systemctl isolate and observe the effect, then return it to multi-user.target.",
      ],
    },
    module: {
      howItWorks: [
        "Firmware runs power-on self test then hands off to the bootloader recorded in its boot order.",
        "The kernel uses the initramfs to load storage drivers before mounting the real root filesystem read-write.",
        "systemd resolves unit dependencies to bring the system to the configured default target, starting units in parallel where possible.",
      ],
      whereYouSeeIt: ["Server reboots after patching, post-outage recovery, hardware replacement, and any investigation into why a service was unavailable during a specific time window."],
      commonProblems: ["System drops to emergency mode on boot", "Server boots but no services started", "Journal missing after reboot", "Boot hangs waiting for a device", "Wrong default target after an update"],
      howItFails: [
        "A bad entry in /etc/fstab causes systemd to drop to emergency mode waiting for manual fsck or correction.",
        "A missing or corrupted initramfs leaves the kernel unable to find drivers for the root disk, halting boot before systemd even starts.",
        "Journald configured for volatile-only storage discards all logs from a boot as soon as the system restarts, hiding evidence of what went wrong.",
      ],
      troubleshooting: [
        "Boot to a rescue or emergency shell and read the last journal or console messages to identify the failing unit or mount.",
        "Use journalctl -b -1 to inspect the previous boot's log when investigating an unexpected reboot.",
        "Check systemctl get-default and systemctl list-dependencies to confirm the system is aiming for the intended target.",
      ],
      practicalKnowledge: [
        "Configure persistent journald storage on production systems so logs survive reboots for later investigation.",
        "Keep a documented rescue procedure, since recovering from a bad GRUB or fstab entry under pressure is not the time to learn the steps.",
      ],
      examCoverage: ["Boot sequence stages and their failure modes", "systemd targets and PID 1 responsibilities", "journald and syslog log analysis"],
      interviewQuestions: ["Walk through what happens between pressing the power button and reaching a login prompt on a Linux server.", "A server keeps dropping to emergency mode after reboot. How do you investigate it?"],
    },
    recall: [
      ["What loads the kernel and hands it control during boot?", ["GRUB", "bootloader"], "GRUB, the bootloader, locates and loads the kernel along with the initramfs and passes boot parameters to it."],
      ["What is PID 1 responsible for on a modern Linux system?", ["systemd", "starts all other processes", "reaches target"], "PID 1, normally systemd, starts every other process and unit in dependency order to reach the configured target."],
      ["Why might journal logs be missing after a reboot even though journald ran?", ["volatile storage", "not persistent", "/var/log/journal"], "If journald is configured for volatile storage only, logs are kept in memory and discarded on reboot instead of being written to /var/log/journal."],
    ],
    practice: {
      title: "Diagnose an emergency mode boot",
      prompt: "After a routine reboot, a server drops to an emergency shell instead of reaching a login prompt, and the console mentions a failed mount. What is the most direct next step?",
      choices: ["Reinstall the operating system", "Check /etc/fstab and run fsck on the affected filesystem", "Replace the disk immediately", "Roll back the last kernel update without further investigation"],
      answerIndex: 1,
      explanation: "Emergency mode triggered by a failed mount is almost always a bad fstab entry or a filesystem needing repair, both of which are checked and fixed from the emergency shell.",
    },
    scenario: {
      title: "Missing logs after an outage",
      situation: "A server rebooted unexpectedly overnight. When the team runs journalctl the next morning, only a few minutes of logs from after the reboot are present, with nothing from before the crash.",
      decisionPrompt: "Why are the earlier logs unavailable, and what should change to prevent this gap in future incidents?",
      expectedConcepts: ["volatile journal", "persistent storage", "/var/log/journal", "journalctl -b -1"],
      guidance: "The journal was likely configured for volatile, memory-only storage, so everything before the reboot was lost. Configure persistent storage under /var/log/journal so future incidents can be investigated with journalctl -b -1.",
    },
  },
];
