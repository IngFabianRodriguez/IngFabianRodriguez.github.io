import { RideImportError } from "@/domain/import/errors";

/** Parses XML and checks the root element; any failure is a "malformed" import error. */
export function parseXml(text: string, rootName: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const root = doc.documentElement;
  if (doc.getElementsByTagNameNS("*", "parsererror").length > 0 || !root) {
    throw new RideImportError("malformed");
  }
  if (root.localName !== rootName) throw new RideImportError("malformed");
  return doc;
}

/** Text of the first descendant with this local name, whatever its namespace prefix. */
export function textOf(parent: Element, localName: string): string | undefined {
  const value = parent.getElementsByTagNameNS("*", localName)[0]?.textContent?.trim();
  return value ? value : undefined;
}

export function numberOf(parent: Element, localName: string): number | undefined {
  const text = textOf(parent, localName);
  if (text === undefined) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** A time as a Date truncated to whole seconds, the resolution FIT stores. */
export function dateOf(parent: Element, localName: string): Date | undefined {
  const text = textOf(parent, localName);
  if (text === undefined) return undefined;
  const ms = new Date(text).getTime();
  return Number.isFinite(ms) ? new Date(Math.floor(ms / 1000) * 1000) : undefined;
}
