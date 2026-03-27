# Core Concepts

## The entropy problem

Traditional scrapers break when the DOM changes. IDs get randomized, class names shift, nesting depth varies, attributes rename. Under entropy, every hardcoded selector is a ticking failure.

pierce is built on five principles that survive DOM mutation:

## 1. Semantic tags over IDs/classes

HTML semantic elements (`<table>`, `<form>`, `<dialog>`, `<article>`, `<nav>`) carry meaning that doesn't change under entropy. pierce always tries semantic selectors first.

```typescript
// Bad: breaks when class name changes
document.querySelector('.product-table')

// Good: semantic element never changes role
document.querySelector('table')
```

## 2. Computed styles over attribute strings

A honeypot field might be hidden via inline `style`, a CSS class, a parent's display property, or an `aria-hidden` attribute. All of these produce the same computed style. pierce always uses `getComputedStyle()`:

```typescript
// Bad: only catches one hiding method
el.style.display === 'none' || el.classList.contains('hidden')

// Good: catches ALL hiding methods
const s = getComputedStyle(el)
s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0
```

## 3. DOM quiescence over named selectors

Instead of waiting for `[data-loaded="true"]` (which changes per seed), pierce watches for the DOM to stop mutating:

```typescript
// Bad: selector may not exist under different entropy
await page.waitForSelector('[data-loaded]')

// Good: works regardless of what attributes appear
await waitForQuiescence(handle, { quietMs: 500 })
```

A `MutationObserver` watches for DOM changes. When nothing changes for N milliseconds, the content is ready.

## 4. Full tree traversal over getElementById

Shadow DOM hosts don't need IDs. pierce walks every element in the document and checks for `shadowRoot` (open mode) or `__sp_shadow` (intercepted closed mode):

```typescript
// Bad: ID changes per seed
document.getElementById('shadow-host-open').shadowRoot

// Good: discover ALL shadow hosts
document.querySelectorAll('*').forEach(el => {
  if (el.shadowRoot || el.__sp_shadow) { /* extract content */ }
})
```

## 5. Multi-strategy extraction

When the DOM structure is unpredictable, try multiple approaches and pick the winner:

```typescript
const table = await extractTable(handle)
// Strategy chain:
// 1. <table> elements (confidence: 0.95)
// 2. display:grid/table (confidence: 0.75)
// 3. repeated siblings (confidence: 0.60)
```

Each strategy returns a confidence score. The caller gets the best result without knowing which approach worked.

## The BrowserHandle contract

pierce never imports framework types. Every primitive takes a `BrowserHandle` — a minimal interface with 12 methods that any browser automation tool can implement:

| Method | Purpose |
|--------|---------|
| `evaluate(fn, arg)` | Execute JS in the browser |
| `goto(url)` | Navigate |
| `click(selector)` | Click an element |
| `type(selector, text)` | Type text |
| `fill(selector, value)` | Set input value |
| `waitForTimeout(ms)` | Fixed delay |
| `waitForSelector(sel)` | Wait for element |
| `mouseMove(x, y)` | Move cursor |
| `mouseClick(x, y)` | Click at coordinates |
| `boundingBox(sel)` | Get element bounds |
| `frames()` | Access child frames |
| `count(sel)` | Count matching elements |

This is the only contract. Everything else is browser-side JavaScript.
