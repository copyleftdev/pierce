# Session

Browser context management. Stealth profiles, cookies, and anti-detection.

## `applyStealth(contextHandle)`

Applies a comprehensive anti-detection profile. Call **before** creating any pages.

```typescript
import { fromPlaywrightContext } from 'pierce/adapter/playwright'
import { applyStealth } from 'pierce/session'

const ctx = fromPlaywrightContext(context)
await applyStealth(ctx)
```

**What it does:**
- Masks `navigator.webdriver` (returns `false`)
- Spoofs `navigator.plugins` (3 Chrome plugins)
- Sets `navigator.languages` to `['en-US', 'en']`
- Stubs `window.chrome.runtime`
- Overrides permissions API (`notifications` → `denied`)
- Intercepts `Element.prototype.attachShadow` to capture closed shadow roots
- Intercepts `HTMLCanvasElement.prototype.getContext` to capture `fillText`/`strokeText` calls

## `setSessionCookie(contextHandle, name, value, domain, opts?)`

Sets a cookie on the browser context.

```typescript
import { setSessionCookie } from 'pierce/session'

await setSessionCookie(ctx, 'session_id', 'abc123', 'example.com', {
  path: '/',  // default: "/"
})
```

## `getCookies(contextHandle)`

Returns all cookies from the browser context.

```typescript
import { getCookies } from 'pierce/session'

const cookies = await getCookies(ctx)
// [{ name: "session_id", value: "abc123", domain: "example.com" }]
```

## `getPageCookies(handle)`

Reads `document.cookie` from the current page.

```typescript
import { getPageCookies } from 'pierce/session'

const cookies = await getPageCookies(handle)
// { session_id: "abc123", theme: "dark" }
```

## `revisit(handle, url, times?, delayMs?)`

Visits a page multiple times (simulates returning user for session-gated content).

```typescript
import { revisit } from 'pierce/session'

const content = await revisit(handle, 'https://example.com/premium', 3, 200)
// Returns the text content after the final visit
```
