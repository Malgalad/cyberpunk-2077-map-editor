import type { AppState, AppStore } from "../types/types.ts";

class SelectedState<
  Selectors extends Record<string, (state: AppState) => unknown>,
> {
  private readonly store: AppStore;
  private readonly unsubscribe: () => void;
  private readonly selectors: Selectors;
  private readonly listeners: (() => void)[] = [];
  // @ts-expect-error State will be defined in constructor via rerunSelectors
  private state: { [key in keyof Selectors]: ReturnType<Selectors[key]> } = {};

  constructor(store: AppStore, selectors: Selectors) {
    this.store = store;
    this.selectors = selectors;
    this.unsubscribe = store.subscribe(() => this.rerunSelectors());
    this.rerunSelectors();

    for (const key of Object.keys(selectors)) {
      Object.defineProperty(this, key, {
        get: () => this.state[key as keyof Selectors],
        enumerable: true,
      });
    }
  }

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  dispose() {
    this.unsubscribe();
    while (this.listeners.length) {
      this.listeners.pop();
    }
  }

  private select(
    property: keyof Selectors,
    selector: Selectors[typeof property],
  ) {
    const value = selector(this.store.getState()) as ReturnType<
      typeof selector
    >;
    if (value !== this.state[property]) {
      this.state[property] = value;
      return true;
    }
    return false;
  }

  private rerunSelectors() {
    let shouldUpdate = false;

    for (const [key, selector] of Object.entries(this.selectors)) {
      shouldUpdate =
        this.select(key, selector as Selectors[keyof Selectors]) ||
        shouldUpdate;
    }

    if (shouldUpdate) this.listeners.forEach((callback) => callback());
  }
}

export default function selectedStateFactory<
  Selectors extends Record<string, (state: AppState) => unknown>,
>(store: AppStore, selectors: Selectors) {
  return new SelectedState(store, selectors) as SelectedState<Selectors> & {
    readonly [key in keyof Selectors]: ReturnType<Selectors[key]>;
  };
}
