/** Career Mode ticket queue. Realistic work items, one per career track. */
import type { Ticket } from "@/lib/app-data/types";

export const tickets: Ticket[] = [
  {
    id: "ticket-helpdesk-account-lockout",
    track: "help_desk",
    topicId: "topic-it-career-overview",
    title: "User locked out of laptop after password change",
    priority: "medium",
    requester: "Dana Whitfield, Accounts Payable",
    report:
      "\"I changed my password on the web portal yesterday from home. This morning my laptop keeps saying my password is wrong and now it says my account is locked. I can still get into email on my phone.\"",
    environment:
      "Windows 11 domain-joined laptop, Microsoft Entra ID hybrid identity, self-service password reset enabled, phone has a saved mail profile.",
    difficulty: "gentle",
    slaNote: "Standard service desk SLA: first response 30 minutes, resolution 8 business hours.",
    actions: [
      {
        id: "act-verify-identity",
        label: "Verify the caller's identity against the approved verification process",
        finding:
          "Identity confirmed using employee ID plus a callback to the number on record. Ticket annotated with the verification method.",
        informative: true,
      },
      {
        id: "act-check-lockout-status",
        label: "Check account status in the directory",
        finding:
          "Account state: locked out. Lockout occurred 08:12 today. Password last changed 17:40 yesterday from the self-service portal.",
        informative: true,
      },
      {
        id: "act-check-signin-logs",
        label: "Review recent sign-in and lockout events",
        finding:
          "Fourteen failed sign-in attempts between 08:05 and 08:12, all from the user's phone IP with the client type 'Exchange ActiveSync'. Laptop sign-ins show only two failures.",
        informative: true,
      },
      {
        id: "act-ask-user-devices",
        label: "Ask the user which devices have saved credentials",
        finding:
          "\"My phone mail was set up two years ago and I never typed the new password into it. There's also an old tablet in my desk drawer that still gets mail.\"",
        informative: true,
      },
      {
        id: "act-check-mfa",
        label: "Check multi-factor authentication registration",
        finding: "MFA registered and healthy. No failed MFA challenges recorded.",
        informative: false,
      },
      {
        id: "act-reimage",
        label: "Book the laptop in for a re-image",
        finding:
          "The imaging queue accepts the booking, but nothing observed so far points at the operating system build.",
        informative: false,
      },
      {
        id: "act-check-network",
        label: "Test the laptop's network connectivity",
        finding: "Laptop has a valid address, reaches the domain controllers, and resolves names normally.",
        informative: false,
      },
    ],
    keyActionIds: ["act-verify-identity", "act-check-lockout-status", "act-check-signin-logs", "act-ask-user-devices"],
    efficientActionCount: 4,
    diagnoses: [
      {
        id: "dx-stale-device-credentials",
        label: "Stale saved credentials on mobile devices are repeatedly submitting the old password and tripping the lockout threshold",
        correct: true,
      },
      {
        id: "dx-user-typo",
        label: "The user is simply typing the wrong password on the laptop",
        correct: false,
        hint: "Compare how many failures came from the laptop with how many came from elsewhere.",
      },
      {
        id: "dx-compromise",
        label: "The account is being brute-forced by an external attacker",
        correct: false,
        hint: "Look at where the failed attempts originate and which client is producing them before escalating this as a security event.",
      },
      {
        id: "dx-profile-corruption",
        label: "The Windows user profile on the laptop is corrupt",
        correct: false,
        hint: "A corrupt profile does not lock a directory account, and mail still authenticates from the phone.",
      },
    ],
    resolutions: [
      { id: "res-unlock", label: "Unlock the account in the directory", correct: true },
      {
        id: "res-update-phone",
        label: "Walk the user through updating the saved password on the phone mail profile",
        correct: true,
      },
      {
        id: "res-remove-tablet",
        label: "Remove or re-authenticate the forgotten tablet's mail profile",
        correct: true,
      },
      {
        id: "res-force-reset",
        label: "Force another password reset",
        correct: false,
        hint: "A second reset does not stop devices that will keep sending whatever password they have saved.",
      },
      {
        id: "res-disable-lockout",
        label: "Ask the identity team to disable the lockout policy for this user",
        correct: false,
        hint: "Weakening a security control to hide a symptom is not a resolution.",
      },
    ],
    verifications: [
      { id: "ver-signin-clean", label: "Confirm no new failed sign-ins appear for 15 minutes after the change", correct: true },
      { id: "ver-user-login", label: "Have the user sign in to the laptop while you stay on the call", correct: true },
      { id: "ver-mail-flow", label: "Confirm mail syncs on the phone with the new password", correct: true },
      {
        id: "ver-assume",
        label: "Assume it is fixed because the unlock command returned success",
        correct: false,
        hint: "An unlock proves the command ran, not that the cause is gone.",
      },
    ],
    reasoningKeywords: ["lockout", "saved", "password", "phone", "failed sign-in", "threshold"],
    communicationKeywords: ["password", "phone", "device", "sign in", "sorry", "next"],
    documentationKeywords: ["verified identity", "lockout", "saved credentials", "unlock", "verified"],
    rootCause:
      "The self-service password change never propagated to devices holding cached credentials. The phone's ActiveSync profile retried the old password every few minutes, exhausting the account lockout threshold each morning. Unlocking alone would have produced a repeat lockout within the hour; the fix is to clear the stale credentials on every device that stores them.",
  },
  {
    id: "ticket-technician-no-display",
    track: "it_technician",
    topicId: "topic-computer-hardware-basics",
    title: "Desktop powers on but shows no display after office move",
    priority: "high",
    requester: "Marcus Reed, Design Studio",
    report:
      "\"My workstation was moved to the new desk over the weekend. The fans and lights come on but both monitors say 'No Signal'. Nothing appears at all, not even the manufacturer logo.\"",
    environment:
      "Tower workstation with a discrete graphics card, two DisplayPort monitors, moved between floors by the facilities team.",
    difficulty: "gentle",
    slaNote: "High priority: a creative workstation blocked for a full day stops billable work.",
    actions: [
      {
        id: "act-observe-post",
        label: "Observe the power-on self-test behaviour and any beep or LED codes",
        finding:
          "Fans spin, chassis LED shows a steady amber diagnostic light. The board's manual maps steady amber to a graphics or memory detection fault. No POST beeps.",
        informative: true,
      },
      {
        id: "act-check-cabling",
        label: "Check the monitor cables and which port they are plugged into",
        finding:
          "Both DisplayPort cables are seated firmly in the graphics card outputs, not the motherboard outputs. Cables are undamaged.",
        informative: true,
      },
      {
        id: "act-test-monitor",
        label: "Test one monitor and cable on a known-good machine",
        finding: "Monitor and cable both display correctly on a laptop, so the display path outside the tower is healthy.",
        informative: true,
      },
      {
        id: "act-open-case",
        label: "Power down, unplug and open the case to inspect seated components",
        finding:
          "The graphics card is sitting slightly proud of the PCIe slot at the rear edge and the retention clip is unlatched. One RAM module is also not fully seated in its clips.",
        informative: true,
      },
      {
        id: "act-reseat-test",
        label: "Reseat the suspect components and retest",
        finding:
          "With the graphics card and memory reseated and clipped, the machine POSTs normally and both monitors light up at native resolution.",
        informative: true,
      },
      {
        id: "act-swap-psu",
        label: "Swap the power supply",
        finding: "A replacement PSU behaves identically; the system already powers up, so supply output was never in question.",
        informative: false,
      },
      {
        id: "act-reinstall-driver",
        label: "Plan a graphics driver reinstall",
        finding: "Nothing can be installed: the machine never reaches firmware POST output, so no operating system is running.",
        informative: false,
      },
    ],
    keyActionIds: ["act-observe-post", "act-check-cabling", "act-test-monitor", "act-open-case"],
    efficientActionCount: 5,
    diagnoses: [
      {
        id: "dx-unseated-hardware",
        label: "Transport vibration unseated the graphics card and a memory module, so the system halts before video output",
        correct: true,
      },
      {
        id: "dx-dead-monitors",
        label: "Both monitors failed during the move",
        correct: false,
        hint: "You already have evidence about the monitors from another machine.",
      },
      {
        id: "dx-dead-psu",
        label: "The power supply is dead",
        correct: false,
        hint: "Consider what a dead supply would mean for the fans and diagnostic LED.",
      },
      {
        id: "dx-os-corruption",
        label: "The Windows installation is corrupt",
        correct: false,
        hint: "Think about which stage of startup produces the manufacturer logo, and whether the machine reaches it.",
      },
    ],
    resolutions: [
      { id: "res-reseat-gpu", label: "Reseat the graphics card and latch the retention clip", correct: true },
      { id: "res-reseat-ram", label: "Reseat the memory module until both clips engage", correct: true },
      { id: "res-secure-transport", label: "Record a transport note so future moves secure expansion cards", correct: true },
      {
        id: "res-order-gpu",
        label: "Order a replacement graphics card",
        correct: false,
        hint: "Replacing hardware before proving it is faulty spends budget on a working part.",
      },
      {
        id: "res-reimage-workstation",
        label: "Re-image the workstation",
        correct: false,
        hint: "Nothing observed so far involves software.",
      },
    ],
    verifications: [
      { id: "ver-post", label: "Confirm a clean POST with the diagnostic LED back to normal", correct: true },
      { id: "ver-dual-display", label: "Confirm both monitors run at native resolution after a full reboot", correct: true },
      { id: "ver-memory-count", label: "Confirm firmware reports the full installed memory capacity", correct: true },
      {
        id: "ver-user-word",
        label: "Close the ticket as soon as one monitor flickers on",
        correct: false,
        hint: "A partial recovery is not a verified fix.",
      },
    ],
    reasoningKeywords: ["seated", "post", "diagnostic", "graphics", "memory", "move"],
    communicationKeywords: ["moved", "loose", "reseated", "working", "no data", "sorry"],
    documentationKeywords: ["amber", "reseated", "graphics", "memory", "post", "verified"],
    rootCause:
      "Physical transport loosened the graphics card and one memory module. The board halted at hardware initialisation, which is why no logo ever appeared and the diagnostic LED stayed amber. Reseating both components restored POST; no part was faulty and nothing needed replacing.",
  },
  {
    id: "ticket-network-vlan-dhcp",
    track: "network_technician",
    topicId: "topic-networking-basics",
    title: "New meeting-room ports get 169.254 addresses",
    priority: "high",
    requester: "Facilities, Building B second floor",
    report:
      "\"The four new wall ports in meeting rooms 2.1 to 2.4 don't work. Laptops connect but get no internet. IT said something about a 169 address. The ports in the corridor work fine.\"",
    environment:
      "Access switch with VLAN 20 for user data and VLAN 99 as an unused default, DHCP server centralised in the data centre, relay configured on the layer 3 switch for VLAN 20 only.",
    difficulty: "standard",
    slaNote: "High priority: four meeting rooms unusable, board review scheduled tomorrow.",
    actions: [
      {
        id: "act-ipconfig",
        label: "Check the client's IP configuration on an affected port",
        command: "ipconfig /all",
        finding:
          "Address 169.254.88.12, mask 255.255.0.0, no default gateway, no DHCP server listed. Link is up at 1 Gbps.",
        informative: true,
      },
      {
        id: "act-switchport",
        label: "Inspect the switch port configuration for the meeting-room ports",
        command: "show running-config interface Gi1/0/21-24",
        finding:
          "Ports Gi1/0/21-24 are access ports with no 'switchport access vlan' statement, so they remain in default VLAN 99. Working corridor ports carry 'switchport access vlan 20'.",
        informative: true,
      },
      {
        id: "act-vlan-brief",
        label: "Check VLAN membership and status on the switch",
        command: "show vlan brief",
        finding: "VLAN 20 active with corridor ports. VLAN 99 active with the four new ports and no layer 3 interface.",
        informative: true,
      },
      {
        id: "act-dhcp-scope",
        label: "Check the DHCP scope and relay configuration",
        finding:
          "The VLAN 20 scope has 41 percent of addresses free and is healthy. No scope or relay exists for VLAN 99, so discovery broadcasts on those ports are never forwarded.",
        informative: true,
      },
      {
        id: "act-cable-test",
        label: "Run a cable certification test on one meeting-room run",
        finding: "The run passes at 1 Gbps with normal length and no faults, matching the link status already seen.",
        informative: false,
      },
      {
        id: "act-restart-dhcp",
        label: "Restart the DHCP server service",
        finding: "The service restarts cleanly and existing clients keep renewing. Affected ports are unchanged.",
        informative: false,
      },
      {
        id: "act-replace-switch",
        label: "Raise an RMA for the access switch",
        finding: "Vendor diagnostics report no hardware fault; the switch forwards traffic normally on its other ports.",
        informative: false,
      },
    ],
    keyActionIds: ["act-ipconfig", "act-switchport", "act-vlan-brief", "act-dhcp-scope"],
    efficientActionCount: 4,
    diagnoses: [
      {
        id: "dx-wrong-vlan",
        label: "The new ports were left in the default VLAN, which has no DHCP scope or relay, so clients fall back to link-local addressing",
        correct: true,
      },
      {
        id: "dx-scope-exhausted",
        label: "The VLAN 20 DHCP scope is exhausted",
        correct: false,
        hint: "You have scope utilisation figures; check them against this theory.",
      },
      {
        id: "dx-bad-cabling",
        label: "The new cable runs are faulty",
        correct: false,
        hint: "Consider what link speed and duplex tell you about the physical layer.",
      },
      {
        id: "dx-dhcp-down",
        label: "The DHCP server is down",
        correct: false,
        hint: "If the server were down, think about which clients would be affected, not just these four ports.",
      },
    ],
    resolutions: [
      { id: "res-assign-vlan", label: "Assign the four ports to VLAN 20 with an access VLAN statement", correct: true },
      { id: "res-save-config", label: "Save the running configuration to startup", correct: true },
      { id: "res-port-description", label: "Add port descriptions so the meeting-room runs are identifiable", correct: true },
      {
        id: "res-static-ip",
        label: "Give each meeting room laptop a static IP address",
        correct: false,
        hint: "Static addressing for shared rooms hides the misconfiguration and creates future conflicts.",
      },
      {
        id: "res-relay-vlan99",
        label: "Add a DHCP relay for VLAN 99 so the default VLAN can lease addresses",
        correct: false,
        hint: "Making the unused default VLAN routable expands the attack surface instead of correcting the port assignment.",
      },
    ],
    verifications: [
      { id: "ver-lease", label: "Confirm a test client leases a VLAN 20 address with a gateway", correct: true },
      { id: "ver-all-four", label: "Test all four ports, not just the first one", correct: true },
      { id: "ver-reachability", label: "Confirm the client reaches an internal and an external destination", correct: true },
      {
        id: "ver-config-only",
        label: "Accept the change as verified because the configuration line is present",
        correct: false,
        hint: "Configuration present is not the same as service delivered.",
      },
    ],
    reasoningKeywords: ["vlan", "dhcp", "169.254", "relay", "access port", "broadcast"],
    communicationKeywords: ["meeting room", "network", "corrected", "tested", "available"],
    documentationKeywords: ["vlan 20", "gi1/0/21", "dhcp", "169.254", "saved", "verified"],
    rootCause:
      "The cabling contractor patched the new rooms but nobody assigned the switch ports to the user data VLAN. Ports stayed in default VLAN 99, which has no layer 3 interface, no scope and no relay, so DHCP discovery never reached the server and Windows fell back to APIPA. Placing the ports in VLAN 20 and saving the configuration resolved all four rooms.",
  },
  {
    id: "ticket-sysadmin-disk-full",
    track: "junior_sysadmin",
    topicId: "topic-operating-systems-overview",
    title: "Application server alerting on low disk space every night",
    priority: "medium",
    requester: "Monitoring alert, escalated by the on-call rota",
    report:
      "\"APP-02 raises a disk space critical alert on the data volume between 02:00 and 03:00 most nights. It usually clears itself by mid-morning. Users report slow report exports in the morning.\"",
    environment:
      "Linux application server, separate 200 GB data volume, nightly backup job at 02:00, application writes verbose logs and temporary export files.",
    difficulty: "standard",
    slaNote: "Recurring alert: fix the cause, do not keep clearing the symptom.",
    actions: [
      {
        id: "act-df",
        label: "Check filesystem usage on the volume",
        command: "df -h /data",
        finding: "/data is 96 percent used at 09:10, with 7.4 GB free of 200 GB. Root filesystem is comfortable at 38 percent.",
        informative: true,
      },
      {
        id: "act-du",
        label: "Find the largest consumers on the volume",
        command: "du -xh /data --max-depth=2 | sort -h | tail",
        finding:
          "/data/exports holds 71 GB in files named export-*.tmp dating back four months. /data/logs holds 44 GB of uncompressed application logs with no rotation.",
        informative: true,
      },
      {
        id: "act-logrotate",
        label: "Check whether log rotation is configured for the application logs",
        command: "cat /etc/logrotate.d/appserver",
        finding: "No logrotate entry exists for the application. Only the system logs are rotated.",
        informative: true,
      },
      {
        id: "act-backup-job",
        label: "Review the nightly backup job and its staging behaviour",
        finding:
          "The 02:00 backup stages a 22 GB archive on /data before shipping it, then deletes it around 08:40. Combined with existing growth it crosses the alert threshold each night.",
        informative: true,
      },
      {
        id: "act-check-inodes",
        label: "Check inode usage",
        command: "df -i /data",
        finding: "Inode usage is 6 percent, so file count is not the constraint.",
        informative: false,
      },
      {
        id: "act-reboot",
        label: "Reboot the server",
        finding: "A reboot returns the same usage figures; nothing on this volume is held only in memory.",
        informative: false,
      },
      {
        id: "act-extend-volume",
        label: "Request another 200 GB from the storage team",
        finding: "Storage confirms capacity is available, though nothing yet explains why 200 GB is insufficient.",
        informative: false,
      },
    ],
    keyActionIds: ["act-df", "act-du", "act-logrotate", "act-backup-job"],
    efficientActionCount: 4,
    diagnoses: [
      {
        id: "dx-unmanaged-growth",
        label: "Unrotated logs and abandoned temporary export files fill the volume, and the nightly backup staging archive pushes it past the threshold",
        correct: true,
      },
      {
        id: "dx-inode-exhaustion",
        label: "The filesystem has run out of inodes",
        correct: false,
        hint: "You have inode figures; compare them with block usage.",
      },
      {
        id: "dx-undersized-volume",
        label: "The volume was simply sized too small for the workload",
        correct: false,
        hint: "Decide whether 115 GB of files that should not exist counts as legitimate workload.",
      },
      {
        id: "dx-backup-failure",
        label: "The backup job is failing and leaving corrupt data",
        correct: false,
        hint: "Check whether the staged archive is removed on schedule before blaming the job itself.",
      },
    ],
    resolutions: [
      { id: "res-purge-exports", label: "Purge stale export temporary files and add a scheduled cleanup for them", correct: true },
      { id: "res-add-logrotate", label: "Add a logrotate policy with compression and retention for the application logs", correct: true },
      { id: "res-move-staging", label: "Move backup staging off the application data volume", correct: true },
      {
        id: "res-delete-logs",
        label: "Delete all logs immediately with no retention policy",
        correct: false,
        hint: "Deleting evidence without retention removes the record you need for the next incident.",
      },
      {
        id: "res-silence-alert",
        label: "Raise the alert threshold so the nightly spike stops paging",
        correct: false,
        hint: "Silencing monitoring is not the same as fixing capacity.",
      },
    ],
    verifications: [
      { id: "ver-usage-drop", label: "Confirm volume usage after cleanup and record the new baseline", correct: true },
      { id: "ver-rotation-run", label: "Force a rotation run and confirm compressed archives appear", correct: true },
      { id: "ver-next-night", label: "Watch the next scheduled backup window without an alert firing", correct: true },
      {
        id: "ver-immediate-close",
        label: "Close the ticket right after deleting files",
        correct: false,
        hint: "The alert is nightly, so the proof is a clean nightly window.",
      },
    ],
    reasoningKeywords: ["logrotate", "export", "backup", "staging", "growth", "threshold"],
    communicationKeywords: ["disk", "cleanup", "rotation", "backup", "monitor"],
    documentationKeywords: ["/data", "logrotate", "export", "staging", "baseline", "verified"],
    rootCause:
      "Three unmanaged growth sources shared one volume: application logs with no rotation, four months of orphaned export temp files, and a 22 GB nightly backup staging archive. Only their combination crossed the threshold, which is why the alert appeared nightly and cleared each morning when staging was removed. Rotation, cleanup and moving staging fixed it without buying storage.",
  },
  {
    id: "ticket-security-phishing-report",
    track: "junior_security_analyst",
    topicId: "topic-dns-fundamentals",
    title: "Reported phishing email with a lookalike domain link",
    priority: "urgent",
    requester: "Priya Raman, Finance, via the report-phishing button",
    report:
      "\"I got an email that looks like it's from our payroll provider asking me to re-confirm my bank details. I clicked the link and the page looked right, but I closed it before typing anything. I'm not certain I didn't enter my password.\"",
    environment:
      "Cloud mail platform with message trace and quarantine, endpoint agent with DNS logging, identity platform with sign-in logs and session revocation.",
    difficulty: "challenging",
    slaNote: "Urgent: possible credential exposure. Contain first, complete the analysis afterwards.",
    actions: [
      {
        id: "act-inspect-headers",
        label: "Inspect the message headers and authentication results",
        finding:
          "SPF fail, DKIM none, DMARC fail. Envelope sender is a free hosting domain; display name mimics the payroll provider. Reply-to differs from the From address.",
        informative: true,
      },
      {
        id: "act-inspect-url",
        label: "Examine the link destination without visiting it",
        finding:
          "Link resolves to payroll-secure-login[.]example-cdn[.]net, registered four days ago, hosting a cloned login page. Not the provider's real domain.",
        informative: true,
      },
      {
        id: "act-dns-logs",
        label: "Query endpoint DNS logs for that hostname across the estate",
        finding:
          "Three endpoints resolved the hostname in the last two hours, including the reporter's. Two other users have not reported anything.",
        informative: true,
      },
      {
        id: "act-signin-logs",
        label: "Review the reporter's sign-in activity",
        finding:
          "One successful sign-in from an unfamiliar ASN 11 minutes ago, MFA satisfied by a token replay pattern, followed by a new mail forwarding rule created on the mailbox.",
        informative: true,
      },
      {
        id: "act-message-trace",
        label: "Run a message trace for the same campaign across the tenant",
        finding: "Nineteen recipients received the campaign; six messages remain unopened in inboxes, one other user clicked.",
        informative: true,
      },
      {
        id: "act-ask-user-details",
        label: "Ask the user exactly what they entered and when",
        finding:
          "\"I typed my email address, and I think my password too, then the page reloaded and I closed it. That was about twenty minutes ago.\"",
        informative: true,
      },
      {
        id: "act-scan-endpoint",
        label: "Run a full antimalware scan on the endpoint",
        finding: "Scan is clean. This campaign harvests credentials rather than dropping malware.",
        informative: false,
      },
      {
        id: "act-block-sender-only",
        label: "Block the sender address only",
        finding: "The sender address is disposable; the campaign already rotates senders across the same infrastructure.",
        informative: false,
      },
    ],
    keyActionIds: ["act-inspect-headers", "act-inspect-url", "act-signin-logs", "act-message-trace", "act-ask-user-details"],
    efficientActionCount: 5,
    diagnoses: [
      {
        id: "dx-credential-phish-with-compromise",
        label: "A credential-harvesting phishing campaign using a lookalike domain has already resulted in a session compromise and mailbox persistence for this user",
        correct: true,
      },
      {
        id: "dx-spam-only",
        label: "Ordinary spam that the filter missed; no action beyond deletion is needed",
        correct: false,
        hint: "Re-read the identity evidence before deciding the impact is limited to the inbox.",
      },
      {
        id: "dx-malware",
        label: "Malware infection on the endpoint",
        correct: false,
        hint: "Consider what the scan result and the attacker's observed actions say about their objective.",
      },
      {
        id: "dx-false-positive",
        label: "A legitimate payroll notification the user misread",
        correct: false,
        hint: "Weigh the authentication results and domain registration age.",
      },
    ],
    resolutions: [
      { id: "res-revoke-sessions", label: "Revoke active sessions and reset the user's credentials", correct: true },
      { id: "res-remove-rule", label: "Remove the attacker-created mail forwarding rule and preserve a copy as evidence", correct: true },
      { id: "res-purge-campaign", label: "Quarantine or purge the remaining campaign messages tenant-wide", correct: true },
      { id: "res-block-infrastructure", label: "Block the lookalike domain at mail filtering and DNS", correct: true },
      {
        id: "res-email-warning-only",
        label: "Send an awareness email and take no technical action",
        correct: false,
        hint: "Awareness does not evict an attacker who already holds a session.",
      },
      {
        id: "res-wipe-laptop",
        label: "Wipe and rebuild the laptop",
        correct: false,
        hint: "Match the response to the attacker's objective shown in the evidence.",
      },
    ],
    verifications: [
      { id: "ver-no-sessions", label: "Confirm no active sessions remain from the unfamiliar location", correct: true },
      { id: "ver-rules-clean", label: "Re-audit mailbox rules and delegated access after the reset", correct: true },
      { id: "ver-dns-blocked", label: "Confirm the lookalike hostname no longer resolves for endpoints", correct: true },
      { id: "ver-other-clickers", label: "Check the second clicker's account for the same indicators", correct: true },
      {
        id: "ver-user-says",
        label: "Close the case because the user says they are fine",
        correct: false,
        hint: "Self-report is not containment evidence.",
      },
    ],
    reasoningKeywords: ["dmarc", "lookalike", "credential", "session", "forwarding rule", "containment"],
    communicationKeywords: ["password", "reset", "sign in", "reported", "thank", "next"],
    documentationKeywords: ["indicator", "domain", "session revoked", "forwarding rule", "scope", "timeline"],
    rootCause:
      "A credential-harvesting campaign used a four-day-old lookalike domain and failed all mail authentication checks. The user submitted credentials and the attacker replayed the resulting session token, then created a mailbox forwarding rule for persistence. Containment required session revocation, credential reset, rule removal, tenant-wide message purge and blocking the infrastructure, followed by scoping the other clicker.",
  },
];
