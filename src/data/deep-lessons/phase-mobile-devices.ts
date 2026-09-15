import type { DeepLesson } from "./types";

/**
 * Deep instructional reading for the CompTIA A+ Core 1 Mobile Devices cluster.
 * Written per topic to match the depth every other topic in the curriculum has.
 */
export const mobileDevicesDeepLessons: DeepLesson[] = [
  {
    topicId: "topic-mobile-hardware-and-components",
    readingMinutes: 9,
    intro:
      "A phone is a full computer compressed into a few square centimetres, with almost every part bonded, glued, or shared with another part. This lesson teaches you to turn a vague complaint like 'the screen is acting weird' into a named component and a testable theory.",
    whereYouMeetIt:
      "You meet this on every handset repair, every in-warranty exchange decision, every swollen-battery safety call, and every argument about why one USB-C cable charges a device and an identical-looking one does not.",
    sections: [
      {
        heading: "In Plain Words",
        paragraphs: [
          "Picture the front of a phone as two sheets stacked together. The bottom sheet shows the picture. The top sheet feels your finger. They are manufactured as one piece, which is why people assume they are one thing, but they fail independently: a phone can look perfect and still type by itself, or show a shattered image that still responds to touch exactly where you press.",
          "Behind those sheets sits a battery that is essentially a chemical pouch. It wears out slowly with every charge, and when a cell fails internally it produces gas and swells. A swollen battery is not a performance complaint, it is a fire risk, and it is the one mobile fault where the correct answer is to stop and make the device safe rather than to keep testing.",
        ],
      },
      {
        heading: "What It Is",
        paragraphs: [
          "Mobile hardware is the set of physical components inside a handheld device: the display panel, the touch digitizer bonded over it, the lithium-ion battery, the camera modules, the USB-C charging and data port, and the sensor package that reports motion, light, distance, and identity.",
          "Sensors matter more on a phone than on any other device class, because so much visible behaviour depends on them. Auto-rotate, step counting, screen blanking during a call, automatic brightness, and biometric unlock are all sensor outputs, so a 'software bug' report frequently turns out to be one small sensor or something physically covering it.",
        ],
      },
      {
        heading: "The Parts You Need to Know",
        paragraphs: [
          "Learn these by the symptom each one produces, not by what they look like on a teardown photo.",
        ],
        bullets: [
          "Display panel: the layer producing the image; failures show as dead pixels, lines, backlight loss, or discoloration.",
          "Digitizer: the touch-sensing layer bonded over the glass; failures show as dead zones, ghost touches, or inverted input.",
          "Lithium-ion battery: the rechargeable cell; degrades with charge cycles and heat, and swells when it fails internally.",
          "USB-C port: a connector shape, not a speed standard; it may carry USB 2.0, USB 3.x, Thunderbolt, DisplayPort alternate mode, or USB Power Delivery depending on what both ends implement.",
          "Accelerometer and gyroscope: linear-movement and rotation sensors that drive auto-rotate, step counting, and motion input.",
          "Proximity and ambient light sensors: blank the screen during calls and set automatic brightness.",
          "Biometric reader: fingerprint or face hardware used for unlock and payment authentication, always backed by a PIN.",
          "Camera module: a sealed assembly including lens, sensor, and often optical stabilisation; dust behind the lens cover looks like a software blur.",
        ],
      },
      {
        heading: "How It Works, Step by Step",
        paragraphs: [
          "When a finger touches the glass, the digitizer detects a change in a capacitive field and reports coordinates to the operating system, entirely separately from whatever the display beneath it is drawing. That independence is why the two fail apart from each other, and why a diagnostic touch test proves something a visual inspection cannot.",
          "Charging begins with negotiation, not with power. When a USB-C cable is inserted, the two devices exchange capability information over the configuration channel pins and agree a voltage and current profile before meaningful power flows. If either the cable or the charger cannot advertise a high-power profile, the device falls back to a slow default, which is exactly why two identical-looking cables behave differently.",
          "Lithium-ion cells store charge by moving ions between electrodes. Every full cycle and every period spent hot degrades that chemistry slightly, so capacity falls over time. When internal breakdown produces gas, the pouch expands, pushing the screen or back panel away from the chassis, which is the visible warning that the cell has already failed.",
        ],
      },
      {
        heading: "Worked Example",
        paragraphs: [
          "A user reports their phone 'has a mind of its own', apps open by themselves and text appears in fields they did not tap. The image looks completely normal.",
        ],
        bullets: [
          "Confirm the symptom by watching the device idle on a blank home screen for a minute without touching it.",
          "Observe input events occurring with no finger present, which rules out a user-habit explanation.",
          "Remove any case and screen protector, since a lifted or trapped protector is a common cause of phantom input.",
          "Restart the device to eliminate a transient software state before condemning hardware.",
          "Boot into safe mode so third-party apps cannot generate input, and confirm the phantom touches continue.",
          "Conclude the digitizer layer is failing, since the image is intact and the behaviour survives both software isolation steps.",
          "Quote a screen assembly replacement, noting that on most modern phones the digitizer and panel are bonded and replaced as one unit.",
        ],
      },
      {
        heading: "Where It Is Used in Real Work",
        paragraphs: [
          "Repair benches and help desks use this daily to decide whether a device is repairable in-house, needs an authorised centre, or should be exchanged under warranty. The decision usually rests on whether the failing part is available as a serviceable unit and whether the labour cost is sensible against the device's remaining life.",
          "Fleet administrators use battery health data to plan replacements before failures produce a wave of downtime, especially on shared devices in retail, warehousing, and healthcare where handsets charge and discharge several times a day and wear far faster than a personal phone.",
          "Safety procedure matters here in a way it does not for most IT work. Organisations handling swollen batteries follow a defined process, stop charging, isolate the device, do not compress or puncture it, and dispose of it through a proper recycling route, because a damaged lithium cell can ignite.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "Most handset faults present as one component while originating in another, because everything sits within millimetres of everything else.",
        ],
        bullets: [
          "Ghost touches or dead zones with a perfect image: a failing digitizer, not the display.",
          "Swollen back panel or lifting screen: a failed battery cell, a safety issue rather than a performance one.",
          "Charging only at a particular cable angle: a worn or debris-filled USB-C port, especially after pocket use.",
          "Slow charging with one cable and normal charging with another: an under-rated cable or charger, not a device fault.",
          "Screen stays on during calls and the ear mutes the call: a blocked or failed proximity sensor, often a badly fitted screen protector.",
          "Erratic or stuck auto-rotate: a miscalibrated or failing accelerometer, sometimes fixed by a restart or recalibration.",
          "Blurred photos in every app: dust or damage behind the camera lens cover rather than a camera app problem.",
        ],
      },
      {
        heading: "How to Troubleshoot It",
        paragraphs: [
          "Separate image from touch first. A diagnostic touch pattern or drawing app tells you whether the digitizer reports input accurately across the whole surface, and that single test decides whether you are dealing with a panel fault, a digitizer fault, or neither.",
          "For power complaints, swap the cheapest variable first: a known-good cable, then a known-good charger, then inspect the port with a light for lint and bent pins. Only after all three come back clean should you consider an internal charging circuit or battery fault, since those are the expensive conclusions.",
          "For sensor complaints, remove accessories and restart before disassembling anything. A screen protector covering the proximity window and a stale software state between them explain a large share of sensor tickets, and both are free to rule out.",
          "For any battery complaint, check reported health and cycle count in the device's own battery settings before ordering parts, and inspect the chassis for gaps that indicate swelling.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "CompTIA A+ Core 1 tests mobile display technologies, digitizer and touchscreen behaviour, battery handling and hazards, port and connector types including USB-C capabilities, and the sensors that drive orientation, proximity, and biometric features. Expect symptom-to-component questions rather than pure definition questions.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "A frequent interview question is 'what would you do if you found a swollen battery in a user's phone?'. The strong answer leads with safety, stop charging, isolate the device, do not puncture or compress it, arrange proper replacement and disposal, before mentioning any diagnostic step, because the interviewer is testing judgement, not knowledge of the cell chemistry.",
        ],
      },
    ],
  },
  {
    topicId: "topic-mobile-connectivity",
    readingMinutes: 9,
    intro:
      "A modern phone carries at least five separate radios, each trading range, speed, and battery differently. Most connectivity complaints are really about one radio being blamed for another's job, so this lesson gives you a way to identify which one is actually involved.",
    whereYouMeetIt:
      "You use this when a phone shows full Wi-Fi bars but nothing loads, when a headset pairs but produces no audio, when a contactless payment is refused at the terminal, and when a field worker needs to get a laptop online from a car park.",
    sections: [
      {
        heading: "In Plain Words",
        paragraphs: [
          "Think of the radios as five different ways of delivering a message. Wi-Fi is shouting across a building. Cellular is the postal service covering the whole country. Bluetooth is talking to someone sitting next to you. NFC is whispering to somebody whose ear is touching yours. GPS is different again: it is listening only, like reading signposts to work out where you are, and it never sends your location anywhere by itself.",
          "Once you separate them that way, the diagnostic question becomes simple. Which delivery method is this complaint actually about, and is the problem in getting the message out of the phone, or in whatever is supposed to receive it?",
        ],
      },
      {
        heading: "What It Is",
        paragraphs: [
          "Mobile connectivity covers the wireless technologies in a handheld device: Wi-Fi for local high-speed networking, Bluetooth for short-range peripherals, NFC for centimetre-range exchanges such as payments and pairing, cellular including 4G LTE and 5G for wide-area voice and data, and GPS for satellite positioning.",
          "Tethering and hotspot features sit on top of the cellular radio. A hotspot shares the phone's carrier data connection with other devices over Wi-Fi, Bluetooth, or a USB cable, which means everything it carries consumes the phone's data allowance and drains its battery considerably faster than normal use.",
        ],
      },
      {
        heading: "The Parts You Need to Know",
        paragraphs: [
          "Range and purpose are what separate these technologies; speed alone will mislead you.",
        ],
        bullets: [
          "Wi-Fi: tens of metres, highest throughput, no carrier data cost, and the usual default when available.",
          "Bluetooth: roughly ten metres, low power, designed for peripherals such as headsets, watches, keyboards, and car systems.",
          "NFC: a few centimetres, used for contactless payment, transit and access cards, and tap-to-pair.",
          "Cellular (4G LTE / 5G): carrier-provided wide-area coverage; 5G adds higher speed and lower latency where it is actually deployed.",
          "GPS: a receive-only satellite positioning system; it needs sky visibility and does not transmit your position on its own.",
          "Hotspot / tethering: sharing cellular data to other devices over Wi-Fi, Bluetooth, or USB.",
          "Airplane mode: a single switch disabling every radio, useful both as a policy control and as a diagnostic reset.",
        ],
      },
      {
        heading: "How It Works, Step by Step",
        paragraphs: [
          "Joining a Wi-Fi network is a two-part process that people routinely conflate. First the device associates with the access point and authenticates, which is what produces the signal bars. Then it must obtain IP settings and reach a gateway and a DNS resolver before any website works. A device can complete the first part perfectly and fail the second, which is precisely the 'connected but no internet' complaint.",
          "Bluetooth also has two parts. Pairing exchanges keys once and stores the relationship. Connecting re-establishes that link and negotiates which profiles are in use, such as hands-free calling versus high-quality audio. A device can remain paired for months while failing to connect, or connect for calls while the audio profile never engages.",
          "Cellular attaches to a carrier tower, authenticates using the identity stored on the SIM or eSIM profile, and receives a data bearer from the network. Because coverage, tower load, and the negotiated generation all vary as a user moves, cellular symptoms are frequently intermittent and location-dependent in a way Wi-Fi symptoms are not.",
        ],
      },
      {
        heading: "Worked Example",
        paragraphs: [
          "A user reports that their phone 'has no internet' in one meeting room but works elsewhere in the building.",
        ],
        bullets: [
          "Ask whether messages and calls still work, which separates cellular voice from data and from Wi-Fi entirely.",
          "Check the status bar and confirm the phone is associated with the corporate Wi-Fi network rather than a guest one.",
          "Turn Wi-Fi off so the device falls back to cellular, and retest a website.",
          "The page loads over cellular, proving the device, its DNS settings, and the remote service are all healthy.",
          "Re-enable Wi-Fi and compare with a second device in the same room, which shows the same failure.",
          "Conclude the fault is with that room's access point or its uplink, not with the user's handset.",
          "Escalate to the network team with the room, the access point name, the affected SSID, and the evidence that cellular works from the same spot.",
        ],
      },
      {
        heading: "Where It Is Used in Real Work",
        paragraphs: [
          "Support teams triage connectivity complaints constantly, and the single most valuable habit is establishing whether the complaint is Wi-Fi, cellular, or an application problem before touching any setting. Toggling things at random resolves some tickets and destroys the evidence for the rest.",
          "Field engineering and sales rely on tethering as a routine working tool, which makes data allowance, battery drain, and hotspot security real operational concerns rather than trivia. A hotspot left on an open or weak password becomes an unmanaged access point on whatever site the user is visiting.",
          "Retail and transit environments depend on NFC working reliably, and because the range is centimetres, most failures come down to positioning, a thick case, or the feature being disabled rather than hardware failure.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "Nearly every connectivity symptom maps to one radio and one stage of that radio's process.",
        ],
        bullets: [
          "Associated with Wi-Fi but no pages load: addressing, gateway, DNS, or a captive portal that was never completed.",
          "Bluetooth paired but no sound: the audio profile is not connected, or output is still routed to the phone speaker.",
          "NFC payment refused: the phone is out of the few-centimetre range, a thick case is in the way, or the wallet app is not the default.",
          "Hotspot clients connect but have no data: the carrier plan does not permit tethering, or the phone's own cellular data is off.",
          "Slow or inaccurate GPS: indoors or in an urban canyon with poor sky visibility, or location permissions restricted to the app.",
          "5G icon shown but slow speeds: weak signal, tower congestion, or a low-band 5G deployment that behaves much like LTE.",
          "Battery draining rapidly while travelling: a weak cellular signal forces the radio to transmit at higher power continuously.",
        ],
      },
      {
        heading: "How to Troubleshoot It",
        paragraphs: [
          "Identify the radio first. Asking whether calls, texts, Wi-Fi pages, and Bluetooth audio each work turns one vague complaint into a small matrix that usually points straight at the responsible technology.",
          "Use airplane mode as a controlled reset. Toggling it restarts every radio at once, clearing transient cellular and Wi-Fi states without changing any saved configuration, and it is far safer than deleting network profiles as a first step.",
          "Compare against a second device in the same place. If both fail identically, the fault is in the environment or the infrastructure; if only one fails, the fault is on that device. This one comparison eliminates most escalation arguments.",
          "For Bluetooth, remove the pairing and pair again only after confirming the peripheral is in pairing mode and charged, and check the audio output selector before assuming the link is broken.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "CompTIA A+ Core 1 expects you to compare Wi-Fi, Bluetooth, NFC, cellular generations, and GPS by range and purpose, configure and secure a hotspot, and reason about which technology a described symptom involves. Questions commonly describe a behaviour and ask which wireless technology is responsible.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "A common interview question is 'how would you tell whether a connectivity complaint is Wi-Fi or cellular?'. A strong answer describes disabling Wi-Fi to force the cellular path, retesting, and comparing with a second device in the same location, then explains what each outcome proves.",
        ],
      },
    ],
  },
  {
    topicId: "topic-mobile-configuration-and-apps",
    readingMinutes: 9,
    intro:
      "Almost everything a user cares about on a phone, contacts, photos, mail, purchased apps, lives behind a platform account and a synchronisation setting. This lesson covers provisioning, mail configuration, app sources, backups, and SIM versus eSIM activation, which together make up most mobile setup work.",
    whereYouMeetIt:
      "You use this when provisioning a new hire's handset, migrating a user to a replacement device, setting up corporate mail, activating a travel data plan, or explaining why data 'disappeared' after a device swap.",
    sections: [
      {
        heading: "In Plain Words",
        paragraphs: [
          "A phone is mostly a window onto an account. Sign in with the same Google account or Apple ID on a new device and the contacts, apps, and photos reappear; sign in with a different one and the device looks empty even though nothing was lost. Understanding that distinction prevents the most upsetting support call there is, the one where a user believes years of photos are gone.",
          "Mail behaves the same way. Modern corporate mail keeps the authoritative copy on the server and lets every device show the same mailbox. The old style of mail download pulled messages onto one device and removed them from the server, which is exactly why a message read on a phone can vanish from a laptop.",
        ],
      },
      {
        heading: "What It Is",
        paragraphs: [
          "Mobile configuration is the software-side setup that makes a device usable: the platform account that ties it to purchases, backups, and device-finding services; synchronisation of contacts, calendars, photos, and files; email account configuration; app installation from an official store; cloud backup; and cellular activation through a physical SIM or a downloaded eSIM profile.",
          "App sources are a security decision as much as a configuration one. Google Play and the Apple App Store review and cryptographically sign what they distribute, while sideloading an application package bypasses that review entirely and is the primary route by which mobile malware reaches a device.",
        ],
      },
      {
        heading: "The Parts You Need to Know",
        paragraphs: [
          "These terms come up in almost every provisioning and migration ticket.",
        ],
        bullets: [
          "Platform account: the Google account or Apple ID that owns app purchases, backups, and find-my-device services.",
          "Synchronisation: continuous two-way copying of contacts, calendars, photos, and files between the device and a cloud service.",
          "Exchange / ActiveSync: the corporate mail protocol that syncs mail, calendar, and contacts and can enforce a device policy such as a required PIN.",
          "IMAP: keeps the authoritative copy of mail on the server so multiple devices see the same state.",
          "POP3: downloads mail to one device and, by default, removes it from the server, which breaks multi-device use.",
          "Official app store: a vetted, signed distribution channel; sideloading bypasses its protections.",
          "SIM: a removable card holding subscriber identity, tying the device to a carrier account.",
          "eSIM: an embedded, reprogrammable SIM activated by downloading a carrier profile, common for travel and dual-line use.",
          "Cloud backup: a scheduled copy of device settings, app data, and media used to restore or migrate a device.",
        ],
      },
      {
        heading: "How It Works, Step by Step",
        paragraphs: [
          "Provisioning starts with the platform account. Signing in registers the device against that account, restores any eligible backup, re-downloads purchased apps, and enables the locate-and-erase service. Everything else layered on afterwards, corporate mail, managed apps, policy, depends on that first association being correct, which is why signing in with the wrong account causes so much rework.",
          "Corporate mail setup is a negotiation, not a form. The device contacts the mail service, authenticates through a modern sign-in flow, and then receives the policy attached to that mailbox. If the policy requires a device passcode or encryption that the handset does not currently satisfy, the account simply refuses to finish configuring until the user meets it.",
          "eSIM activation replaces a physical card with a downloaded profile. The user scans a carrier QR code or uses a carrier app, the device downloads and installs the subscriber profile, and the line becomes active. Because the profile is tied to the device, a carrier-locked or already-provisioned handset will fail activation even though the QR code itself is valid.",
        ],
      },
      {
        heading: "Worked Example",
        paragraphs: [
          "A user has been issued a replacement phone and reports that all their contacts and photos are missing.",
        ],
        bullets: [
          "Check which platform account is signed in on the new device and compare it with the account on the old one.",
          "Find that the new device is signed into a personal account created during setup rather than the user's existing account.",
          "Confirm the old device still shows the data, proving nothing has been deleted anywhere.",
          "Check that contact and photo synchronisation were enabled on the old device, not just stored locally.",
          "Sign out of the incorrect account on the new device and sign in with the user's original account.",
          "Allow the initial synchronisation to complete on Wi-Fi and power, since a first sync can move a large volume of media.",
          "Verify contacts, calendar, and photos have populated, then confirm with the user before wiping and returning the old handset.",
        ],
      },
      {
        heading: "Where It Is Used in Real Work",
        paragraphs: [
          "New-hire provisioning and device replacement are routine ticket types in any organisation with mobile users, and both live or die on account hygiene: the right account, sync verified before the old device is wiped, and a documented handover.",
          "Travel support drives eSIM work, because an eSIM lets a user add a local data plan without removing their primary line. Support teams increasingly need to know both the activation flow and the common blockers, particularly carrier locking.",
          "Shared devices in retail, hospitality, and healthcare add a wrinkle: they are provisioned against an organisational account rather than a personal one, and personal cloud sign-ins on them are usually prohibited precisely because they mix personal data into a business device.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "Most configuration failures come from the account layer, the policy layer, or the carrier layer rather than the handset itself.",
        ],
        bullets: [
          "Data 'missing' after a device swap: signed into the wrong platform account, or sync was never enabled on the old device.",
          "Corporate mail refuses to configure: the mailbox policy requires a passcode, encryption, or an OS version the device does not meet.",
          "Mail read on the phone disappears from the laptop: a POP3-style account downloading and removing messages from the server.",
          "Apps stuck pending in the store: no Wi-Fi, insufficient storage, or a payment or account verification issue blocking the queue.",
          "eSIM activation fails: the handset is carrier-locked, the profile has already been claimed, or the device is offline during activation.",
          "Two devices fighting over one account: both syncing the same contacts with conflicting local edits producing duplicates.",
          "Backups not running: the device is never on Wi-Fi and power at the scheduled time, so the last backup is months old.",
        ],
      },
      {
        heading: "How to Troubleshoot It",
        paragraphs: [
          "Always confirm the account before anything else. Reading back the signed-in account address to the user takes seconds and resolves or reframes a large share of 'my data is gone' tickets immediately.",
          "For mail, check the account type and the policy message rather than retyping the password. A refusal to configure usually states the requirement, and the fix is meeting that requirement on the device, not re-entering credentials.",
          "Check sync status timestamps per account. Silent sync failures show up as a last-synced time that is days old, which is far more informative than any error dialog the user remembers.",
          "Never wipe the old device until the new one has been verified as populated and the user has confirmed it. This single rule prevents the worst outcomes in mobile support.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "CompTIA A+ Core 1 covers mobile synchronisation, account setup, corporate email configuration, the difference between server-based and download-based mail, official stores versus sideloading, and SIM versus eSIM activation. Questions often describe a migration or mail symptom and ask for the cause.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "A common interview question is 'walk me through migrating a user to a new phone without losing anything.' A strong answer names the account first, verifies sync and a recent backup on the old device, restores on the new one, validates the data with the user, and only then wipes the old handset.",
        ],
      },
    ],
  },
  {
    topicId: "topic-mobile-security-and-mdm",
    readingMinutes: 9,
    intro:
      "A phone carries mail, files, and authentication for an entire organisation in something that fits in a coat pocket and gets left in taxis. This lesson covers the controls that make that acceptable: screen locks, encryption, remote locate and wipe, mobile device management, and the BYOD separation between work and personal data.",
    whereYouMeetIt:
      "You use this the moment a device is reported lost, when an employee leaves, during a compliance audit, when enrolling a fleet, and every time somebody asks why they must have a PIN when they already use their fingerprint.",
    sections: [
      {
        heading: "In Plain Words",
        paragraphs: [
          "Locking a phone is not one control, it is a chain. The PIN or password is the anchor, the encryption on the storage is tied to it, and the fingerprint or face scan is a convenience shortcut placed in front of it. That is why the device demands the PIN again after a restart: the shortcut cannot unlock the storage on its own.",
          "Mobile device management is the company's remote control for that chain. It can insist the lock exists, confirm encryption is on, push the apps people need, and erase the device if it goes missing. On a personal phone it does something narrower and important: it manages a fenced-off work area and can erase that area alone, leaving personal photos and messages untouched.",
        ],
      },
      {
        heading: "What It Is",
        paragraphs: [
          "Mobile security combines access control (PIN, password, pattern, or biometric), full-device encryption, remote locate, lock, and wipe services, and a mobile device management platform that enforces and reports on policy centrally across a fleet.",
          "BYOD, bring your own device, uses containerisation to place corporate apps and data into a managed work profile that is cryptographically and administratively separate from the personal side of the phone. The organisation governs and can wipe the container; it does not govern or see the user's personal content.",
        ],
      },
      {
        heading: "The Parts You Need to Know",
        paragraphs: [
          "These are the controls you will be asked to explain, enforce, or invoke under pressure.",
        ],
        bullets: [
          "Screen lock: PIN, password, pattern, or biometric; the first and most important control on any handset.",
          "Biometrics: fingerprint or face recognition, always a convenience layer over a PIN fallback rather than a replacement for it.",
          "Full-device encryption: storage encryption bound to the device hardware and the unlock credential, enabled by default on modern iOS and Android.",
          "Remote lock: an MDM or account-level command that locks the device and can display a contact message.",
          "Locate / find-my-device: a service that reports the device's last known position, useful before deciding to wipe.",
          "Remote wipe: erases either the entire device or only the work container, depending on ownership model and policy.",
          "MDM: the management platform enforcing passcode rules, encryption, app allowlists, OS version floors, and wipe capability.",
          "Containerisation / work profile: the separation that makes BYOD acceptable to both the organisation and the employee.",
          "Compliance state: the MDM's verdict on whether a device currently meets policy, often gating access to mail and files.",
        ],
      },
      {
        heading: "How It Works, Step by Step",
        paragraphs: [
          "Enrolment binds the device to the management platform. The device is enrolled through a platform-specific route, downloads its assigned policy, applies settings such as minimum passcode complexity and required encryption, installs managed apps, and reports back a compliance state. Access to corporate mail and files is then typically conditional on that state remaining compliant.",
          "Encryption keys are derived from a combination of hardware-held secrets and the user's unlock credential. That binding is why a device is at its most protected when powered off or freshly restarted, and why biometric unlock is unavailable in that state until the PIN has been entered once.",
          "A wipe command is queued, not instantaneous. The administrator issues it in the console, and the device executes it the next time it reaches the network. A powered-off or SIM-removed handset will not receive the command until it reconnects, which may be never, so the wipe is one part of a response that must also include revoking sessions and credentials on the server side.",
        ],
      },
      {
        heading: "Worked Example",
        paragraphs: [
          "A director calls from an airport to report that their company phone, which has corporate mail on it, has just been left in a taxi.",
        ],
        bullets: [
          "Verify the caller's identity through the standard process before taking any action on the account.",
          "Locate the device in the management console and check its last check-in time and reported position.",
          "Issue a remote lock with an on-screen contact message immediately, since it is reversible and costs nothing if the device is recovered.",
          "Revoke the account's active sessions and require re-authentication, because a queued wipe does nothing for tokens already issued.",
          "Record the time of the report, the actions taken, and the device's last known state in the incident record.",
          "Agree a short recovery window with the director and the security team; if the device is not recovered, issue the wipe.",
          "Confirm afterwards whether the wipe was acknowledged by the device, and note clearly if it was still queued.",
        ],
      },
      {
        heading: "Where It Is Used in Real Work",
        paragraphs: [
          "Lost and stolen device response is the highest-pressure use of this material, and the reason organisations practise it. Speed matters more than certainty, because a lock is reversible and the exposure from waiting is not.",
          "Offboarding uses the same tooling in a calmer way: removing the work container from a personal device, or wiping and reclaiming a corporate one, as part of the leaver process. Doing this reliably is often an audit requirement rather than a preference.",
          "Regulated sectors such as healthcare and finance require demonstrable control of mobile endpoints, so MDM compliance reporting becomes evidence for auditors, not just an operational convenience. That is why 'the user turned the PIN off' is treated as a real finding rather than a minor annoyance.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "Mobile security controls usually fail at the edges, in what they do not cover, or in the assumption that a command has taken effect.",
        ],
        bullets: [
          "Wipe command queued indefinitely because the device is powered off or has no network access.",
          "Users disabling the passcode because biometrics feel sufficient, which also weakens the encryption binding.",
          "Personal devices failing enrolment because the user declines the profile or the OS version is below the policy floor.",
          "Work profile blamed for battery drain, sometimes fairly, when management and mail sync run aggressively.",
          "Forgotten PIN after a biometric change or a restart, locking the user out until a recovery process is followed.",
          "Access left working after a wipe because server-side sessions and tokens were never revoked.",
          "Devices silently non-compliant for weeks because nobody reviews the compliance report.",
        ],
      },
      {
        heading: "How to Troubleshoot It",
        paragraphs: [
          "For a compliance failure, read the specific failing rule in the management console rather than re-enrolling. The console normally names the exact requirement, encryption off, OS too old, passcode too short, and re-enrolment without fixing that requirement simply reproduces the same state.",
          "For an enrolment failure, check network access to the management service first, then the device's OS version, then whether an existing profile or personal configuration conflicts with the one being pushed.",
          "For a lost-device response, treat the console's acknowledgement as the only proof a command took effect, and always pair the device action with a server-side session revocation so recovery does not depend on the handset reconnecting.",
          "For BYOD privacy complaints, show the user what the work profile does and does not cover. Most objections are about surveillance fears the containerisation model already answers.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "CompTIA A+ Core 1 covers screen lock types and their relative strength, biometric limitations and PIN fallback, full-device encryption, locator services, remote wipe, MDM capabilities, and BYOD versus corporate ownership models. Scenario questions frequently ask for the correct first action after a device is lost.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "A common interview question is 'a director loses a phone with company email, what are your first three actions?'. A strong answer verifies identity, locks and locates rather than wiping immediately, revokes server-side sessions, and documents the timeline, escalating to security in parallel rather than afterwards.",
        ],
      },
    ],
  },
  {
    topicId: "topic-mobile-troubleshooting",
    readingMinutes: 9,
    intro:
      "Mobile troubleshooting is the standard diagnostic method applied to a device you mostly cannot open, where the user's habits, the carrier, and the app store are all part of the system. This lesson gives you an ordered approach for drain, connectivity, charging, app, and sync complaints.",
    whereYouMeetIt:
      "You use this on the most common handset tickets there are: 'the battery dies by lunchtime', 'this app keeps crashing', 'it charges really slowly now', and 'my mail stopped updating and nobody told me'.",
    sections: [
      {
        heading: "In Plain Words",
        paragraphs: [
          "On a desktop you can open the case and swap a part to test a theory. On a phone you usually cannot, so the work shifts to evidence the device already collects about itself: which app used the battery, when each account last synced, what happens with third-party apps disabled, and whether a known-good cable behaves differently.",
          "That changes the order of the job rather than the method. You still establish the symptom, form a theory, test the cheapest thing first, and document what you found, you simply do it with settings screens and swaps instead of a screwdriver.",
        ],
      },
      {
        heading: "What It Is",
        paragraphs: [
          "Mobile troubleshooting applies the standard diagnostic method to handheld-specific faults: rapid battery drain, connectivity failures across Wi-Fi, Bluetooth, and cellular, slow or absent charging, applications that crash or misbehave, and synchronisation that stops quietly without producing an error.",
          "Its defining feature is that several of the most useful tools are non-destructive and instant: battery usage statistics, an airplane-mode radio reset, safe mode, an app cache clear, and a known-good accessory swap. Working through those before anything destructive is what separates a technician from somebody resetting devices to factory settings.",
        ],
      },
      {
        heading: "The Parts You Need to Know",
        paragraphs: [
          "These are the diagnostic instruments a phone gives you for free.",
        ],
        bullets: [
          "Battery usage statistics: per-app and per-service power consumption, the first stop for any drain complaint.",
          "Airplane mode reset: restarts every radio at once, clearing transient cellular and Wi-Fi states without deleting configuration.",
          "Safe mode: boots with third-party apps disabled, proving whether an installed app causes a system-level symptom.",
          "Known-good swap: testing with a cable, charger, or accessory confirmed to work elsewhere, isolating the failing link.",
          "Cache clear: removes an app's temporary data without deleting its account or content, fixing most corrupt-state crashes.",
          "Storage check: a nearly full device causes update failures, app crashes, camera errors, and stalled backups.",
          "Sync status timestamps: per-account last-synced times, where silent failures appear long before the user notices.",
          "Update state: OS and app versions, since a known bug fixed upstream is a common and easily missed cause.",
        ],
      },
      {
        heading: "How It Works, Step by Step",
        paragraphs: [
          "Start by pinning the symptom to a boundary. Does it affect one app, one account, one network, or the whole device? That single question routes the ticket: one app points at the app or its cache, one account points at credentials or policy, one network points at the environment, and device-wide points at the OS, storage, or battery.",
          "Then apply non-destructive isolation in order of cost. Restart, then an airplane-mode reset for radio symptoms, then safe mode for behaviour symptoms, then a known-good accessory swap for power symptoms. Each step either eliminates a whole class of cause or confirms one, and none of them lose user data.",
          "Reserve destructive actions for last and prepare for them properly. A cache clear is mild, an app reinstall costs local app state, and a factory reset costs everything not backed up, so a verified recent backup is a precondition rather than an afterthought.",
        ],
      },
      {
        heading: "Worked Example",
        paragraphs: [
          "A user reports their phone's battery now lasts until midday when it used to last all day, with no change in how they use it.",
        ],
        bullets: [
          "Ask when the change started and whether any app was installed or updated around that time.",
          "Open battery usage statistics and review consumption by app and by service over the last 24 hours and the last week.",
          "Find one recently updated app consuming a disproportionate share of the battery while running in the background.",
          "Check the device's own battery health and cycle count to rule out simple cell wear as a parallel cause.",
          "Restrict that app's background activity and location permission, then observe for a full day rather than declaring success immediately.",
          "Confirm consumption has returned to a normal distribution and the device now lasts the working day.",
          "Record the app, its version, and the setting changed, so the same ticket from another user is resolved in minutes.",
        ],
      },
      {
        heading: "Where It Is Used in Real Work",
        paragraphs: [
          "Handset tickets are a steady share of any service desk queue, and because the fixes are mostly settings-level, they are also where good documentation pays off fastest: one well-recorded diagnosis usually resolves the next ten identical reports.",
          "Shared-device environments such as warehouses and clinics generate charging and drain complaints at scale, where the real cause is often the charging infrastructure or the duty cycle rather than any individual device, and the diagnosis has to account for the fleet rather than the handset in your hand.",
          "Silent sync failures are the ones that damage trust, because the user only discovers them when something important is missing. Checking sync timestamps during any mobile ticket is a cheap habit that catches them early.",
        ],
      },
      {
        heading: "Common Problems and How It Fails",
        paragraphs: [
          "The recurring trap is treating a symptom as device-wide when it is scoped to one app, account, or network.",
        ],
        bullets: [
          "Rapid drain from one misbehaving app, or from a weak cellular signal forcing continuous high-power transmission.",
          "Slow charging caused by an under-rated cable or charger rather than the device or its battery.",
          "Apps crashing on launch due to corrupt cached data, insufficient storage, or an OS version mismatch.",
          "Sync stopped silently after a password change, a policy change, or a revoked session, with no visible error.",
          "Overheating during charging while a demanding app runs, causing the device to throttle charging deliberately.",
          "Connectivity symptoms that follow the location rather than the device, which a second-device comparison exposes immediately.",
          "Factory resets performed early, destroying evidence and user data without ever identifying the cause.",
        ],
      },
      {
        heading: "How to Troubleshoot It",
        paragraphs: [
          "Scope the symptom before touching anything: one app, one account, one network, or the whole device. Everything else follows from that answer, and skipping it is why so many mobile tickets get reset to factory settings for no reason.",
          "Work non-destructively in cost order, restart, airplane-mode reset, safe mode, known-good swap, cache clear, and change one variable at a time so the result of each step actually means something.",
          "Check storage and update state early. A device close to full or several versions behind produces a scatter of unrelated-looking symptoms that all clear at once when the underlying condition is fixed.",
          "Verify a recent backup before any destructive step, and confirm the fix with the user over a realistic period rather than at the counter, since drain and sync problems only reappear over hours.",
        ],
      },
      {
        heading: "Exam Relevance",
        paragraphs: [
          "CompTIA A+ Core 1 tests mobile device troubleshooting scenarios including battery drain, charging faults, connectivity failures, app crashes, overheating, and sync problems, and expects the methodical approach, identify, theorise, test, resolve, verify, document, rather than a jump to the fix.",
        ],
      },
      {
        heading: "Interview Relevance",
        paragraphs: [
          "A common interview question is 'a user says their phone battery suddenly drains by lunchtime, what do you do?'. A strong answer starts with when it changed and what the battery statistics show, mentions safe mode and battery health as isolation tools, and explicitly avoids a factory reset until the evidence justifies it.",
        ],
      },
    ],
  },
];
