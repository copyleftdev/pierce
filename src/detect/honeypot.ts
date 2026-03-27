/**
 * Honeypot Detection
 *
 * Identifies trap form fields that are hidden from real users but filled by bots.
 * Uses computed visibility exclusively — never class names or attribute strings.
 */
import type { BrowserHandle } from "../adapter/types.js";
import type { FormField } from "../types.js";
import { checkVisibility } from "./visibility.js";

export interface HoneypotResult {
  realFields: FormField[];
  trapFields: FormField[];
}

/**
 * Analyze a form (or all forms on page) and separate real fields from traps.
 */
export async function detectHoneypots(
  handle: BrowserHandle,
  formSelector?: string
): Promise<HoneypotResult> {
  const selector = formSelector
    ? `${formSelector} input, ${formSelector} select, ${formSelector} textarea`
    : "form input, form select, form textarea";

  const elements = await checkVisibility(handle, selector);

  const realFields: FormField[] = [];
  const trapFields: FormField[] = [];

  for (const el of elements) {
    const field: FormField = {
      tag: el.tag,
      type: el.type,
      name: el.name,
      placeholder: "", // filled below
      required: false,
      visible: el.visible,
    };

    if (el.visible) {
      realFields.push(field);
    } else {
      trapFields.push(field);
    }
  }

  return { realFields, trapFields };
}
