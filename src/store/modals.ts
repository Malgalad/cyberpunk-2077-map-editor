import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Tabs } from "../modals/ProjectModal.tsx";
import type {
  AppThunkAction,
  DistrictData,
  Modal,
  ModalType,
} from "../types.ts";

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
function openModal(type: "project", data?: Tabs): AppThunkAction<Promise<void>>;
function openModal(
  type: "custom-district",
): AppThunkAction<Promise<DistrictData>>;
function openModal(type: "district-info"): AppThunkAction<Promise<void>>;
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
