import type * as THREE from "three";

function clearUpdateRanges(this: THREE.BufferAttribute) {
  this.clearUpdateRanges();
}

export function addInstanceUpdateRange(
  attribute: THREE.BufferAttribute,
  index: number,
) {
  // Three clears ranges after partial uploads, but not the initial full upload.
  if (attribute.version === 0 && attribute.updateRanges.length === 0)
    attribute.onUpload(clearUpdateRanges);

  const start = index * attribute.itemSize;
  const last = attribute.updateRanges.at(-1);
  if (last && start >= last.start && start <= last.start + last.count) {
    last.count = Math.max(last.count, start + attribute.itemSize - last.start);
  } else {
    attribute.addUpdateRange(start, attribute.itemSize);
  }
}
