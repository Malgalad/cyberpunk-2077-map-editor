import * as React from "react";

import type { DropdownContext } from "../../types/ui.types.ts";

const dropdownContext = React.createContext<DropdownContext>({
  level: 0,
  indent: true,
});

export const DropdownContextProvider = dropdownContext.Provider;
export const useDropdownContext = () => React.useContext(dropdownContext);
