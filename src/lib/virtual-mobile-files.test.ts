import { describe, expect, it } from "vitest";
import { clearTemporaryFiles, createMobileFiles, listMobileFiles, removeMobileFile, storageBytes } from "./virtual-mobile-files";

describe("virtual mobile filesystem", () => {
  it("creates platform-specific user storage", () => {
    expect(createMobileFiles("android")[0]?.path).toContain("/Internal storage/");
    expect(createMobileFiles("phone")[0]?.path).toContain("/On My Device/");
  });

  it("lists direct children without leaking nested files", () => {
    const files = createMobileFiles("android");
    expect(listMobileFiles(files, "/Internal storage/Documents")).toHaveLength(1);
    expect(listMobileFiles(files, "/Internal storage")).toHaveLength(3);
  });

  it("clears temporary files without deleting user data", () => {
    const files = createMobileFiles("android");
    const cleared = clearTemporaryFiles(files);
    expect(cleared.every((file) => file.kind !== "cache")).toBe(true);
    expect(cleared.some((file) => file.kind === "document")).toBe(true);
    expect(storageBytes(cleared)).toBeLessThan(storageBytes(files));
    expect(removeMobileFile(files, "/Internal storage/Documents/Welcome.txt")).toHaveLength(files.length - 1);
  });
});
