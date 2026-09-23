/**
 * Deterministic number checks for IT teaching text.
 *
 * No AI involved: these are arithmetic and reference-table checks that either
 * pass or fail. They run over AI answers before a learner sees them, and as a
 * sweep over every lesson and quiz question in the curriculum.
 *
 * Every check is deliberately conservative. A claim only fails when the
 * sentence states both sides of the relationship, so ordinary prose never
 * trips it.
 */

export interface TechnicalIssue {
  /** The exact wording that failed. */
  claim: string;
  /** What is wrong with it, in plain words. */
  problem: string;
}

const DECIMAL_UNITS: Record<string, number> = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, pb: 1e15 };
const BINARY_UNITS: Record<string, number> = {
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4,
  pib: 1024 ** 5,
};

function unitBytes(unit: string): number | null {
  const key = unit.toLowerCase().replace(/ytes?$/, "b").replace(/\s+/g, "");
  return BINARY_UNITS[key] ?? DECIMAL_UNITS[key] ?? null;
}

function num(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function close(a: number, b: number, tolerance = 0.005): boolean {
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return scale > 0 && Math.abs(a - b) / scale <= tolerance;
}

const UNIT_WORDS = "bytes?|[KMGTP]B|[KMGTP]iB";
const STORAGE_EQUALS = new RegExp(
  String.raw`([\d,.]+)\s*(${UNIT_WORDS})\s*(?:=|equals?|is|are|holds)\s*(?:about\s*|roughly\s*|exactly\s*)?([\d,.]+)\s*(${UNIT_WORDS})`,
  "gi",
);

/** 1 GB = 1000 MB, 1 GiB = 1024 MiB. Mixing the two families is the classic error. */
function checkStorage(text: string): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  for (const match of text.matchAll(STORAGE_EQUALS)) {
    const left = unitBytes(match[2] ?? "");
    const right = unitBytes(match[4] ?? "");
    if (left === null || right === null) continue;
    const leftValue = num(match[1] ?? "") * left;
    const rightValue = num(match[3] ?? "") * right;
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) continue;
    if (close(leftValue, rightValue)) continue;
    issues.push({
      claim: match[0],
      problem: `The two sides do not match. ${match[1]} ${match[2]} is ${leftValue.toLocaleString()} bytes and ${match[3]} ${match[4]} is ${rightValue.toLocaleString()} bytes. Decimal units step by 1000 and binary units (KiB, MiB, GiB) step by 1024.`,
    });
  }
  return issues;
}

const BYTE_BIT = /([\d,.]+)\s*bytes?\s*(?:=|equals?|is|are|contains?)\s*([\d,.]+)\s*bits?/gi;
const BIT_BYTE = /([\d,.]+)\s*bits?\s*(?:=|equals?|is|are|makes?)\s*([\d,.]+)\s*bytes?/gi;
const MBPS = /([\d,.]+)\s*(?:Mbps|megabits? per second)\s*(?:=|equals?|is|gives?)\s*(?:about\s*|roughly\s*)?([\d,.]+)\s*(?:MB\/s|megabytes? per second)/gi;

function checkBitsAndBytes(text: string): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  for (const match of text.matchAll(BYTE_BIT)) {
    const bytes = num(match[1] ?? "");
    const bits = num(match[2] ?? "");
    if (!Number.isFinite(bytes) || !Number.isFinite(bits) || close(bytes * 8, bits)) continue;
    issues.push({ claim: match[0], problem: `${match[1]} bytes is ${(bytes * 8).toLocaleString()} bits, not ${match[2]}.` });
  }
  for (const match of text.matchAll(BIT_BYTE)) {
    const bits = num(match[1] ?? "");
    const bytes = num(match[2] ?? "");
    if (!Number.isFinite(bits) || !Number.isFinite(bytes) || close(bits / 8, bytes)) continue;
    issues.push({ claim: match[0], problem: `${match[1]} bits is ${(bits / 8).toLocaleString()} bytes, not ${match[2]}.` });
  }
  for (const match of text.matchAll(MBPS)) {
    const mbps = num(match[1] ?? "");
    const mbs = num(match[2] ?? "");
    if (!Number.isFinite(mbps) || !Number.isFinite(mbs) || close(mbps / 8, mbs, 0.05)) continue;
    issues.push({
      claim: match[0],
      problem: `${match[1]} Mbps is about ${(mbps / 8).toFixed(2)} MB/s, not ${match[2]}. Eight bits make a byte.`,
    });
  }
  return issues;
}

const POWER_OF_TWO = /2\s*(?:\^|\*\*|to the power of\s*)\s*(\d{1,2})\s*(?:=|equals?|is)\s*([\d,]+)/gi;

function checkPowers(text: string): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  for (const match of text.matchAll(POWER_OF_TWO)) {
    const exponent = Number(match[1]);
    const stated = num(match[2] ?? "");
    if (!Number.isFinite(exponent) || exponent > 40) continue;
    const real = 2 ** exponent;
    if (close(real, stated, 0)) continue;
    issues.push({ claim: match[0], problem: `2 to the power of ${exponent} is ${real.toLocaleString()}, not ${match[2]}.` });
  }
  return issues;
}

function maskFor(prefix: number): string {
  const octets: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const bits = Math.min(8, Math.max(0, prefix - i * 8));
    octets.push(256 - 2 ** (8 - bits) === 256 ? 0 : 256 - 2 ** (8 - bits));
  }
  return octets.join(".");
}

