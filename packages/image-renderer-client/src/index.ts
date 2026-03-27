import { RenderJob } from "./types";

/**
 * Renders an image using the imagerenderer service.
 * @param job The render job containing type and data.
 * @returns A Promise that resolves to a Buffer containing the rendered image.
 */
export async function render(job: RenderJob): Promise<Buffer> {
  const imageUrl = process.env.IMAGE_RENDERER_URL || "http://localhost/render";
  
  const res = await fetch(imageUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Render failed (${res.status}): ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export * from "./types";
