# Custom Adapter

Implement `BrowserHandle` for any framework — Selenium, CDP, Cypress, or your own driver.

## The interface

```typescript
import type { BrowserHandle, FrameHandle } from 'pierce'

interface BrowserHandle {
  evaluate<R>(fn: (arg: any) => R, arg?: any): Promise<R>;
  goto(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  waitForSelector(selector: string, opts?: { timeout?: number }): Promise<void>;
  mouseMove(x: number, y: number): Promise<void>;
  mouseClick(x: number, y: number): Promise<void>;
  boundingBox(selector: string): Promise<{ x, y, width, height } | null>;
  frames(): Promise<FrameHandle[]>;
  count(selector: string): Promise<number>;
  textContent(selector: string): Promise<string | null>;
  scroll(x: number, y: number): Promise<void>;
}
```

## Minimal implementation

Most methods map directly to your framework's API. The critical one is `evaluate` — it must serialize a function, execute it in the browser, and return the result.

```typescript
function fromMyDriver(driver: any): BrowserHandle {
  return {
    evaluate: (fn, arg) => driver.executeScript(
      `return (${fn.toString()})(${JSON.stringify(arg)})`
    ),
    goto: (url) => driver.navigate(url),
    click: (sel) => driver.findElement(sel).click(),
    type: (sel, text) => driver.findElement(sel).sendKeys(text),
    fill: (sel, value) => driver.executeScript(
      `document.querySelector("${sel}").value = "${value}"`
    ),
    waitForTimeout: (ms) => new Promise(r => setTimeout(r, ms)),
    waitForSelector: async (sel, opts) => {
      const timeout = opts?.timeout ?? 5000;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const exists = await driver.executeScript(
          `return !!document.querySelector("${sel}")`
        );
        if (exists) return;
        await new Promise(r => setTimeout(r, 100));
      }
    },
    mouseMove: (x, y) => driver.actions().move({ x, y }).perform(),
    mouseClick: (x, y) => driver.actions().move({ x, y }).click().perform(),
    boundingBox: (sel) => driver.executeScript(`
      const el = document.querySelector("${sel}");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    `),
    frames: async () => [],  // return empty if unsupported
    count: (sel) => driver.executeScript(
      `return document.querySelectorAll("${sel}").length`
    ),
    textContent: (sel) => driver.executeScript(
      `const el = document.querySelector("${sel}"); return el ? el.textContent : null`
    ),
    scroll: (x, y) => driver.executeScript(`window.scrollBy(${x}, ${y})`),
  };
}
```

## Context handle (optional)

For stealth profiles and cookies, implement `BrowserContextHandle`:

```typescript
import type { BrowserContextHandle } from 'pierce'

function fromMyContext(driver: any): BrowserContextHandle {
  return {
    addInitScript: (script) => driver.executeOnNewDocument(script),
    addCookie: (cookie) => driver.manage().addCookie(cookie),
    getCookies: () => driver.manage().getCookies(),
  };
}
```

## Validation

Run your adapter against the Proteus harness to verify it works:

```sh
npx tsx examples/custom-adapter.ts          # uses hand-built adapter
npx tsx examples/custom-adapter.ts --stress # full entropy matrix
```

The `examples/custom-adapter.ts` file is a complete reference implementation you can fork.
