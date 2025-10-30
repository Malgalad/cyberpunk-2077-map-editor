import { isDraft, original, type WritableDraft } from "immer";

export function toNumber(value: string) {
  const number = parseFloat(value.trim());
  return Number.isNaN(number) ? 0 : number;
}

export function toString(value: number) {
  return value.toString();
}

export function unwrapDraft<T>(value: T | WritableDraft<T>): T {
  return isDraft(value) ? (original(value) as T) : (value as T);
}

export function clsx(...args: unknown[]) {
  return args.flat().filter(Boolean).join(" ");
}

export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function partition<T>(array: T[], predicate: (item: T) => boolean) {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of array) {
    (predicate(item) ? pass : fail).push(item);
  }
  return [pass, fail];
}
