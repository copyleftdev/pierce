# Navigate

Page traversal primitives. Follows pagination, SPA routes, and multi-step workflows without hardcoded selectors.

## `paginate(handle, extractFn, maxPages?)`

Follows pagination automatically, extracting items from each page.

```typescript
import { paginate } from 'pierce/navigate'

const pages = await paginate(handle, async (h) => {
  return h.evaluate(() =>
    Array.from(document.querySelectorAll('h3'))
      .map(el => el.textContent?.trim() || '')
  )
}, 20)

const allItems = pages.flatMap(p => p.items)
```

**"Next" discovery chain:**
1. `<a rel="next">` (standard)
2. `[aria-label*="next"]` (accessible)
3. Visible text: "Next", "→", ">>", "›", "▶"
4. "Load More" / "Show More" buttons

Checks for disabled state before clicking. Uses DOM quiescence between pages.

## `navigateSPA(handle, linkPattern, opts?)`

Clicks a navigation element matching a pattern and waits for the SPA to re-render.

```typescript
import { navigateSPA } from 'pierce/navigate'

await navigateSPA(handle, /products/i, {
  hydratedAttr: 'data-hydrated',  // wait for this attribute
  waitMs: 5000,
})
```

Finds elements by text content or `onclick` attribute — not by CSS selector.

## `waitForHydration(handle, opts?)`

Waits for a SPA to finish its initial render.

```typescript
import { waitForHydration } from 'pierce/navigate'

await waitForHydration(handle, { attr: 'data-hydrated', timeoutMs: 5000 })
```

Falls back to DOM quiescence if the hydration attribute isn't found.

## `followJourney(handle, opts?)`

Navigates multi-step state machines, collecting tokens at each step.

```typescript
import { followJourney } from 'pierce/navigate'

const steps = await followJourney(handle, {
  maxSteps: 5,
  advancePatterns: [/next/i, /continue/i, /login/i, /checkout/i],
})
// [{ step: 1, content: "...", tokens: { "data-token": "tkA_abc" } },
//  { step: 2, content: "...", tokens: { "data-token": "tkB_def" } }, ...]
```

**Advance strategies:**
1. Try calling JS functions (`goStep2`, `advanceStep`, `wfLogin`, etc.)
2. Click visible buttons matching text patterns
3. Collect `data-*token*` attributes at each step
