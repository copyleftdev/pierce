/**
 * Structured Data Extraction
 *
 * Extracts JSON-LD, OpenGraph, and microdata from any page.
 * These formats are standardized — most entropy-resistant data source.
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { StructuredData, ExtractionResult } from "../types.js";

export async function extractStructuredData(
  handle: BrowserHandle
): Promise<ExtractionResult<StructuredData>> {
  const start = Date.now();
  const data = await handle.evaluate(() => {
    const result: {
      jsonLd: unknown[];
      openGraph: Record<string, string>;
      microdata: Record<string, string>[];
    } = { jsonLd: [], openGraph: {}, microdata: [] };

    // JSON-LD
    document
      .querySelectorAll('script[type="application/ld+json"]')
      .forEach((script) => {
        try {
          result.jsonLd.push(JSON.parse(script.textContent || ""));
        } catch {}
      });

    // Open Graph
    document.querySelectorAll('meta[property^="og:"]').forEach((meta) => {
      const prop = meta.getAttribute("property") || "";
      const content = meta.getAttribute("content") || "";
      result.openGraph[prop] = content;
    });

    // Microdata
    document.querySelectorAll("[itemscope]").forEach((el) => {
      const item: Record<string, string> = {
        type: el.getAttribute("itemtype") || "",
      };
      el.querySelectorAll("[itemprop]").forEach((prop) => {
        item[prop.getAttribute("itemprop") || ""] =
          prop.getAttribute("content") || prop.textContent?.trim() || "";
      });
      result.microdata.push(item);
    });

    return result;
  });

  const hasData =
    data.jsonLd.length > 0 ||
    Object.keys(data.openGraph).length > 0 ||
    data.microdata.length > 0;

  return {
    data: {
      jsonLd: data.jsonLd.length ? data.jsonLd : undefined,
      openGraph: Object.keys(data.openGraph).length
        ? data.openGraph
        : undefined,
      microdata: data.microdata.length ? data.microdata : undefined,
    },
    confidence: hasData ? 0.95 : 0,
    strategy: "standard-metadata",
    elapsed: Date.now() - start,
  };
}
