import { createContext } from "react";
import { PanZoom } from "./PanZoom";

export const RendererContext = createContext<PanZoom>(null as any);
