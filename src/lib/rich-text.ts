import sanitizeHtml from "sanitize-html";

/**
 * Opgemaakte tekst uit de teksteditor (Tiptap) wordt als HTML opgeslagen. Bij het tonen én opslaan
 * wordt die HTML opgeschoond: alleen eenvoudige opmaak blijft over, scripts en stijlen verdwijnen.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "a", "hr", "code"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    h1: "h2",
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const out: sanitizeHtml.Attributes = { href };
      if (/^https?:\/\//i.test(href)) {
        out.target = "_blank";
        out.rel = "noopener noreferrer";
      }
      return { tagName, attribs: out };
    },
  },
  exclusiveFilter: (frame) => frame.tag === "a" && !frame.attribs.href,
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}

/** Herkent HTML uit de editor; oudere teksten zijn platte tekst. */
export function isRichText(value: string): boolean {
  return /^\s*<(p|h[1-6]|ul|ol|blockquote|div)[\s>]/i.test(value);
}

/** Platte tekst (voor samenvattingen, e-mails en zoekmachines). */
export function richTextToPlain(value: string): string {
  if (!isRichText(value)) return value.trim();
  return sanitizeHtml(value.replace(/<\/(p|h[1-6]|li|blockquote)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n"), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Lege editor-inhoud ("<p></p>") telt als leeg. */
export function isRichTextEmpty(value: string): boolean {
  return richTextToPlain(value).length === 0;
}
