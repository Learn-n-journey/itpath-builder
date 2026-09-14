import { useEffect } from "react";
import { toast } from "sonner";

import { streakSummary } from "@/lib/streak-engine";
import { useAppStateOptional } from "@/state/app-state";

const STORAGE_KEY = "it-path.reminder.lastShown";

function todayKey(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function alreadyShown(key: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === key;
  } catch {
    return true;
  }
}

function markShown(key: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* storage unavailable — the reminder simply repeats next session */
  }
}

/**
 * Shows one reminder a day, after the chosen time, when the daily goal is not
 * yet met. Silent unless the user turned reminders on in Settings.
 */
export function StudyReminder() {
  const state = useAppStateOptional();
  const user = state?.user ?? null;
  const hydrated = state?.hydrated ?? false;
  const enabled = user?.settings.reminderEnabled === true;
  const time = user?.settings.reminderTime ?? "18:00";

  useEffect(() => {
    if (!hydrated || !enabled) return;
    const [hourPart, minutePart] = time.split(":");
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;

    function check() {
      const now = new Date();
      const key = todayKey(now);
      if (alreadyShown(key)) return;
      const dueMinutes = hour * 60 + minute;
      if (now.getHours() * 60 + now.getMinutes() < dueMinutes) return;
      const summary = streakSummary(user, now);
      if (summary.goalMet) return;
      markShown(key);
      const remaining = Math.max(0, summary.goalMinutes - summary.todayMinutes);
      const message = `Still ${remaining} minutes to reach today's study goal.`;
      toast("Study reminder", { description: message });
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("IT PATH study reminder", { body: message });
        }
      } catch {
        /* notifications unavailable */
      }
    }

    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [enabled, hydrated, time, user]);

  return null;
}
