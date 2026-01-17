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

export function uploadFileByExtensions(accept: string) {
  const deferred = Promise.withResolvers<File>();
  createInput(
    accept,
    (file) => deferred.resolve(file),
    () => deferred.reject(),
  );
  return deferred.promise;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchorElement = document.createElement("a");
  anchorElement.href = url;
  anchorElement.download = filename;
  anchorElement.click();
  URL.revokeObjectURL(url);
}
