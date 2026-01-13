import { isDraft, original, type WritableDraft } from "immer";

import type { Tuple3 } from "../types/types.ts";

export function toNumber(value: string) {
  const number = parseFloat(value.trim());
  return Number.isNaN(number) ? 0 : number;
}

export function toString(value: number) {
  return parseFloat(value.toFixed(7)).toString();
}

export function toTuple3<T>(value: T[]) {
  return [value[0], value[1], value[2]] as Tuple3<T>;
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

export function partition<Type, Condition extends string>(
  array: Type[],
  predicate: (item: Type) => Condition,
): Record<Condition, Type[]> {
  const map: Record<Condition, Type[]> = Object.create(null);
  for (const item of array) {
    const condition = predicate(item);
    const list = (map[condition] = map[condition] ?? []);
    list.push(item);
  }
  return map;
}

type LastElement<T> = T extends [...unknown[], infer LastItem]
  ? LastItem
  : never;
type Operator<A, B> = (value: A) => B;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OperatorB<T> = T extends Operator<any, infer B> ? B : never;
type PipeOperators<Operators extends unknown[], Input> = Operators extends [
  infer Item,
  ...infer Tail,
]
  ? [Operator<Input, OperatorB<Item>>, ...PipeOperators<Tail, OperatorB<Item>>]
  : Operators;
type PipeOperatorsOutput<Operators extends unknown[]> = OperatorB<
  LastElement<Operators>
>;

export function pipe<Input, Operators extends unknown[]>(
  ...operators: PipeOperators<Operators, Input>
): (input: Input) => PipeOperatorsOutput<Operators> {
  return (input) =>
    operators.reduce(
      // @ts-expect-error unknown is expected, it will narrow
      (result, next) => next(result),
      input,
    ) as PipeOperatorsOutput<Operators>;
}
