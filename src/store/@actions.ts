import { createAction } from "@reduxjs/toolkit";

import type { PersistentAppState } from "../types.ts";

export const hydrateState = createAction<PersistentAppState>("hydrateState");
