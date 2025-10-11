export async function loadURLAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob.arrayBuffer();
}

function createInput(
  accept: string,
  onchange: (file: File) => void,
  oncancel?: () => void,
) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    onchange(file);
  };
  input.oncancel = () => {
    oncancel?.();
  };
  input.click();
}

export function loadFile(accept: string) {
  const deferred = Promise.withResolvers<File>();
  createInput(
    accept,
    (file) => deferred.resolve(file),
    () => deferred.reject(),
  );
  return deferred.promise;
}

export function loadFileAsText(accept: string) {
  const deferred = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onload = (event) => {
    deferred.resolve(event.target?.result as string);
  };

  createInput(
    accept,
    (file) => reader.readAsText(file),
    () => deferred.reject(),
  );

  return deferred.promise;
}

export function saveBlobToFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchorElement = document.createElement("a");
  anchorElement.href = url;
  anchorElement.download = name;
  anchorElement.click();
  URL.revokeObjectURL(url);
}
