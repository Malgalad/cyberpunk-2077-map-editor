import * as React from "react";

import type { Map3D } from "./map3d.ts";

type Map3DContext = Map3D | null;

export const Map3DContext = React.createContext<Map3DContext>(null);

export const useMap3D = () => React.useContext(Map3DContext);
