import type { BrowserHandle, BrowserContextHandle } from "./adapter/types.js";

// ---------------------------------------------------------------------------
// Core context — carries page + entropy params through every primitive
// ---------------------------------------------------------------------------
export interface ScrapeContext {
  handle: BrowserHandle;
  contextHandle: BrowserContextHandle;
}

// ---------------------------------------------------------------------------
// Extraction results — every primitive returns typed data with provenance
// ---------------------------------------------------------------------------
export interface ExtractionResult<T> {
  data: T;
  confidence: number; // 0.0–1.0
  strategy: string; // which strategy produced this result
  elapsed: number; // ms
}

// ---------------------------------------------------------------------------
// Element visibility
// ---------------------------------------------------------------------------
export interface VisibilityCheck {
  visible: boolean;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Table data
// ---------------------------------------------------------------------------
export interface TableData {
  headers: string[];
  rows: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Form field
// ---------------------------------------------------------------------------
export interface FormField {
  tag: string;
  type: string;
  name: string;
  placeholder: string;
  required: boolean;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------
export interface StructuredData {
  jsonLd?: unknown[];
  openGraph?: Record<string, string>;
  microdata?: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// CSS extracted data
// ---------------------------------------------------------------------------
export interface CSSData {
  variables: Record<string, string>;
  pseudoContent: { selector: string; pseudo: string; content: string }[];
  dataAttributes: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Shadow DOM content
// ---------------------------------------------------------------------------
export interface ShadowContent {
  hostTag: string;
  mode: "open" | "closed" | "unknown";
  text: string;
  dataValues: Record<string, string>;
  html: string;
}

// ---------------------------------------------------------------------------
// Frame content
// ---------------------------------------------------------------------------
export interface FrameContent {
  url: string;
  depth: number;
  text: string;
  isSrcdoc: boolean;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
export interface PaginationResult<T> {
  pages: { pageNum: number; items: T[] }[];
  totalItems: number;
}

export interface JourneyStep {
  step: number;
  content: string;
  tokens: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Mouse movement
// ---------------------------------------------------------------------------
export interface MousePath {
  points: { x: number; y: number; t: number }[];
  duration: number;
}

// ---------------------------------------------------------------------------
// CAPTCHA
// ---------------------------------------------------------------------------
export interface CaptchaChallenge {
  type: "math" | "text" | "unknown";
  question: string;
  answer: string | number | null;
}

// ---------------------------------------------------------------------------
// Selector strategies — ordered by entropy tolerance (most stable first)
// ---------------------------------------------------------------------------
export type SelectorStrategy =
  | { kind: "semantic"; tags: string[] }
  | { kind: "role"; role: string }
  | { kind: "content"; text: string | RegExp }
  | { kind: "structural"; pattern: string }
  | { kind: "computed"; property: string; value: string | RegExp }
  | { kind: "attribute"; name: string | RegExp }
  | { kind: "positional"; index: number };

// ---------------------------------------------------------------------------
// Quiescence options
// ---------------------------------------------------------------------------
export interface QuiescenceOptions {
  quietMs?: number; // how long DOM must be stable (default 500)
  timeoutMs?: number; // max wait (default 10000)
  checkIntervalMs?: number; // poll interval (default 100)
}
