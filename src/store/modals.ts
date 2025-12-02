import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type * as React from "react";

import type { Tabs as ImportExportTabs } from "../modals/ImportExportNodesModal.tsx";
import type { Tabs as ProjectTabs } from "../modals/ProjectModal.tsx";
import type { Modal, ModalType } from "../types/modals.ts";
import type { AppThunkAction, DistrictProperties } from "../types/types.ts";

interface ModalsState {
  modal: Modal | undefined;
}

const initialState: ModalsState = {
  modal: undefined,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let deferred: ReturnType<typeof Promise.withResolvers<any>> | undefined;

const modalsSlice = createSlice({
  name: "modals",
  initialState,
  reducers: {
    setModal(state, action: PayloadAction<Modal | undefined>) {
      state.modal = action.payload;
    },
  },
  selectors: {
    getModal: (state) => state.modal,
  },
});

function openModal(type: "alert", data: string): AppThunkAction<Promise<void>>;
function openModal(
  type: "critical",
  data: string,
): AppThunkAction<Promise<void>>;
function openModal(
  type: "confirm",
  data: string,
): AppThunkAction<Promise<boolean>>;
function openModal(
  type: "confirm-by-typing",
  data: { children: React.ReactNode; password: string },
): AppThunkAction<Promise<boolean>>;
function openModal(type: "loading"): AppThunkAction<Promise<void>>;
function openModal(
  type: "project",
  data?: ProjectTabs,
): AppThunkAction<Promise<void>>;
function openModal(
  type: "edit-district",
  data: boolean,
): AppThunkAction<Promise<DistrictProperties>>;
function openModal(
  type: "import-export",
  data?: ImportExportTabs,
): AppThunkAction<Promise<void>>;
function openModal(
  type: "confirm-instance-exclusion",
  data: {
    index: number;
    position: [number, number];
  },
): AppThunkAction<Promise<boolean>>;
function openModal<T>(
  type: ModalType,
  data?: unknown,
): AppThunkAction<Promise<T>> {
  return (dispatch, getState) => {
    const modal = modalsSlice.selectors.getModal(getState());

    if (modal && deferred) {
      deferred.resolve(undefined);
    }

    deferred = Promise.withResolvers<T>();

    dispatch(
      modalsSlice.actions.setModal({
        type,
        data,
      }),
    );

    return deferred.promise;
  };
}

function closeModal(reason?: unknown): AppThunkAction {
  return (dispatch) => {
    if (deferred) {
      deferred.resolve(reason);
      deferred = undefined;
    }

    dispatch(modalsSlice.actions.setModal(undefined));
  };
}

export const ModalsActions = {
  openModal,
  closeModal,
};
export const ModalsSelectors = modalsSlice.selectors;
export default modalsSlice;
