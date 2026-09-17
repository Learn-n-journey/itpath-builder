/** Obvious abusive language that the community chat blocks before a message is sent. */
const BLOCKED = /(fuck|shit|cunt|bitch|bastard|wanker|nigg|faggot|retard|whore|slut|rape|kill yourself|kys)/i;

/** Returns a plain message when the text breaks the rule, or null when it is fine. */
export function checkMessage(body: string): string | null {
  const text = body.trim();
  if (!text) return "Write something first.";
  if (text.length > 1000) return "That is a bit long. Keep it under 1000 characters.";
  if (BLOCKED.test(text)) return "That message has language the chat does not allow. Try rewording it.";
  return null;
}

/** Display names follow the same rule, plus a length and character check. */
export function checkDisplayName(name: string): string | null {
  const text = name.trim();
  if (text.length < 3) return "Pick a name with at least 3 characters.";
  if (text.length > 24) return "Keep the name under 24 characters.";
  if (!/^[A-Za-z0-9 _.-]+$/.test(text)) return "Use letters, numbers, spaces, dots, dashes or underscores.";
  if (BLOCKED.test(text)) return "Please pick a different name.";
  return null;
}