const CIDR_MASK = /\/(\d{1,2})\b[^.\n]{0,60}?(?:subnet\s*)?mask\s*(?:is|of|=)?\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/gi;
const MASK_CIDR = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*(?:is|=|means|equals?)\s*(?:the same as\s*)?\/(\d{1,2})\b/gi;
// Keep a CIDR host-count claim inside one clause. The previous wildcard could\n// run across commas/semicolons and pair a /27 mentioned in one clause with a\n// different number later in the sentence, creating a false factual finding.\nconst CIDR_HOSTS = /\\/(\\d{1,2})\\b[^.,;:\\n]{0,70}?([\\d,]+)\\s*(usable\\s*)?(?:hosts|host addresses|usable addresses)/gi;

function checkSubnets(text: string): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  for (const match of text.matchAll(CIDR_MASK)) {
    const prefix = Number(match[1]);
    if (prefix > 32) continue;
    const expected = maskFor(prefix);
    if (expected === match[2]) continue;
    issues.push({ claim: match[0], problem: `A /${prefix} network has the mask ${expected}, not ${match[2]}.` });
  }
  for (const match of text.matchAll(MASK_CIDR)) {
    const prefix = Number(match[2]);
    if (prefix > 32) continue;
    const expected = maskFor(prefix);
    if (expected === match[1]) continue;
    issues.push({ claim: match[0], problem: `${match[1]} is not /${prefix}. A /${prefix} mask is ${expected}.` });
  }
  for (const match of text.matchAll(CIDR_HOSTS)) {
    const prefix = Number(match[1]);
    const stated = num(match[2] ?? "");
    if (prefix > 32 || prefix < 1 || !Number.isFinite(stated)) continue;
    // "Split a /24 into subnets that each support 30 hosts" is about the pieces,
    // not the block, so the block's own host count is not what is being stated.
    if (/\b(into|split|divid|borrow|each|smaller|per subnet)\b/i.test(match[0])) continue;
    const total = 2 ** (32 - prefix);
    const usable = Math.max(0, total - 2);
    if (stated === total || stated === usable) continue;
    issues.push({
      claim: match[0],
      problem: `A /${prefix} holds ${total.toLocaleString()} addresses, ${usable.toLocaleString()} of them usable, not ${match[2]}.`,
    });
  }
  return issues;
}

/** Well known ports. Only protocols with a single settled port are listed. */
const PORTS: Record<string, number[]> = {
  ftp: [20, 21],
  ssh: [22],
  sftp: [22],
  telnet: [23],
  smtp: [25, 587],
  dns: [53],
  dhcp: [67, 68],
  tftp: [69],
  http: [80],
  kerberos: [88],
  pop3: [110],
  ntp: [123],
  netbios: [137, 138, 139],
  imap: [143],
  snmp: [161, 162],
  ldap: [389],
  https: [443],
  smb: [445],
  syslog: [514],
  smtps: [465, 587],
  ldaps: [636],
  imaps: [993],
  pop3s: [995],
  mysql: [3306],
  rdp: [3389],
  vnc: [5900],
};

// The gap may not cross a clause boundary. A sentence such as "port 443 is
// HTTPS, while TCP port 22 is SSH" pairs each protocol with its own port, and
// listing sentences ("port 21 is FTP control, port 25 SMTP") do the same, so
// commas, semicolons, colons and joining words end the pairing.
const PROTO_PORT = new RegExp(
  String.raw`\b(${Object.keys(PORTS).join("|")})\b(?:(?!\b(?:while|whereas|but|and|or|not|instead)\b)[^.,;:\n])
{0,40}?\bports?\s*(\d{1,5})`.replace(/\n/g, ""),
  "gi",
);

function checkPorts(text: string): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  for (const match of text.matchAll(PROTO_PORT)) {
    const proto = (match[1] ?? "").toLowerCase();
    const port = Number(match[2]);
    const allowed = PORTS[proto];
    if (!allowed || allowed.includes(port)) continue;
    issues.push({
      claim: match[0],
      problem: `${proto.toUpperCase()} uses port ${allowed.join(" or ")}, not ${port}.`,
    });
  }
  return issues;
}

const PERCENT_OF = /([\d.]+)\s*%\s*of\s*([\d,.]+)\s*(?:=|is|equals?)\s*([\d,.]+)/gi;

function checkPercentages(text: string): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  for (const match of text.matchAll(PERCENT_OF)) {
    const pct = Number(match[1]);
    const whole = num(match[2] ?? "");
    const stated = num(match[3] ?? "");
    if (![pct, whole, stated].every(Number.isFinite)) continue;
    const real = (pct / 100) * whole;
    if (close(real, stated, 0.01)) continue;
    issues.push({ claim: match[0], problem: `${pct}% of ${match[2]} is ${real.toLocaleString()}, not ${match[3]}.` });
  }
  return issues;
}

/** Runs every check and returns whatever failed, in the order it appears. */
export function checkTechnicalClaims(text: string): TechnicalIssue[] {
  if (!text || text.length < 8) return [];
  const issues = [
    ...checkStorage(text),
    ...checkBitsAndBytes(text),
    ...checkPowers(text),
    ...checkSubnets(text),
    ...checkPorts(text),
    ...checkPercentages(text),
  ];
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.claim}|${issue.problem}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A short block a reviewing model can act on, or an empty string when clean. */
export function technicalIssueBrief(issues: TechnicalIssue[]): string {
  if (issues.length === 0) return "";
  return [
    "A numeric check found these problems in the text. Correct each one:",
    ...issues.map((issue) => `- "${issue.claim.trim()}": ${issue.problem}`),
  ].join("\n");
}
