# Extract

Data extraction primitives. Every function takes a `BrowserHandle` and returns structured data.

## `extractTable(handle, selector?)`

Multi-strategy table extraction with confidence scoring.

```typescript
import { extractTable } from 'pierce/extract'

const result = await extractTable(handle)
result.data.headers   // ["Name", "Email", "Role"]
result.data.rows      // [{Name: "Alice", Email: "...", Role: "Admin"}, ...]
result.strategy       // "semantic-table" | "display-table-or-grid" | "repeated-siblings"
result.confidence     // 0.95
```

**Strategy chain:**
1. Semantic `<table>` elements (confidence: 0.95)
2. Elements with `display: table` or `display: grid` (confidence: 0.75)
3. Repeated sibling structures with consistent child counts (confidence: 0.60)

## `extractVisibleText(handle, selector?)`

All rendered text after the browser has decoded entities, executed JS, and applied CSS.

```typescript
import { extractVisibleText } from 'pierce/extract'

const text = await extractVisibleText(handle)          // from <main> or <body>
const section = await extractVisibleText(handle, '#products')  // scoped
```

## `extractCleanText(handle, selector?)`

Same as `extractVisibleText` but strips zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF).

## `extractPseudoContent(handle, selector?)`

Content hidden in CSS `::before` and `::after` pseudo-elements.

```typescript
import { extractPseudoContent } from 'pierce/extract'

const pseudos = await extractPseudoContent(handle)
// [{ element: "price-display", pseudo: "::before", content: "$149.99" }, ...]
```

## `extractByHeadings(handle, selector?)`

Organizes page content by heading hierarchy. Works regardless of class names.

```typescript
import { extractByHeadings } from 'pierce/extract'

const sections = await extractByHeadings(handle)
// { "Products": ["Widget $9.99", "Gadget $19.99"], "Contact": ["555-0100"] }
```

## `extractStructuredData(handle)`

JSON-LD, OpenGraph, and microdata in one call.

```typescript
import { extractStructuredData } from 'pierce/extract'

const meta = await extractStructuredData(handle)
meta.data.jsonLd       // [{ "@type": "Product", "name": "...", ... }]
meta.data.openGraph    // { "og:title": "...", "og:image": "..." }
meta.data.microdata    // [{ type: "...", name: "...", price: "..." }]
```

## `extractCSSData(handle, selector?)`

Exhaustive CSS variable, pseudo-element, and data-attribute extraction. Does not match variable names by pattern — extracts everything.

```typescript
import { extractCSSData } from 'pierce/extract'

const css = await extractCSSData(handle)
css.data.variables       // { "--secret-code": "PROTO-0100", "--stock": "50" }
css.data.pseudoContent   // [{ selector: "...", pseudo: "::before", content: "$149.99" }]
css.data.dataAttributes  // { "div.data-value": "secret", ... }
```

## `extractSVGData(handle)`

Text, data attributes, and metadata from SVG elements.

## `extractCanvasText(handle)`

Text drawn on `<canvas>` via `fillText`/`strokeText`. Requires `applyStealth()` or `enableCanvasIntercept()` to be called before navigation.

```typescript
import { extractCanvasText } from 'pierce/extract'

const texts = await extractCanvasText(handle)
// ["$299.99", "1-800-555-0100", "CVS-0100"]
```
