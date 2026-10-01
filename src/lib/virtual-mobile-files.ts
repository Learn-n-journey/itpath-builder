export type MobileFile = {
  path: string;
  bytes: number;
  kind: "document" | "photo" | "cache" | "system";
  owner: "user" | "app" | "system";
  appId?: string;
};

export function createMobileFiles(os: "android" | "phone"): MobileFile[] {
  const root = os === "android" ? "/Internal storage" : "/On My Device";
  return [
    { path: `${root}/Documents/Welcome.txt`, bytes: 2048, kind: "document", owner: "user" },
    { path: `${root}/Downloads/Support-log.txt`, bytes: 8192, kind: "document", owner: "user" },
    { path: `${root}/Pictures/Training-photo.jpg`, bytes: 2_400_000, kind: "photo", owner: "user" },
    { path: `${root}/Android/data/mail/cache/index.db`, bytes: 186_000_000, kind: "cache", owner: "app", appId: "mail" },
    { path: `${root}/Android/data/browser/cache/index.db`, bytes: 94_000_000, kind: "cache", owner: "app", appId: "browser" },
    { path: `${root}/Android/data/photos/cache/thumbnails.db`, bytes: 248_000_000, kind: "cache", owner: "app", appId: "photos" },
  ];
}

export function listMobileFiles(files: readonly MobileFile[], directory: string): MobileFile[] {
  const prefix = directory.endsWith("/") ? directory : `${directory}/`;
  return files.filter((file) => file.path.startsWith(prefix) && !file.path.slice(prefix.length).includes("/"));
}

export function storageBytes(files: readonly MobileFile[]): number {
  return files.reduce((total, file) => total + file.bytes, 0);
}

export function clearTemporaryFiles(files: readonly MobileFile[], appId?: string): MobileFile[] {
  return files.filter((file) => file.kind !== "cache" || (appId !== undefined && file.appId !== appId));
}

export function removeMobileFile(files: readonly MobileFile[], path: string): MobileFile[] {
  return files.filter((file) => file.path !== path);
}
