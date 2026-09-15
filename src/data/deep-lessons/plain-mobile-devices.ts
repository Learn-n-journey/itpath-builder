/** Beginner layer for the mobile-devices topics. Filled in per topic. */
import type { LessonPlainLanguage } from "./types";

export const mobileDevicesPlainLanguage: Record<string, LessonPlainLanguage> = {
  "topic-mobile-hardware-and-components": {
    plainIntro:
      "A phone squeezes a whole computer into a thin case, and most of its parts are glued or bonded together so tightly that people assume they are all one thing. They are not. The glass you look at and the layer that feels your finger are two separate sheets stacked on top of each other, and either one can fail while the other keeps working perfectly. The battery is a sealed chemical pouch that slowly wears out and can swell if it fails inside, which is a safety problem, not just a performance one. Knowing which part does which job turns a vague complaint like \"the screen is acting weird\" into something you can actually test and fix.",
    wordList: [
      { term: "Display panel", plain: "The layer that shows the picture. If it fails you see lines, dead spots, or a dark screen." },
      { term: "Digitizer", plain: "The layer bonded on top of the screen that senses your finger. If it fails, touch stops working correctly even though the picture looks fine." },
      { term: "Lithium-ion battery", plain: "The rechargeable cell inside the phone. It wears out a little with every charge and can swell up if it fails, which is dangerous." },
      { term: "USB-C port", plain: "The charging and data socket. The shape alone does not tell you how fast it charges, that depends on the cable and charger too." },
      { term: "Accelerometer", plain: "A sensor that feels movement, used for things like counting your steps." },
      { term: "Gyroscope", plain: "A sensor that feels rotation, used for turning the screen sideways when you tilt the phone." },
      { term: "Proximity sensor", plain: "A sensor near the earpiece that turns the screen off when you hold the phone to your ear during a call." },
      { term: "Ambient light sensor", plain: "A sensor that measures how bright the room is so the screen can dim or brighten itself automatically." },
      { term: "Biometric reader", plain: "The fingerprint or face scanner used to unlock the phone, always backed up by a PIN in case it fails." },
      { term: "Camera module", plain: "The sealed unit holding the lens and sensor for the camera. Dust trapped inside it can look like a blurry photo problem." },
    ],
  },

  "topic-mobile-connectivity": {
    plainIntro:
      "A phone talks to the outside world in several completely different ways, and most connection complaints are really about one of them being blamed for another's job. Wi-Fi is like shouting across a room, cellular data is like the postal service covering the whole country, Bluetooth is like talking to someone sitting right next to you, and NFC is like whispering to someone whose ear is touching yours. GPS is different again, it only listens to satellites to figure out where you are, it never sends your location to anyone by itself. Once you know which of these a problem actually involves, fixing it becomes much simpler.",
    wordList: [
      { term: "Wi-Fi", plain: "A short-range wireless connection, usually to a router at home or work, that gives fast internet without using mobile data." },
      { term: "Cellular data (4G/5G)", plain: "The wide-area connection to a phone carrier's towers, used for calls and internet away from Wi-Fi." },
      { term: "Bluetooth", plain: "A short-range wireless link used to connect nearby accessories like headphones or a smartwatch." },
      { term: "NFC", plain: "A very short-range wireless link, only a few centimetres, used for things like tap-to-pay." },
      { term: "GPS", plain: "A system that listens to satellites to work out the phone's location. It does not send your location out by itself." },
      { term: "Hotspot / tethering", plain: "Sharing the phone's own mobile data connection with another device, such as a laptop." },
      { term: "Pairing", plain: "The one-time process of introducing a Bluetooth accessory to your phone so they remember each other." },
      { term: "Airplane mode", plain: "A single switch that turns off every wireless radio at once, often used to reset a stuck connection." },
    ],
  },

  "topic-mobile-configuration-and-apps": {
    plainIntro:
      "Almost everything you care about on a phone, your contacts, photos, and apps, actually lives behind an account rather than on the device itself. Sign in with the same account on a new phone and everything reappears, sign in with a different one and the phone looks empty even though nothing was ever lost. Email works the same way: modern setups keep your messages stored on a server so every device shows the same inbox, while an older style downloads mail onto just one device and removes it elsewhere. Getting the account and the mail setup right is most of what it takes to set up a phone properly, whether it is brand new or a replacement.",
    wordList: [
      { term: "Platform account", plain: "The Google account or Apple ID that owns your purchased apps, backups, and the ability to find your phone if it is lost." },
      { term: "Synchronisation (sync)", plain: "The ongoing copying of your contacts, photos, and calendar between your phone and the cloud, so they match everywhere." },
      { term: "IMAP", plain: "A mail setup where the server keeps the real copy of your mail, so every device shows the same inbox." },
      { term: "POP3", plain: "An older mail setup that downloads mail to one device and usually removes it from the server, so other devices miss it." },
      { term: "Sideloading", plain: "Installing an app from somewhere other than the official app store, which skips the store's safety checks." },
      { term: "SIM card", plain: "A small removable card that proves who you are to your phone carrier." },
      { term: "eSIM", plain: "A carrier identity that is downloaded into the phone instead of being a physical card you insert." },
      { term: "Cloud backup", plain: "An automatic saved copy of your phone's settings and data, used to restore or move to a new device." },
    ],
  },

  "topic-mobile-security-and-mdm": {
    plainIntro:
      "Locking a phone is not just one switch, it is a chain of protections that build on each other. The PIN or password is the base of the chain, and the storage on the phone is scrambled in a way that depends on that PIN, so a fingerprint or face scan is only a shortcut placed in front of it, not a replacement. That is why a restarted phone always asks for the PIN again before it will accept a fingerprint. Companies use a management tool to make sure phones follow these rules, and if a phone is lost, they can lock it, find it, or erase it remotely, though erasing only happens once the phone reconnects to the internet, so locking it first is usually the safer first move.",
    wordList: [
      { term: "Screen lock", plain: "The PIN, password, pattern, or fingerprint needed to open the phone." },
      { term: "Biometrics", plain: "Unlocking with your fingerprint or face, always backed by a PIN in case it does not work." },
      { term: "Full-device encryption", plain: "Scrambling everything stored on the phone so it is unreadable without the correct unlock code." },
      { term: "Remote lock", plain: "A command sent from a distance that locks a lost phone and can show a message on its screen." },
      { term: "Remote wipe", plain: "A command sent from a distance that erases a lost phone, but only once it connects to the internet again." },
      { term: "MDM (mobile device management)", plain: "Software a company uses to set rules on phones, such as requiring a PIN, and to lock or erase them if needed." },
      { term: "BYOD (bring your own device)", plain: "Using your own personal phone for work, kept safe by separating work data from personal data." },
      { term: "Work profile / container", plain: "A separate, walled-off area on a personal phone that holds only work apps and data, which the company can erase without touching your own photos and messages." },
    ],
  },

  "topic-mobile-troubleshooting": {
    plainIntro:
      "Fixing a phone problem always starts with the same question: is this affecting one app, one account, one network, or the entire device? That single answer decides where you look next. Battery drain, slow charging, and connection issues each have a handful of common, ordinary causes, like a worn charging cable or an app running wild in the background, and those should always be checked before anything drastic. A full factory reset is treated as a last resort, since it erases the evidence of what went wrong along with all the user's data, so it only happens after simpler checks have failed and a backup is confirmed safe.",
    wordList: [
      { term: "Battery usage statistics", plain: "A built-in screen showing which apps are using the most battery, the fastest way to find what is causing drain." },
      { term: "Battery health / cycle count", plain: "A measure of how worn out the battery is, which tells you if the battery itself is the problem rather than an app." },
      { term: "Airplane mode reset", plain: "Turning airplane mode on and off to restart every wireless connection at once without losing any saved settings." },
      { term: "Safe mode", plain: "Starting the phone with all extra apps turned off, used to check whether one of them is causing a problem." },
      { term: "Cache", plain: "Temporary files an app stores to work faster. Clearing it can fix glitches without deleting your account or data." },
      { term: "Known-good swap", plain: "Testing with a cable, charger, or accessory you already know works, to rule it out as the cause." },
      { term: "Sync status", plain: "The record of when each account last updated, useful for spotting a silent syncing failure." },
      { term: "Factory reset", plain: "Erasing the entire phone back to its original state. A last resort, only done after a backup is confirmed." },
    ],
  },
};
