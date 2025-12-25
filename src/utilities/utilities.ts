import { isDraft, original, type WritableDraft } from "immer";

export function toNumber(value: string) {
  const number = parseFloat(value.trim());
  return Number.isNaN(number) ? 0 : number;
}

export function toString(value: number) {
  return parseFloat(value.toFixed(7)).toString();
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

export function partition<Type, Condition>(
  array: Type[],
  predicate: (item: Type) => Condition,
): Map<Condition, Type[]> {
  const map = new Map<Condition, Type[]>();
  for (const item of array) {
    const condition = predicate(item);
    const list = map.get(condition) ?? [];
    map.set(condition, [...list, item]);
  }
  return map;
}
