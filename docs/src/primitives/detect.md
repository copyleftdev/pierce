# Detect

Anti-bot awareness primitives. Identify traps, decoys, and hidden elements using computed styles — never class names.

## `detectHoneypots(handle, formSelector?)`

Separates real form fields from hidden trap fields.

```typescript
import { detectHoneypots } from 'pierce/detect'

const { realFields, trapFields } = await detectHoneypots(handle)
// realFields:  [{ tag: "input", type: "text", name: "email", visible: true }, ...]
// trapFields:  [{ tag: "input", type: "text", name: "website_url", visible: false }, ...]
```

**How it works:** Checks `getComputedStyle()` for every form element, walking the parent chain. Catches:
- `display: none`
- `visibility: hidden`
- `opacity: 0`
- Off-screen positioning (`left: -9999px`)
- Zero dimensions (`height: 0; width: 0`)
- `clip: rect(0,0,0,0)` / `clip-path: inset(100%)`
- `aria-hidden="true"`
- Parent-inherited hiding

## `filterDecoys(handle, containerSelector?)`

Separates real records from plausible-but-fake decoy data.

```typescript
import { filterDecoys } from 'pierce/detect'

const { real, decoys } = await filterDecoys(handle)
```

**Signals checked:**
- `aria-hidden="true"`
- Invisible text (same `color` as `backgroundColor`)
- `display: none`, `visibility: hidden`, `opacity: 0`
- `data-decoy="true"` attributes

## `checkVisibility(handle, selector?)`

Low-level visibility check for any elements. Returns detailed reasons.

```typescript
import { checkVisibility } from 'pierce/detect'

const elements = await checkVisibility(handle, 'input, select, textarea')
// [{ visible: true, reasons: [], tag: "input", name: "email" },
//  { visible: false, reasons: ["offscreen-left", "parent-opacity:0"], tag: "input", name: "trap" }]
```

## `getVisible(handle, selector?)` / `getHidden(handle, selector?)`

Convenience wrappers that filter `checkVisibility` results.
