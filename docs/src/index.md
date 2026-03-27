<div class="pierce-hero">
  <div class="pierce-hero-grid"></div>
  <div class="pierce-hero-orb pierce-hero-orb-1"></div>
  <div class="pierce-hero-orb pierce-hero-orb-2"></div>
  <div class="pierce-hero-orb pierce-hero-orb-3"></div>
  <div class="pierce-hero-scan"></div>
  <div class="pierce-hero-inner">
    <div class="pierce-hero-badge">
      <span class="pierce-hero-badge-dot"></span>
      Framework-agnostic &middot; Entropy-tolerant &middot; TypeScript-first
    </div>
    <h1>pierce</h1>
    <p class="pierce-hero-sub">
      Extraction primitives that <strong>pierce through any DOM</strong>.
      Shadow roots, iframes, obfuscation, honeypots, polymorphic markup &mdash;
      nothing hides.
    </p>
    <div class="pierce-hero-actions">
      <a href="guide/getting-started.html" class="pierce-btn pierce-btn-primary">Get Started</a>
      <a href="benchmark/proteus.html" class="pierce-btn pierce-btn-ghost">Benchmarks</a>
      <a href="https://github.com/user/pierce" class="pierce-btn pierce-btn-ghost">GitHub</a>
    </div>
    <div class="pierce-hero-install">
      <span class="prompt">$</span>
      <span class="cmd">npm install pierce</span>
    </div>
    <div class="pierce-stats">
      <div class="pierce-stat"><div class="pierce-stat-num green">35/35</div><div class="pierce-stat-label">Proteus challenges</div></div>
      <div class="pierce-stat"><div class="pierce-stat-num accent">97.9%</div><div class="pierce-stat-label">Full entropy pass rate</div></div>
      <div class="pierce-stat"><div class="pierce-stat-num amber">0</div><div class="pierce-stat-label">Framework lock-in</div></div>
    </div>
  </div>
</div>

## Why pierce?

Scrapers break when sites change their DOM. Class names shift, IDs get randomized, structures mutate. Every selector you hardcode is a future failure.

**pierce** takes a different approach. Instead of targeting specific elements, it uses:

- **Semantic HTML tags** over IDs and class names
- **Computed styles** over attribute string matching
- **DOM quiescence** over selector-based waits
- **Full tree traversal** over `getElementById`
- **Multi-strategy extraction** with confidence scoring

The result: primitives that work regardless of how the DOM is structured.

## Quick look

```typescript
import { fromPlaywright } from 'pierce/adapter/playwright'
import { extractTable, detectHoneypots, waitForQuiescence } from 'pierce'

const handle = fromPlaywright(page)  // one line to adapt

await handle.goto('https://example.com')
await waitForQuiescence(handle)       // wait for DOM to settle, not a selector

const table = await extractTable(handle)      // multi-strategy extraction
const traps = await detectHoneypots(handle)   // computed visibility, not class names
```

## Primitives at a glance

<div class="pierce-features">
  <div class="pierce-feature">
    <h4>extract</h4>
    <p>Tables, text, structured data, CSS variables, pseudo-elements, SVG, canvas draw calls.</p>
  </div>
  <div class="pierce-feature">
    <h4>detect</h4>
    <p>Honeypot fields, decoy records, element visibility &mdash; all via computed styles.</p>
  </div>
  <div class="pierce-feature">
    <h4>pierce</h4>
    <p>Shadow DOM (open + closed), recursive iframes, AJAX/dynamic content.</p>
  </div>
  <div class="pierce-feature">
    <h4>navigate</h4>
    <p>Semantic pagination, SPA routing, multi-step state machine journeys.</p>
  </div>
  <div class="pierce-feature">
    <h4>interact</h4>
    <p>Bezier mouse movement, human typing, math CAPTCHA solving, adaptive timing.</p>
  </div>
  <div class="pierce-feature">
    <h4>session</h4>
    <p>Anti-detection stealth, cookie management, shadow DOM interception.</p>
  </div>
</div>
