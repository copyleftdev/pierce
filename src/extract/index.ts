export {
  extractVisibleText,
  extractCleanText,
  extractPseudoContent,
  extractSplitText,
  extractByHeadings,
} from "./text.js";
export { extractTable, extractAllTables } from "./table.js";
export { extractStructuredData } from "./structured-data.js";
export { extractCSSData } from "./css-data.js";
export { extractSVGData } from "./svg.js";
export type { SVGData } from "./svg.js";
export {
  enableCanvasIntercept,
  getCanvasDrawCalls,
  extractCanvasText,
  captureCanvasImages,
} from "./canvas.js";
export type { CanvasDrawCall } from "./canvas.js";
