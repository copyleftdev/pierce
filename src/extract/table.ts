/**
 * Entropy-Tolerant Table Extraction
 *
 * Multi-strategy extraction that works regardless of DOM structure:
 * 1. Semantic <table> elements (highest confidence)
 * 2. Grid-like structures via computed display
 * 3. Repeated sibling patterns
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { TableData, ExtractionResult } from "../types.js";

/**
 * Extract table data using multiple strategies, returning the best result.
 */
export async function extractTable(
  handle: BrowserHandle,
  selector?: string
): Promise<ExtractionResult<TableData>> {
  const start = Date.now();

  const result = await handle.evaluate((sel) => {
    // Strategy 1: Semantic <table> tags
    const tables = sel
      ? document.querySelectorAll(`${sel} table, ${sel}`)
      : document.querySelectorAll("table");

    for (const table of Array.from(tables)) {
      if (table.tagName !== "TABLE") continue;
      const headers = Array.from(table.querySelectorAll("th")).map((th) =>
        th.textContent?.trim() || ""
      );
      const rows: Record<string, string>[] = [];
      const tbody = table.querySelector("tbody");
      const trs = tbody
        ? tbody.querySelectorAll("tr")
        : table.querySelectorAll("tr");

      for (const tr of Array.from(trs)) {
        const cells = Array.from(tr.querySelectorAll("td")).map((td) =>
          td.textContent?.trim() || ""
        );
        if (cells.length === 0) continue;
        if (headers.length) {
          const row: Record<string, string> = {};
          headers.forEach((h, i) => (row[h] = cells[i] || ""));
          rows.push(row);
        } else {
          const row: Record<string, string> = {};
          cells.forEach((c, i) => (row[`col_${i}`] = c));
          rows.push(row);
        }
      }

      if (rows.length > 0) {
        return {
          data: { headers, rows },
          confidence: 0.95,
          strategy: "semantic-table",
        };
      }
    }

    // Strategy 2: Elements with display:table or display:grid
    const allEls = document.querySelectorAll("*");
    for (const el of Array.from(allEls)) {
      const display = getComputedStyle(el).display;
      if (display === "table" || display === "grid") {
        const children = Array.from(el.children);
        if (children.length > 1) {
          const rows: Record<string, string>[] = [];
          let headers: string[] = [];
          children.forEach((child, i) => {
            const cells = Array.from(child.children).map(
              (c) => c.textContent?.trim() || ""
            );
            if (i === 0 && cells.every((c) => c.length < 30)) {
              headers = cells;
            } else if (cells.length > 0) {
              const row: Record<string, string> = {};
              (headers.length ? headers : cells.map((_, j) => `col_${j}`))
                .forEach((h, j) => (row[h] = cells[j] || ""));
              rows.push(row);
            }
          });
          if (rows.length > 0) {
            return {
              data: { headers, rows },
              confidence: 0.75,
              strategy: "display-table-or-grid",
            };
          }
        }
      }
    }

    // Strategy 3: Repeated siblings with consistent structure
    const containers = document.querySelectorAll("ul, ol, div, section");
    for (const container of Array.from(containers)) {
      const children = Array.from(container.children);
      if (children.length < 2) continue;
      // Check if children have consistent internal structure
      const firstChildCount = children[0]?.children.length || 0;
      if (firstChildCount < 2) continue;
      const consistent = children.every(
        (c) => Math.abs(c.children.length - firstChildCount) <= 1
      );
      if (!consistent) continue;

      const rows: Record<string, string>[] = [];
      for (const child of children) {
        const cells = Array.from(child.children).map(
          (c) => c.textContent?.trim() || ""
        );
        const row: Record<string, string> = {};
        cells.forEach((c, i) => (row[`col_${i}`] = c));
        rows.push(row);
      }
      if (rows.length > 1) {
        return {
          data: { headers: [], rows },
          confidence: 0.6,
          strategy: "repeated-siblings",
        };
      }
    }

    return { data: { headers: [], rows: [] }, confidence: 0, strategy: "none" };
  }, selector ?? null);

  return { ...result, elapsed: Date.now() - start };
}

/**
 * Extract ALL tables from a page.
 */
export async function extractAllTables(
  handle: BrowserHandle
): Promise<ExtractionResult<TableData>[]> {
  const count = await handle.count("table");
  const results: ExtractionResult<TableData>[] = [];
  for (let i = 0; i < count; i++) {
    const result = await extractTable(handle, `table:nth-of-type(${i + 1})`);
    if (result.data.rows.length > 0) results.push(result);
  }
  return results;
}
