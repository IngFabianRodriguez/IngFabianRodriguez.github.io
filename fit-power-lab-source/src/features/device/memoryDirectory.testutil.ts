import type { DirectoryHandleLike, FileHandleLike } from "@/features/device/deviceFolder";

export interface MemoryDirectory extends DirectoryHandleLike {
  /** What the folder holds, by file name. */
  files: Map<string, Uint8Array>;
  /** Names that were opened for writing, in order. */
  writes: string[];
}

/** A folder kept in memory with the handle shape the browser gives, for tests. */
export function memoryDirectory(
  name: string,
  init: Record<string, Uint8Array> = {},
  options: { failWritingOf?: string; subdirectories?: DirectoryHandleLike[] } = {},
): MemoryDirectory {
  const files = new Map(Object.entries(init));
  const writes: string[] = [];
  const subdirectories = options.subdirectories ?? [];

  const fileHandle = (fileName: string): FileHandleLike => ({
    kind: "file",
    name: fileName,
    async getFile() {
      const content = files.get(fileName) ?? new Uint8Array();
      return new File([content.slice().buffer], fileName);
    },
    async createWritable() {
      writes.push(fileName);
      if (fileName === options.failWritingOf) throw new Error("disk full");
      return {
        async write(data: Uint8Array) {
          files.set(fileName, data.slice());
        },
        async close() {},
      };
    },
  });

  const directory: MemoryDirectory = {
    kind: "directory",
    name,
    files,
    writes,
    async *values() {
      for (const fileName of files.keys()) yield fileHandle(fileName);
      for (const sub of subdirectories) yield sub;
    },
    async getFileHandle(fileName, opts) {
      if (!files.has(fileName)) {
        if (!opts?.create) throw new DOMException("not found", "NotFoundError");
        files.set(fileName, new Uint8Array());
      }
      return fileHandle(fileName);
    },
    async getDirectoryHandle(dirName) {
      const found = subdirectories.find((d) => d.name === dirName);
      if (!found) throw new DOMException("not found", "NotFoundError");
      return found;
    },
    async removeEntry(fileName) {
      files.delete(fileName);
    },
    async isSameEntry(other) {
      return other === directory;
    },
    async resolve(descendant) {
      return subdirectories.includes(descendant as DirectoryHandleLike) ? [descendant.name] : null;
    },
  };
  return directory;
}
