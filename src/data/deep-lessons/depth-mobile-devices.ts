import type { LessonDepth } from "./types";

/** Depth layer for the CompTIA A+ Core 1 Mobile Devices cluster. */
export const mobileDevicesLessonDepth: Record<string, LessonDepth> = {
  "topic-mobile-hardware-and-components": {
    keyIdeas: [
      "The display panel and the touch digitizer are separate layers and fail independently, so a perfect image with ghost touches is a digitizer fault.",
      "USB-C is a connector shape, not a speed or power standard; the cable and both devices decide what the port can actually do.",
      "A swollen lithium-ion battery is a safety hazard, not a performance complaint, and the device must be taken out of service immediately.",
      "Most 'software' complaints on a phone — auto-rotate, screen blanking on calls, auto-brightness — are really sensor outputs.",
      "Charging faults are diagnosed cheapest-first: cable, then charger, then port, then internal circuit or battery.",
      "Battery health and cycle count are reported by the device itself, so wear can be proven before any part is ordered.",
    ],
    walkthrough: {
      title: "Diagnosing a phone that charges only at a particular cable angle",
      scenario:
        "A sales rep's phone charges only when the cable is held at an angle. They have already tried three cables and two wall adapters.",
      steps: [
        { label: "Step 1", detail: "Confirm the symptom yourself with a known-good cable and charger rather than relying on the report." },
        { label: "Step 2", detail: "Note that multiple cables and adapters behave identically, which moves suspicion from the accessories to the device." },
        { label: "Step 3", detail: "Inspect the USB-C port with a bright light for pocket lint, debris, or visibly bent or flattened pins." },
        { label: "Step 4", detail: "Check for physical play when the cable is inserted, which indicates a worn or partially detached connector." },
        { label: "Step 5", detail: "Clean the port carefully with a non-conductive tool with the device powered off; never use metal probes." },
        { label: "Step 6", detail: "Retest charging at several cable angles and check the device reports a normal charging rate." },
        { label: "Step 7", detail: "If the fault persists, quote a port replacement or refer to an authorised centre, and record the tests already eliminated." },
      ],
      outcome:
        "Either compacted lint is removed and charging becomes reliable at any angle, or the port is confirmed as damaged with the accessories already ruled out.",
    },
    reference: {
      heading: "Mobile Hardware Reference",
      rows: [
        { term: "Digitizer", detail: "Touch-sensing layer bonded over the display; ghost touches and dead zones live here" },
        { term: "Display panel", detail: "Image layer beneath the digitizer; lines, dead pixels, and backlight loss live here" },
        { term: "Lithium-ion swelling", detail: "Failed cell releasing gas — stop charging, isolate, do not puncture or compress" },
        { term: "USB Power Delivery", detail: "Negotiated fast-charging profile; needs support in the device, charger, and cable" },
        { term: "Alternate mode", detail: "USB-C carrying DisplayPort or Thunderbolt instead of plain USB data" },
        { term: "Accelerometer", detail: "Linear motion sensor driving auto-rotate and step counting" },
        { term: "Gyroscope", detail: "Rotation sensor used for orientation and motion input" },
        { term: "Proximity sensor", detail: "Blanks the screen during calls; easily blocked by a screen protector" },
        { term: "Ambient light sensor", detail: "Drives automatic brightness" },
        { term: "Charge cycle", detail: "One full discharge and recharge; the unit battery wear is measured in" },
      ],
    },
    misconceptions: [
      { claim: "A cracked screen means the whole phone is broken.", correction: "The image layer and the touch layer fail separately; test touch before judging the repair." },
      { claim: "USB-C always means fast charging.", correction: "USB-C is only a connector shape; speed and power depend on the standard and the cable's rating." },
      { claim: "A swollen battery just needs charging less often.", correction: "Swelling means the cell has already failed internally and must be replaced and disposed of safely." },
      { claim: "Closing background apps saves battery.", correction: "Modern mobile operating systems already suspend background apps; force-closing them can increase power use." },
    ],
    examTraps: [
      "A question describing a normal image with phantom input is testing digitizer versus display, not a software fault.",
      "Scenarios about two identical-looking cables behaving differently are testing cable capability, not a device fault.",
      "Any swollen battery scenario expects safety first; answers that continue testing or charging are wrong.",
      "A screen going black during calls points to the proximity sensor, not the display.",
    ],
    checkYourself: [
      { question: "The image is perfect but the phone types by itself. Which component?", answer: "The digitizer, the touch-sensing layer over the display." },
      { question: "What is the first action on discovering a swollen battery?", answer: "Stop charging and take the device out of service without puncturing or compressing it." },
      { question: "Why can one USB-C cable charge faster than another?", answer: "Power delivery capability is negotiated and depends on the cable's rating as well as the devices." },
      { question: "Which sensor blanks the screen when the phone is at your ear?", answer: "The proximity sensor." },
    ],
  },

  "topic-mobile-connectivity": {
    keyIdeas: [
      "Wi-Fi association and internet access are two separate stages; full bars only prove the first one succeeded.",
      "Bluetooth pairing and Bluetooth connection are different states, and a paired device can still fail to connect a profile.",
      "NFC works over a few centimetres, so most payment failures are positioning, a thick case, or a disabled setting.",
      "A hotspot shares the phone's cellular data, consuming its allowance and battery, and can be blocked by the carrier plan.",
      "GPS is receive-only: it locates the device but transmits nothing by itself, and needs sky visibility.",
      "Airplane mode is a safe diagnostic reset because it restarts every radio without deleting saved configuration.",
    ],
    walkthrough: {
      title: "Isolating 'no internet' on a phone in one meeting room",
      scenario:
        "A user reports the phone has no internet in one meeting room but works fine elsewhere in the building.",
      steps: [
        { label: "Step 1", detail: "Ask whether calls and text messages still work, separating cellular voice from data and Wi-Fi." },
        { label: "Step 2", detail: "Confirm which network the phone is associated with, since guest and corporate SSIDs behave differently." },
        { label: "Step 3", detail: "Disable Wi-Fi so the device falls back to cellular, then load a website." },
        { label: "Step 4", detail: "The page loads, proving the handset, its DNS resolution, and the remote service are all healthy." },
        { label: "Step 5", detail: "Re-enable Wi-Fi and toggle airplane mode once to reset the radio state." },
        { label: "Step 6", detail: "Test a second device on the same SSID in the same room and observe the same failure." },
        { label: "Step 7", detail: "Escalate to the network team with the room, SSID, access point, and the evidence that cellular works from the same spot." },
      ],
      outcome:
        "The fault is attributed to that room's access point or uplink rather than the handset, with evidence that prevents the ticket bouncing back.",
    },
    reference: {
      heading: "Mobile Wireless Reference",
      rows: [
        { term: "Wi-Fi", detail: "Tens of metres, highest throughput, no carrier data cost" },
        { term: "Bluetooth", detail: "About 10 m, low power, for peripherals and audio profiles" },
        { term: "NFC", detail: "A few centimetres, for payments, transit cards, and tap-to-pair" },
        { term: "4G LTE", detail: "Wide-area carrier data and voice, broad coverage" },
        { term: "5G", detail: "Higher speed and lower latency where deployed; low-band 5G can perform like LTE" },
        { term: "GPS", detail: "Receive-only satellite positioning; needs sky visibility" },
        { term: "Hotspot / tethering", detail: "Shares cellular data over Wi-Fi, Bluetooth, or USB" },
        { term: "Captive portal", detail: "Sign-in page that must be completed before a Wi-Fi network passes traffic" },
        { term: "Airplane mode", detail: "Disables all radios at once; useful as a controlled reset" },
      ],
    },
    misconceptions: [
      { claim: "Full Wi-Fi bars mean the internet is working.", correction: "Bars only show radio association; addressing, gateway, DNS, and any captive portal still have to succeed." },
      { claim: "A 5G icon guarantees fast speeds.", correction: "Signal strength, tower congestion, and the band deployed all matter; low-band 5G can perform like LTE." },
      { claim: "GPS uses mobile data to find you.", correction: "GPS is receive-only; data is used to speed up a fix and to download maps, not to locate the device." },
      { claim: "If Bluetooth says paired, the connection is fine.", correction: "Pairing is a stored relationship; the audio or hands-free profile must also connect for sound to work." },
    ],
    examTraps: [
      "'Connected but no internet' questions are testing the association-versus-addressing distinction.",
      "Centimetre-range scenarios are always NFC, never Bluetooth.",
      "Hotspot questions often hide a carrier plan restriction rather than a device fault.",
      "Battery drain while travelling is usually weak cellular signal, not a failing battery.",
    ],
    checkYourself: [
      { question: "Which technology works within a few centimetres?", answer: "NFC." },
      { question: "How do you quickly prove a fault is Wi-Fi rather than the handset?", answer: "Disable Wi-Fi, retest over cellular, and compare with a second device in the same place." },
      { question: "What does a hotspot actually share?", answer: "The phone's cellular data connection, consuming its allowance and battery." },
      { question: "Why use airplane mode during diagnosis?", answer: "It restarts every radio at once without changing saved network configuration." },
    ],
  },

  "topic-mobile-configuration-and-apps": {
    keyIdeas: [
      "A phone is mostly a window onto a platform account, so the first question in any migration ticket is which account is signed in.",
      "IMAP and Exchange-style sync keep the authoritative mailbox on the server; POP3 downloads and typically removes it, breaking multi-device use.",
      "Corporate mail can refuse to configure until the device meets the mailbox policy, such as a required passcode or encryption.",
      "Official stores vet and sign apps; sideloading bypasses that review and is the main route for mobile malware.",
      "An eSIM is a downloaded carrier profile rather than a card, so carrier locking and already-claimed profiles are common activation blockers.",
      "Never wipe the old device until the new one is verified populated and the user has confirmed it.",
    ],
    walkthrough: {
      title: "Recovering 'missing' data after a phone replacement",
      scenario:
        "A user says all their contacts and photos vanished after being issued a replacement handset.",
      steps: [
        { label: "Step 1", detail: "Read back the platform account signed in on the new device and compare it with the old one." },
        { label: "Step 2", detail: "Find a personal account created during setup instead of the user's existing account." },
        { label: "Step 3", detail: "Confirm the old device still shows the data, proving nothing has been deleted." },
        { label: "Step 4", detail: "Verify contact and photo synchronisation were enabled on the old device rather than stored only locally." },
        { label: "Step 5", detail: "Sign out of the wrong account on the new device and sign in with the correct one." },
        { label: "Step 6", detail: "Let the first sync complete on Wi-Fi and power, since initial media sync can be large." },
        { label: "Step 7", detail: "Verify with the user, then wipe and reclaim the old handset." },
      ],
      outcome: "The data reappears on the new device and the old handset is only wiped after the user has confirmed everything is present.",
    },
    reference: {
      heading: "Mobile Configuration Reference",
      rows: [
        { term: "Platform account", detail: "Google account or Apple ID owning purchases, backups, and find-my-device" },
        { term: "Exchange / ActiveSync", detail: "Corporate mail, calendar, and contact sync that can enforce device policy" },
        { term: "IMAP", detail: "Server holds the authoritative mailbox; all devices see the same state" },
        { term: "POP3", detail: "Downloads mail to one device and by default removes it from the server" },
        { term: "Sideloading", detail: "Installing an app outside the official store, bypassing review and signing" },
        { term: "SIM", detail: "Removable card holding subscriber identity" },
        { term: "eSIM", detail: "Embedded, reprogrammable SIM activated by downloading a carrier profile" },
        { term: "Cloud backup", detail: "Scheduled copy of settings, app data, and media used for restore and migration" },
        { term: "Carrier lock", detail: "Restriction tying a handset to one carrier; a frequent eSIM activation blocker" },
      ],
    },
    misconceptions: [
      { claim: "Data on the phone is safe because it is on the phone.", correction: "Only synced or backed-up data survives a device swap; local-only content is lost with the handset." },
      { claim: "Corporate mail failing to set up means the password is wrong.", correction: "It is usually a policy requirement such as a passcode or encryption the device does not yet meet." },
      { claim: "An eSIM QR code works on any phone.", correction: "Carrier locking and already-claimed profiles both block activation regardless of the code." },
      { claim: "Sideloading is fine if the app looks legitimate.", correction: "Sideloading skips store review and signing, which is the main distribution route for mobile malware." },
    ],
    examTraps: [
      "Mail disappearing from a second device is a POP3 question, not a server outage question.",
      "A mail account refusing to configure is usually testing device policy, not credentials.",
      "Migration scenarios test account identity first, before any restore procedure.",
      "Questions contrasting SIM and eSIM want 'removable card' versus 'downloaded profile', not speed or coverage.",
    ],
    checkYourself: [
      { question: "Which mail setup lets several devices show the same mailbox state?", answer: "IMAP or Exchange-style sync, because the server holds the authoritative copy." },
      { question: "What is the difference between a SIM and an eSIM?", answer: "A SIM is a removable card; an eSIM is embedded and activated by downloading a carrier profile." },
      { question: "First check when a user says data vanished after a phone swap?", answer: "Which platform account is signed in on the new device." },
      { question: "Why prefer official app stores?", answer: "They review and sign apps; sideloading bypasses those protections." },
    ],
  },

  "topic-mobile-security-and-mdm": {
    keyIdeas: [
      "The PIN anchors device encryption; biometrics are a convenience layer in front of it, which is why a PIN is required after a restart.",
      "Full-device encryption is enabled by default on modern iOS and Android and is bound to the unlock credential.",
      "A remote wipe is queued, not instant: a powered-off device executes it only when it next reaches the network.",
      "Locking and locating are reversible; wiping is not, so lock first and wipe once recovery is ruled out.",
      "Server-side session and token revocation matters as much as the device command, because existing sessions survive a queued wipe.",
      "BYOD containerisation lets an organisation manage and wipe a work profile without touching personal data.",
    ],
    walkthrough: {
      title: "Responding to a lost company phone with corporate email",
      scenario: "A director calls from an airport to say their company phone was left in a taxi minutes ago.",
      steps: [
        { label: "Step 1", detail: "Verify the caller's identity using the standard process before acting on the account." },
        { label: "Step 2", detail: "Find the device in the management console and note its last check-in time and reported location." },
        { label: "Step 3", detail: "Issue a remote lock with an on-screen contact message, which is reversible if the device is recovered." },
        { label: "Step 4", detail: "Revoke the account's active sessions and force re-authentication, since tokens already issued survive a device wipe." },
        { label: "Step 5", detail: "Record the report time, actions taken, and the device's last known state in the incident record." },
        { label: "Step 6", detail: "Agree a short recovery window with the director and the security team." },
        { label: "Step 7", detail: "If the device is not recovered, issue the wipe and confirm whether the device acknowledged it or the command is still queued." },
      ],
      outcome:
        "Exposure is contained within minutes through lock plus session revocation, with the irreversible wipe held until recovery is ruled out.",
    },
    reference: {
      heading: "Mobile Security and MDM Reference",
      rows: [
        { term: "Screen lock", detail: "PIN, password, pattern, or biometric; the first control on any device" },
        { term: "PIN fallback", detail: "Required after restart, timeout, or failed biometric attempts" },
        { term: "Full-device encryption", detail: "Storage encryption bound to hardware and the unlock credential" },
        { term: "Remote lock", detail: "Reversible command that locks the device and can show a contact message" },
        { term: "Remote wipe", detail: "Erases the whole device or only the work container, depending on policy" },
        { term: "Locate / find-my-device", detail: "Reports last known position before deciding to wipe" },
        { term: "MDM", detail: "Platform enforcing passcode, encryption, app, and OS-version policy across a fleet" },
        { term: "Work profile / container", detail: "Separated corporate area on a personal device that can be wiped alone" },
        { term: "Compliance state", detail: "The MDM's verdict on the device, often gating access to mail and files" },
      ],
    },
    misconceptions: [
      { claim: "A fingerprint replaces the PIN.", correction: "Biometrics sit in front of the PIN, which backs the encryption keys and is required after a restart." },
      { claim: "Issuing a wipe means the data is gone.", correction: "The command queues until the device reconnects; a powered-off handset may never receive it." },
      { claim: "MDM on a personal phone lets IT read personal messages and photos.", correction: "Containerisation limits management to the work profile, which is also all that gets wiped." },
      { claim: "The first action on a lost device is a full wipe.", correction: "Lock and locate first — they are reversible — and revoke server-side sessions immediately." },
    ],
    examTraps: [
      "Lost-device scenarios usually reward lock and locate over an immediate wipe.",
      "Questions about why a PIN is still needed are testing the encryption binding, not policy preference.",
      "BYOD questions test selective wipe of the work profile, not a full device wipe.",
      "A device showing non-compliant is testing the specific failing policy rule, not re-enrolment.",
    ],
    checkYourself: [
      { question: "Why is a PIN required after a restart even with biometrics enabled?", answer: "The PIN backs the encryption keys; biometrics cannot unlock storage from a cold start." },
      { question: "What happens to a wipe command for a powered-off phone?", answer: "It queues and only executes when the device next reaches the network." },
      { question: "What does containerisation allow on a personal device?", answer: "Managing and wiping corporate data in a work profile without touching personal content." },
      { question: "Why revoke sessions as well as wiping?", answer: "Tokens already issued keep working regardless of what happens to the handset." },
    ],
  },

  "topic-mobile-troubleshooting": {
    keyIdeas: [
      "Scope the symptom first: one app, one account, one network, or the whole device — that answer routes the entire ticket.",
      "Battery usage statistics identify drain causes far faster than guesswork, and battery health separates wear from a misbehaving app.",
      "Airplane mode restarts every radio without deleting configuration, making it the safest first step for connectivity symptoms.",
      "Safe mode proves whether a third-party app causes a device-wide behaviour.",
      "Charging complaints are accessory problems until a known-good cable and charger prove otherwise.",
      "A factory reset is a last resort that destroys evidence and data, and requires a verified backup first.",
    ],
    walkthrough: {
      title: "Tracking down sudden battery drain",
      scenario: "A user's phone now dies by lunchtime with no reported change in how they use it.",
      steps: [
        { label: "Step 1", detail: "Establish when the change started and what was installed or updated around that time." },
        { label: "Step 2", detail: "Review battery usage statistics by app and service over 24 hours and over the past week." },
        { label: "Step 3", detail: "Identify a recently updated app consuming a disproportionate share in the background." },
        { label: "Step 4", detail: "Check battery health and cycle count to rule out cell wear as a parallel cause." },
        { label: "Step 5", detail: "Restrict the app's background activity and location permission rather than uninstalling immediately." },
        { label: "Step 6", detail: "Observe for a full working day, since drain symptoms only reappear over hours." },
        { label: "Step 7", detail: "Document the app, its version, and the change made so the next identical ticket takes minutes." },
      ],
      outcome: "Battery life returns to normal with the cause identified and recorded, and no data lost to an unnecessary reset.",
    },
    reference: {
      heading: "Mobile Troubleshooting Reference",
      rows: [
        { term: "Battery usage statistics", detail: "Per-app and per-service power consumption; first stop for drain" },
        { term: "Battery health / cycle count", detail: "Device-reported wear, separating an aged cell from a rogue app" },
        { term: "Airplane mode reset", detail: "Restarts all radios without deleting saved networks" },
        { term: "Safe mode", detail: "Boots with third-party apps disabled to isolate app-caused behaviour" },
        { term: "Cache clear", detail: "Removes an app's temporary data without deleting its account or content" },
        { term: "Known-good swap", detail: "Testing with a proven cable, charger, or accessory" },
        { term: "Sync status", detail: "Per-account last-synced timestamps where silent failures appear" },
        { term: "Storage check", detail: "A nearly full device causes crashes, failed updates, and stalled backups" },
        { term: "Factory reset", detail: "Last resort; requires a verified backup and destroys diagnostic evidence" },
      ],
    },
    misconceptions: [
      { claim: "A factory reset is a quick fix worth trying early.", correction: "It destroys evidence and user data without identifying the cause, and belongs last." },
      { claim: "Slow charging means the battery is failing.", correction: "An under-rated cable or charger is far more common; swap known-good accessories first." },
      { claim: "If there is no error message, sync is working.", correction: "Sync failures are usually silent; the last-synced timestamp is the real evidence." },
      { claim: "Overheating while charging means the charger is faulty.", correction: "Devices deliberately throttle charging under heat or heavy load, which is protective behaviour." },
    ],
    examTraps: [
      "Troubleshooting scenarios reward the methodical order — identify, theorise, test, resolve, verify, document — over the fastest fix.",
      "Answers proposing a factory reset before non-destructive isolation are almost always wrong.",
      "A symptom that follows the location rather than the device is an environment question.",
      "App crashes in a scenario mentioning a nearly full device are testing storage, not the app.",
    ],
    checkYourself: [
      { question: "What is the first question in any mobile ticket?", answer: "Is the symptom scoped to one app, one account, one network, or the whole device?" },
      { question: "Which tool proves a third-party app causes a device-wide symptom?", answer: "Safe mode, which boots with third-party apps disabled." },
      { question: "What must be true before a factory reset?", answer: "A recent backup has been verified and non-destructive steps have been exhausted." },
      { question: "Where do silent sync failures show up?", answer: "In the per-account last-synced timestamps." },
    ],
  },
};
