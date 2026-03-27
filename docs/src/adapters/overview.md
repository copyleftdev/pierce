# Adapters

pierce is framework-agnostic. It defines a `BrowserHandle` interface and ships adapters for popular frameworks. You can also build your own.

## How it works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Playwright   │     │  Puppeteer   │     │  Your Framework  │
│    Page       │     │    Page      │     │     Driver       │
└──────┬───────┘     └──────┬───────┘     └────────┬─────────┘
       │                    │                      │
       ▼                    ▼                      ▼
  fromPlaywright()    fromPuppeteer()     your adapter code
       │                    │                      │
       └────────┬───────────┘──────────────────────┘
                │
                ▼
        ┌──────────────┐
        │ BrowserHandle │  ← 12 methods, zero framework types
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │   pierce      │  ← Same primitives regardless of framework
        │  primitives   │
        └──────────────┘
```

## Built-in adapters

| Adapter | Import | Framework |
|---------|--------|-----------|
| Playwright | `pierce/adapter/playwright` | `fromPlaywright(page)`, `fromPlaywrightContext(context)` |
| Puppeteer | `pierce/adapter/puppeteer` | `fromPuppeteer(page)`, `fromPuppeteerBrowser(browser)` |

## Writing your own

Implement the `BrowserHandle` interface. See [Custom Adapter](./custom.md) for a complete walkthrough.
