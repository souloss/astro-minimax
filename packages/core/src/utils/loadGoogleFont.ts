import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function loadLocalFont(filename: string): Promise<ArrayBuffer> {
  const fontPath = join(process.cwd(), "public", "fonts", filename);
  const buffer = await readFile(fontPath);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

async function loadGoogleFonts(
  text: string
): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  const hasChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);

  if (hasChinese) {
    const fontsConfig = [
      { name: "Noto Sans SC", weight: 400, style: "normal", file: "noto-sans-sc-400-normal.woff" },
      { name: "Noto Sans SC", weight: 700, style: "normal", file: "noto-sans-sc-700-normal.woff" },
    ];

    return Promise.all(
      fontsConfig.map(async ({ name, weight, style, file }) => ({
        name,
        data: await loadLocalFont(file),
        weight,
        style,
      }))
    );
  }

  const fontsConfig = [
    { name: "IBM Plex Mono", weight: 400, style: "normal", file: "ibm-plex-mono-latin-400-normal.woff" },
    { name: "IBM Plex Mono", weight: 700, style: "normal", file: "ibm-plex-mono-latin-700-normal.woff" },
  ];

  return Promise.all(
    fontsConfig.map(async ({ name, weight, style, file }) => ({
      name,
      data: await loadLocalFont(file),
      weight,
      style,
    }))
  );
}

export default loadGoogleFonts;