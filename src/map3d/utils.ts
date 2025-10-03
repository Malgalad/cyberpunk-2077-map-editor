import { FOV, HALF_TILE_SIZE, MAP_SIZE } from "./constants.js";

const fovTan = Math.tan(((FOV / 2) * Math.PI) / 180);
const zoomScale = (HALF_TILE_SIZE / fovTan) * MAP_SIZE;

export const getDistanceFromZoom = (zoom: number) =>
  zoomScale / (HALF_TILE_SIZE * Math.pow(2, zoom));

export const getZoomFromDistance = (distance: number) =>
  Math.log2(zoomScale / distance / HALF_TILE_SIZE);
