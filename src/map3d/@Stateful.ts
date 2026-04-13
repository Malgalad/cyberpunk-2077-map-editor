import type { AppState, AppStore } from "../types/types.ts";

abstract class Stateful<
  Selectors extends Record<string, (state: AppState) => unknown>,
> extends EventTarget {
  private readonly store: AppStore;
  private readonly unsubscribe: () => void;
  private readonly selectors: Selectors;
  // @ts-expect-error State will be defined in constructor via rerunSelectors
  state: { [K in keyof Selectors]: ReturnType<Selectors[K]> } = {};

  protected constructor(store: AppStore, selectors: Selectors) {
    super();

    this.store = store;
    this.selectors = selectors;
    this.unsubscribe = store.subscribe(() => this.rerunSelectors());
    this.rerunSelectors();
  }

  dispose() {
    this.unsubscribe();
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

    if (shouldUpdate) this.dispatchEvent(new Event("update"));
  }
}

export default Stateful;
