/* eslint-disable @typescript-eslint/no-explicit-any */
const hasOwn = Object.prototype.hasOwnProperty;

function isPlainArray(value: unknown): value is Array<unknown> {
  return Array.isArray(value) && value.length === Object.keys(value).length;
}

function hasObjectPrototype(o: any): boolean {
  return Object.prototype.toString.call(o) === "[object Object]";
}

// Copied from: https://github.com/jonschlinkert/is-plain-object
function isPlainObject(o: any): o is Record<PropertyKey, unknown> {
  if (!hasObjectPrototype(o)) {
    return false;
  }

  // If has no constructor
  const ctor = o.constructor;
  if (ctor === undefined) {
    return true;
  }

  // If has modified prototype
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }

  // If constructor does not have an Object-specific method
  // eslint-disable-next-line no-prototype-builtins
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }

  // Handles Objects created by Object.create(<arbitrary prototype>)
  if (Object.getPrototypeOf(o) !== Object.prototype) {
    return false;
  }

  // Most likely a plain Object
  return true;
}

// Copied from: https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts
/**
 * This function returns `a` if `b` is deeply equal.
 * If not, it will replace any deeply equal children of `b` with those of `a`.
 * This can be used for structural sharing between JSON values for example.
 */
function replaceEqualDeep<T>(a: unknown, b: T): T;
function replaceEqualDeep(a: any, b: any): any {
  if (a === b) {
    return a;
  }

  const array = isPlainArray(a) && isPlainArray(b);

  if (!array && !(isPlainObject(a) && isPlainObject(b))) return b;

  const aItems = array ? a : Object.keys(a);
  const aSize = aItems.length;
  const bItems = array ? b : Object.keys(b);
  const bSize = bItems.length;
  const copy: any = array ? new Array(bSize) : {};

  let equalItems = 0;

  for (let i = 0; i < bSize; i++) {
    const key: any = array ? i : bItems[i];
    const aItem = a[key];
    const bItem = b[key];

    if (aItem === bItem) {
      copy[key] = aItem;
      if (array ? i < aSize : hasOwn.call(a, key)) equalItems++;
      continue;
    }

    if (
      aItem === null ||
      bItem === null ||
      typeof aItem !== "object" ||
      typeof bItem !== "object"
    ) {
      copy[key] = bItem;
      continue;
    }

    const v = replaceEqualDeep(aItem, bItem);
    copy[key] = v;
    if (v === aItem) equalItems++;
  }

  return aSize === bSize && equalItems === aSize ? a : copy;
}

export function structuralSharing<T extends (...args: any[]) => any>(fn: T) {
  let lastResult: ReturnType<T>;

  return (...args: Parameters<T>): ReturnType<T> => {
    lastResult = replaceEqualDeep(lastResult, fn(...args));
    return lastResult;
  };
}
