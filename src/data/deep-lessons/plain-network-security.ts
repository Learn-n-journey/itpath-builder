/** Beginner layer for the network-security topics. Filled in per topic. */
import type { LessonPlainLanguage } from "./types";

export const networkSecurityPlainLanguage: Record<string, LessonPlainLanguage> = {
  "topic-osi-model-and-encapsulation": {
    plainIntro:
      "Sending data over a network is like mailing a letter through several hand-off points, where each point only needs to read its own part of the wrapping. The OSI model gives names to each of those wrapping steps, from raw electrical signals on a cable up to the actual app on your screen. You do not need to memorise it to sound smart, you need it so you can say exactly where a problem lives instead of just saying 'the internet is broken'. A switch only cares about one layer of the wrapping, a router cares about a deeper layer, and your browser cares about the very inside of the envelope. Once you know which device cares about which layer, you can test each one in order and find a fault fast.",
    wordList: [
      { term: "OSI model", plain: "A seven-step map of everything a network does, used to describe exactly where a problem is happening." },
      { term: "Encapsulation", plain: "Wrapping your data in a new layer of information each step of the way before it is sent." },
      { term: "Decapsulation", plain: "Unwrapping those layers in reverse order once the data arrives." },
      { term: "Physical layer", plain: "The actual cables, plugs, and signals; a dead port or bad cable lives here." },
      { term: "Data link layer", plain: "The layer that handles local hardware addresses; switches work at this level." },
      { term: "Network layer", plain: "The layer that handles IP addresses and finding the way across networks; routers work here." },
      { term: "Transport layer", plain: "The layer that handles the numbered doors called ports and makes sure data arrives reliably." },
      { term: "Application layer", plain: "The very top layer, the actual program you are using, like a browser or email app." },
      { term: "Frame, packet, segment", plain: "Different names for the same piece of data depending on which layer is wrapping it." },
    ],
  },

  "topic-ethernet-switching-and-vlans": {
    plainIntro:
      "A switch is like an office receptionist who quickly learns which room every person sits in and delivers mail directly instead of shouting it down every hallway. A VLAN is like splitting one office building into separate companies that share the same walls and wiring but are never allowed to see each other's mail. This matters because most offices use VLANs to keep departments, guest Wi-Fi, phones, and cameras separate even though they all plug into the same physical switches. When something is set up wrong here, a person who moves desks can suddenly lose access to everything, which is one of the most common real-world tickets in IT.",
    wordList: [
      { term: "Switch", plain: "A device that passes messages between machines on the same local network, learning where each one sits." },
      { term: "MAC address table", plain: "The switch's memory of which device is plugged into which port." },
      { term: "VLAN", plain: "A way to split one physical switch into several separate, isolated networks." },
      { term: "Access port", plain: "A switch port set up for one single VLAN, normally used for one person's computer." },
      { term: "Trunk port", plain: "A switch port that carries traffic for several VLANs at once, usually linking two switches together." },
      { term: "Native VLAN", plain: "The one VLAN on a trunk link that is sent without a tag; both ends must agree on it." },
      { term: "Spanning Tree Protocol (STP)", plain: "A safety feature that stops network traffic from looping forever when there are backup cables between switches." },
      { term: "Port security", plain: "A setting that limits which devices are allowed to plug into a given port." },
      { term: "Inter-VLAN routing", plain: "Letting traffic move between two separate VLANs, which only a router can do." },
    ],
  },

  "topic-ip-addressing-and-subnetting": {
    plainIntro:
      "Every device on a network needs an address, the same way every house needs a street number. An IP address paired with a subnet mask tells a device which other addresses are its close neighbours and which ones are far away and need a router to reach. Subnetting is simply carving one big block of addresses into smaller, more manageable blocks, similar to dividing one big office floor into separate rooms. Getting this right matters because two devices that think they are neighbours but are not will never be able to talk directly, and this single mistake causes a huge share of network problems.",
    wordList: [
      { term: "IP address", plain: "A device's numeric address on a network." },
      { term: "Subnet mask", plain: "A setting that shows which part of an address is the network and which part is the individual device." },
      { term: "CIDR notation", plain: "A shorthand way of writing a subnet mask, such as /24, instead of the full number." },
      { term: "Subnetting", plain: "Splitting one large block of addresses into several smaller blocks." },
      { term: "Network address", plain: "The very first address in a subnet, reserved to name the subnet itself, never given to a device." },
      { term: "Broadcast address", plain: "The very last address in a subnet, reserved for sending a message to every device in it at once." },
      { term: "Private IP address", plain: "An address range reserved for internal use that cannot be reached directly from the internet." },
      { term: "NAT", plain: "The process that lets many private addresses share one public address to reach the internet." },
      { term: "VLSM", plain: "Using different-sized subnets within the same network so each one matches how many devices it actually needs." },
    ],
  },

  "topic-routing-fundamentals": {
    plainIntro:
      "A router is the device that decides which direction a message should travel when it needs to leave its home network. It keeps a list, called a routing table, of known destinations and the best path to each one. Some routes are typed in by a person and never change on their own, called static routes, while others are learned automatically by routers talking to each other, called dynamic routing. This matters in real work because a message can leave a network just fine and still never get a reply, if the router on the other end does not know the way back. Good troubleshooting means checking the routing table on both ends, not just assuming a security block.",
    wordList: [
      { term: "Router", plain: "A device that forwards data between different networks." },
      { term: "Routing table", plain: "A router's list of known destination networks and how to reach each one." },
      { term: "Static route", plain: "A route typed in by a person that never changes automatically." },
      { term: "Dynamic routing", plain: "Routes that routers learn and update automatically by talking to each other." },
      { term: "Default route", plain: "The catch-all path used when no more specific route matches where the data is going." },
      { term: "Longest prefix match", plain: "The rule that a router always picks the most specific matching route it has." },
      { term: "Administrative distance", plain: "A trust ranking used to choose between routes that were learned from different sources." },
      { term: "Convergence", plain: "The time it takes all routers to agree on the network's current layout after something changes." },
    ],
  },

  "topic-network-services-and-protocols": {
    plainIntro:
      "Networks run on a handful of background services that most people never think about until they break. DNS turns the website name you type into the number a computer actually uses. DHCP hands out addresses automatically so nobody has to type one in by hand. Every service, like web browsing or email, also has an agreed numbered door it uses, called a port, and most connection troubles come down to checking whether the right door is open. Getting comfortable with these services matters because when one of them fails, everything above it looks broken even though the network itself is fine.",
    wordList: [
      { term: "DNS", plain: "The service that turns a website name into the numeric address a computer can use." },
      { term: "DHCP", plain: "The service that automatically hands a device its address and other network settings." },
      { term: "Port", plain: "A numbered door on a device; different services listen on different doors." },
      { term: "HTTP and HTTPS", plain: "The protocols used to load web pages, with HTTPS being the encrypted version." },
      { term: "FTP and SFTP", plain: "Protocols for transferring files, with SFTP being the encrypted, safer version." },
      { term: "SSH", plain: "A protocol used to securely control another computer remotely." },
      { term: "SMTP, POP3, IMAP", plain: "Protocols used to send and receive email between mail servers and mail apps." },
      { term: "NTP", plain: "The service that keeps a device's clock in sync with an accurate time source." },
      { term: "SNMP", plain: "A protocol used to monitor and manage network equipment from a central place." },
    ],
  },

  "topic-wireless-and-network-troubleshooting": {
    plainIntro:
      "Wireless networks feel simple to use but can be surprisingly fussy behind the scenes, because nearby Wi-Fi networks can interfere with each other the same way two people shouting on the same radio channel drown each other out. Wi-Fi security has also improved a great deal over the years, moving from an old, broken system called WEP up to the current standard, WPA3. On top of wireless-specific issues, general troubleshooting follows a calm, repeatable process rather than guessing: figure out the problem, form a theory, test it, fix it, and write down what happened. This matters because a network showing full signal strength can still perform terribly if too many devices are fighting for the same radio space.",
    wordList: [
      { term: "2.4 GHz band", plain: "An older Wi-Fi radio band with longer range but few channels and more interference." },
      { term: "5 GHz band", plain: "A newer Wi-Fi radio band with shorter range but more channels and faster speeds." },
      { term: "Channel overlap", plain: "When nearby Wi-Fi networks use the same or close radio channels and interfere with each other." },
      { term: "WEP", plain: "An old, broken Wi-Fi security method that should never be used anymore." },
      { term: "WPA2 and WPA3", plain: "Modern Wi-Fi security methods, with WPA3 being the current, stronger standard." },
      { term: "SSID", plain: "The network name a Wi-Fi device chooses when connecting." },
      { term: "Band steering", plain: "A feature that nudges capable devices toward the less crowded 5 GHz band." },
      { term: "Troubleshooting methodology", plain: "A repeatable process: identify the problem, form a theory, test it, fix it, and document what was done." },
    ],
  },

  "topic-security-principles-and-threats": {
    plainIntro:
      "Security work is built around protecting three things: keeping information private, keeping it accurate, and keeping it available when needed, together known as the CIA triad. Attackers range from casual troublemakers using tools they do not fully understand up to well-funded, patient groups working for a government. Many attacks do not rely on breaking technology at all, they rely on tricking a person, which is called social engineering, and it works even on the most carefully patched systems. This matters because most real incidents start with a human being fooled into clicking something, not with a genius bypassing a firewall, so training people is just as important as technical defences.",
    wordList: [
      { term: "CIA triad", plain: "The three goals of security: keeping data private, keeping it accurate, and keeping it available." },
      { term: "Threat actor", plain: "Any person or group trying to attack a system, ranging from amateurs to well-funded professionals." },
      { term: "Social engineering", plain: "Tricking a person into giving up access or information, rather than breaking technology directly." },
      { term: "Phishing", plain: "A fake message designed to trick someone into clicking a link or giving up information." },
      { term: "Ransomware", plain: "Malicious software that locks up a victim's files and demands payment to unlock them." },
      { term: "Worm", plain: "Malicious software that spreads itself across a network without needing a person to do anything." },
      { term: "Trojan", plain: "Malicious software disguised as something legitimate or harmless." },
      { term: "Authentication, authorization, accounting (AAA)", plain: "Proving who you are, deciding what you are allowed to do, and keeping a record of what you did." },
      { term: "Defence in depth", plain: "Using several layers of protection so that one failed defence does not lead straight to a breach." },
    ],
  },

  "topic-cryptography-fundamentals": {
    plainIntro:
      "Cryptography is the set of tools that keeps information private and proves it has not been tampered with. Symmetric encryption uses one shared secret key that both sides already have, which is fast but requires a safe way to hand out that key first. Asymmetric encryption uses a matched pair of keys, one public and one private, which solves that key-sharing problem but is much slower. Hashing takes any piece of data and produces a short fingerprint that changes completely if even one letter changes, which is how you check that a file has not been altered. Real secure connections, like a padlocked website, actually use both approaches together: the slower method briefly agrees on a shared secret, then the fast method protects the rest of the conversation.",
    wordList: [
      { term: "Symmetric encryption", plain: "Scrambling and unscrambling data using the exact same shared secret key." },
      { term: "Asymmetric encryption", plain: "Scrambling and unscrambling data using a matched pair of keys, one public and one kept private." },
      { term: "Hashing", plain: "Turning any piece of data into a short fingerprint that changes if the data changes at all." },
      { term: "TLS", plain: "The protocol that secures web traffic, combining both types of encryption for speed and safety." },
      { term: "Digital certificate", plain: "A file that ties a public key to a verified identity, like a website's name." },
      { term: "Certificate authority", plain: "A trusted organisation that checks identities and issues digital certificates." },
      { term: "Chain of trust", plain: "The line of signatures connecting a certificate back to an authority your device already trusts." },
      { term: "Digital signature", plain: "A way of using a private key to prove a message really came from you and was not changed." },
      { term: "Perfect Forward Secrecy", plain: "A safeguard ensuring that even if a key is stolen later, past conversations still cannot be read." },
    ],
  },

  "topic-identity-and-access-management": {
    plainIntro:
      "Identity and access management is about making sure the right people have exactly the access they need, no more and no less, and that access is removed the moment they no longer need it. Multifactor authentication asks for more than one kind of proof, such as a password plus a code from your phone, so a stolen password alone is not enough to break in. The rule of least privilege says to give someone only what their job requires, which limits the damage if their account is ever compromised. This matters enormously in real work because a forgotten, leftover account from an employee who left months ago is one of the most common ways attackers quietly gain a foothold.",
    wordList: [
      { term: "Authentication", plain: "Proving who you are, usually with a password or similar." },
      { term: "Multifactor authentication (MFA)", plain: "Requiring two different kinds of proof of identity, such as a password and a phone code." },
      { term: "Least privilege", plain: "Giving someone only the access they actually need for their job, nothing extra." },
      { term: "Role-based access control (RBAC)", plain: "Giving access based on a person's job role instead of granting it to each person individually." },
      { term: "Single sign-on (SSO)", plain: "Logging in once and being able to use several different systems without logging in again." },
      { term: "Deprovisioning", plain: "Removing someone's access completely and promptly once they leave or change roles." },
      { term: "Access review", plain: "Regularly checking that people's existing access still makes sense for their current job." },
      { term: "Something you know, have, are", plain: "The three categories of proof used for authentication: a password, a physical device, or a body trait like a fingerprint." },
    ],
  },

  "topic-network-security-controls": {
    plainIntro:
      "Once you know what a network is and what threats look like, the next step is the actual tools used to defend it. A firewall is a gatekeeper that decides which traffic is allowed in or out, ranging from simple rules about ports up to smart systems that inspect the actual content passing through. A DMZ is a separate, isolated area for anything the public needs to reach, like a website, so that if it is broken into, the attacker still cannot walk straight into the rest of the company's network. A VPN builds an encrypted tunnel across a public network so remote staff can work as if they were plugged in at the office. Together these controls are stacked in layers, so that one broken defence does not immediately expose everything behind it.",
    wordList: [
      { term: "Firewall", plain: "A gatekeeper device or program that decides which network traffic is allowed through." },
      { term: "Stateful firewall", plain: "A firewall that remembers ongoing conversations so it can allow their replies back through automatically." },
      { term: "Next-generation firewall", plain: "A firewall smart enough to look at the actual content and app behind the traffic, not just the port." },
      { term: "IDS", plain: "A system that watches network traffic and raises an alert when something looks suspicious." },
      { term: "IPS", plain: "A system that sits directly in the traffic path and actively blocks suspicious traffic in real time." },
      { term: "DMZ", plain: "A separated network area for anything the public needs to reach, kept apart from the internal network." },
      { term: "VLAN segmentation", plain: "Splitting a network into isolated sections so a break-in in one area cannot easily spread to another." },
      { term: "VPN", plain: "An encrypted tunnel across a public network that lets remote users connect as if they were on the local network." },
      { term: "Zero trust", plain: "An approach that never automatically trusts a device or user just because of where they are connecting from." },
    ],
  },

  "topic-risk-governance-and-compliance": {
    plainIntro:
      "Not every security decision is technical; a lot of it is about deciding how much risk a business is willing to accept and proving to outsiders that promises are being kept. Risk management means identifying what could go wrong, judging how likely and how damaging it would be, and then choosing to fix it, accept it, transfer it, or avoid it altogether. Policies and standards, like keeping customer card data safe under PCI DSS or health records safe under HIPAA, exist because certain industries face legal or contractual requirements around security. This matters in real work because a technically perfect security setup can still fail an audit, cost the company a contract, or break the law if the paperwork and processes behind it are not in order.",
    wordList: [
      { term: "Risk", plain: "The chance that something bad happens combined with how much damage it would cause." },
      { term: "Risk assessment", plain: "The process of finding and ranking risks so the most important ones get attention first." },
      { term: "Risk acceptance, mitigation, transfer, avoidance", plain: "The four choices for handling a risk: live with it, reduce it, pass it to someone else like insurance, or stop doing the risky activity." },
      { term: "Policy", plain: "A written rule set by an organisation about how something must be done." },
      { term: "Compliance", plain: "Meeting the legal, contractual, or industry rules that apply to an organisation." },
      { term: "PCI DSS", plain: "A set of security rules that any business handling credit card payments must follow." },
      { term: "HIPAA", plain: "A U.S. law setting security and privacy rules for health information." },
      { term: "Audit", plain: "A formal check to confirm that an organisation is actually following its stated rules and policies." },
    ],
  },

  "topic-incident-response-fundamentals": {
    plainIntro:
      "When something does go wrong, the difference between a small problem and a disaster often comes down to how calmly and quickly the response is handled. Incident response is a planned set of steps: get ready in advance, notice something is wrong, stop it from spreading, remove the cause, bring systems back safely, and then write down what happened and what to change. Skipping straight to fixing the problem without first containing it can let an attacker keep working while the fix is being applied. This matters because organisations that have practiced this process ahead of time recover far faster and with far less damage than ones improvising for the first time during a real crisis.",
    wordList: [
      { term: "Incident response plan", plain: "A written, practiced plan for what to do when a security incident happens." },
      { term: "Preparation", plain: "Getting tools, contacts, and procedures ready before an incident ever happens." },
      { term: "Detection", plain: "Noticing that something suspicious or harmful is happening." },
      { term: "Containment", plain: "Stopping an incident from spreading further while it is still being investigated." },
      { term: "Eradication", plain: "Removing the actual cause of the incident, such as malware or a compromised account." },
      { term: "Recovery", plain: "Safely bringing affected systems back to normal operation." },
      { term: "Lessons learned", plain: "Reviewing after the fact what happened and what should change to prevent it happening again." },
      { term: "Chain of custody", plain: "Careful record-keeping of evidence so it stays trustworthy if it is ever needed for legal action." },
    ],
  },
};
