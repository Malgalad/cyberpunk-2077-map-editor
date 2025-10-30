export function zip(string: string): ReadableStream {
  const textEncoder = new TextEncoder();
  const encodedData = textEncoder.encode(string);

  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encodedData);
      controller.close();
    },
  });

  return readableStream.pipeThrough(new CompressionStream("gzip"));
}

export async function unzip(compressedData: ReadableStream): Promise<string> {
  const decompressedStream = compressedData.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const decompressedBlob = await new Response(decompressedStream).blob();

  const decompressedArrayBuffer = await decompressedBlob.arrayBuffer();
  const textDecoder = new TextDecoder();

  return textDecoder.decode(decompressedArrayBuffer);
}
