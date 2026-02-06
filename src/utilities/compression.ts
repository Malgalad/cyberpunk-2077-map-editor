/**
 * Compress string using the gzip algorithm
 */
export function zip(string: string): ReadableStream {
  const encoded = new TextEncoder().encode(string);
  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });

  return readableStream.pipeThrough(new CompressionStream("gzip"));
}

/**
 * Decompress gzipped string
 */
export async function unzip(stream: ReadableStream): Promise<string> {
  const decompressedStream = stream.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const buffer = await new Response(decompressedStream).arrayBuffer();

  return new TextDecoder().decode(buffer);
}
