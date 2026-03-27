/**
 * SVG Data Extraction
 *
 * Extracts text, data attributes, and metadata from SVG elements.
 */
import type { BrowserHandle } from "../adapter/types.js";

export interface SVGData {
  texts: string[];
  dataValues: Record<string, string>;
  metadata: { title?: string; desc?: string };
}

export async function extractSVGData(handle: BrowserHandle): Promise<SVGData> {
  return handle.evaluate(() => {
    const result: {
      texts: string[];
      dataValues: Record<string, string>;
      metadata: { title?: string; desc?: string };
    } = { texts: [], dataValues: {}, metadata: {} };

    document.querySelectorAll("svg").forEach((svg) => {
      // Text elements
      svg.querySelectorAll("text, tspan").forEach((t) => {
        const text = t.textContent?.trim();
        if (text && !result.texts.includes(text)) result.texts.push(text);
      });

      // Metadata
      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");
      if (title) result.metadata.title = title.textContent?.trim() || "";
      if (desc) result.metadata.desc = desc.textContent?.trim() || "";

      // Data attributes on any SVG element
      svg.querySelectorAll("*").forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
          if (attr.name.startsWith("data-")) {
            result.dataValues[attr.name] = attr.value;
          }
        }
      });
    });

    return result;
  });
}
