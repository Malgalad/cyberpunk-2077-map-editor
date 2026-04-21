const worker = new Worker(new URL("./worker-entry.ts", import.meta.url), {
  type: "module",
});

export default worker;
