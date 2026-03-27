# Pierce

Boundary-crossing primitives. Extract content from shadow roots, iframes, and dynamically-loaded regions.

## `extractShadowContent(handle)`

Discovers and extracts all shadow DOM content without relying on host element IDs.

```typescript
import { extractShadowContent } from 'pierce/pierce'

const shadows = await extractShadowContent(handle)
// [{ hostTag: "div", mode: "open", text: "Secret content", dataValues: { "data-value": "abc" }, html: "..." },
//  { hostTag: "div", mode: "closed", text: "Hidden content", ... }]
```

**How it works:**
1. Walks every element in the document
2. Checks `el.shadowRoot` for open shadow roots
3. Checks `el.__sp_shadow` for closed roots (intercepted by the stealth init script)
4. Extracts text, data attributes, and innerHTML from each root

> Closed shadow root interception requires `applyStealth()` to be called before navigation.

## `extractFrameContent(handle)`

Recursive iframe traversal including srcdoc iframes.

```typescript
import { extractFrameContent } from 'pierce/pierce'

const frames = await extractFrameContent(handle)
// [{ url: "https://...", depth: 1, text: "Frame content", isSrcdoc: false },
//  { url: "srcdoc", depth: 1, text: "Embedded content", isSrcdoc: true }]
```

## `extractDynamicContent(handle, opts?)`

Waits for AJAX/XHR/fetch/setTimeout content using DOM quiescence, not specific selectors.

```typescript
import { extractDynamicContent } from 'pierce/pierce'

const content = await extractDynamicContent(handle, { quietMs: 800, timeoutMs: 10000 })
content.initial           // text before dynamic content loaded
content.final             // text after DOM settled
content.delta             // new lines that appeared
content.hadDynamicContent // boolean
```

## `waitForLoadingComplete(handle, timeoutMs?)`

Waits for "Loading..." indicators and skeleton screens to disappear.

## `hasShadowDOM(handle)`

Quick check: does the page contain any shadow DOM elements?

## `countFrames(handle)`

Returns the number of child frames.
