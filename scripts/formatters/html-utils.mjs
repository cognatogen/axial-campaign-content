/**
 * Convert HTML string to MediaWiki wikitext markup.
 * Uses DOMParser for reliable parsing.
 */
export function htmlToWikitext(html) {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return walkNode(doc.body).trim();
}

function walkNode(node) {
  let result = "";

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent;
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = child.tagName.toLowerCase();
    const inner = walkNode(child);

    switch (tag) {
      case "p":
        result += `\n\n${inner}`;
        break;
      case "br":
        result += "\n";
        break;
      case "strong":
      case "b":
        result += `'''${inner}'''`;
        break;
      case "em":
      case "i":
        result += `''${inner}''`;
        break;
      case "ul":
        result += "\n" + inner;
        break;
      case "ol":
        result += "\n" + inner;
        break;
      case "li":
        // Determine list type from parent
        if (child.parentElement?.tagName.toLowerCase() === "ol") {
          result += `# ${inner.trim()}\n`;
        } else {
          result += `* ${inner.trim()}\n`;
        }
        break;
      case "a":
        const href = child.getAttribute("href");
        if (href) {
          result += `[${href} ${inner}]`;
        } else {
          result += inner;
        }
        break;
      case "h1":
        result += `\n= ${inner.trim()} =\n`;
        break;
      case "h2":
        result += `\n== ${inner.trim()} ==\n`;
        break;
      case "h3":
        result += `\n=== ${inner.trim()} ===\n`;
        break;
      case "h4":
        result += `\n==== ${inner.trim()} ====\n`;
        break;
      case "hr":
        result += "\n----\n";
        break;
      case "div":
      case "span":
      case "section":
      case "pre":
        result += inner;
        break;
      default:
        // Strip unknown tags, keep content
        result += inner;
        break;
    }
  }

  return result;
}
