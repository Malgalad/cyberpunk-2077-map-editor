import * as React from "react";

import type {
  DropdownContext,
  DropdownTriggerContext,
} from "../../../types/ui.types.ts";

const dropdownContext = React.createContext<DropdownContext>({
  level: 0,
  indent: true,
});

export const DropdownContextProvider = dropdownContext.Provider;
export const useDropdownContext = () => React.useContext(dropdownContext);

const dropdownTriggerContext = React.createContext<DropdownTriggerContext>({
  direction: "right",
  isTrigger: false,
});

export const DropdownTriggerContextProvider = dropdownTriggerContext.Provider;
export const useDropdownTriggerContext = () =>
  React.useContext(dropdownTriggerContext);
