import { createAsyncThunk } from "@reduxjs/toolkit";

import type {
  District,
  PersistentAppState,
  RevivedAppState,
} from "../types/types.ts";
import { getDistrictProperties } from "../utilities/district.ts";
import { getDistrictTransforms } from "../utilities/transforms.ts";

export const hydrateState = createAsyncThunk(
  "hydrateState",
  async (persistentState: PersistentAppState) => {
    const { districts } = persistentState.district;
    const resolvedDistricts: District[] = await Promise.all(
      districts.map((district) =>
        getDistrictTransforms(district).then((transforms) => ({
          ...district,
          ...getDistrictProperties(district),
          transforms,
        })),
      ),
    );

    return {
      district: {
        districts: resolvedDistricts,
        current: persistentState.district.current,
      },
      nodes: persistentState.nodes,
      options: persistentState.options,
      project: persistentState.project,
    } satisfies RevivedAppState as RevivedAppState;
  },
);
