import { createWorker } from "opfs-worker";

import { unzip, zip } from "./compression.ts";

export const fs = createWorker();

export async function loadCompressedJSON(pathname: string) {
  const arrayLike = await fs.readFile(pathname, "binary");
  const unzipped = await unzip(new Blob([arrayLike]).stream());

  return JSON.parse(unzipped);
}

export async function saveCompressedJSON(pathname: string, data: unknown) {
  const stream = zip(JSON.stringify(data));
  const response = new Response(stream, {
    headers: { "Content-Type": "application/octet-stream" },
  });
  const buffer = await response.arrayBuffer();
  await fs.writeFile(pathname, buffer);
}

Object.defineProperties(window, {
  $fs: {
    enumerable: false,
    configurable: false,
    writable: false,
    value: fs,
  },
});
