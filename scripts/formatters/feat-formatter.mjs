import { htmlToWikitext } from "./html-utils.mjs";

const FEAT_TYPE_MAP = {
  feat: "General", combat: "Combat", critical: "Critical",
  metamagic: "Metamagic", teamwork: "Teamwork", creation: "Item Creation",
  grit: "Grit", style: "Style", performance: "Performance",
  racial: "Racial", companion: "Companion", mythic: "Mythic",
  story: "Story", stare: "Stare", conduit: "Conduit",
  panache: "Panache", betrayal: "Betrayal", targeting: "Targeting",
  esoteric: "Esoteric", monster: "Monster"
};

const ABILITY_TYPE_LABELS = {
  ex: "Extraordinary", su: "Supernatural", sp: "Spell-Like", na: ""
};

/**
 * Format a PF1e feat into d20pfsrd-style wikitext.
 * Also handles racial traits and class features.
 */
export function formatFeat(item, imageFilename = null) {
  const s = item.system;
  const lines = [];

  // Portrait image
  if (imageFilename) {
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${item.name}]]`);
  }

  // Open stat block wrapper
  lines.push(`<div class="pointed-statblock">`);

  // ========== HEADER ==========
  const featType = FEAT_TYPE_MAP[s.subType] || FEAT_TYPE_MAP[s.featType] || "";
  const abilType = ABILITY_TYPE_LABELS[s.abilityType] || "";

  let titleSuffix = "";
  if (featType) titleSuffix = ` (${featType})`;
  else if (abilType) titleSuffix = ` (${abilType})`;

  // Title header — dark blue with white text
  lines.push(titleHeader(`${item.name}${titleSuffix}`));

  // ========== FLAVOR / DESCRIPTION ==========
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      // First sentence or paragraph as italic flavor, rest as benefit
      const { flavor, benefit } = splitDescription(descText);
      if (flavor) {
        lines.push(`<p class="pointed-statblock-description" style="font-style:italic;">${flavor}</p>`);
      }
      if (benefit) {
        lines.push("");
        lines.push(`'''Benefit:''' ${benefit}`);
      }
    }
  }

  // ========== PREREQUISITES ==========
  const prereqs = formatPrerequisites(item);
  if (prereqs) {
    lines.push("");
    lines.push(`'''Prerequisite(s):''' ${prereqs}`);
  }

  // ========== CONTEXT NOTES (additional benefits) ==========
  const contextNotes = s.contextNotes;
  if (contextNotes && contextNotes.length > 0) {
    const noteTexts = contextNotes.map(n => n.text).filter(Boolean);
    if (noteTexts.length > 0) {
      lines.push("");
      lines.push(`'''Special:''' ${noteTexts.join("; ")}`);
    }
  }

  // ========== MECHANICAL EFFECTS ==========
  const changes = s.changes;
  if (changes && changes.length > 0) {
    const changeParts = changes
      .map(c => formatChange(c))
      .filter(Boolean);
    if (changeParts.length > 0) {
      lines.push("");
      lines.push(`'''Mechanical Effects:'''`);
      for (const part of changeParts) {
        lines.push(`* ${part}`);
      }
    }
  }

  // ========== SPECIAL (CR offset, etc.) ==========
  if (s.crOffset) {
    lines.push("");
    lines.push(`'''Special:''' CR offset ${s.crOffset >= 0 ? "+" : ""}${s.crOffset}`);
  }

  // Close stat block wrapper
  lines.push(`</div>`);

  // Categories
  lines.push("");
  lines.push(`[[Category:Feats]]`);
  if (featType) lines.push(`[[Category:${featType} Feats]]`);

  return {
    title: item.name,
    wikitext: lines.join("\n")
  };
}

// --- Helper functions ---

function titleHeader(name) {
  return `<p class="pointed-statblock-title" style="font-size:18px; font-weight:bold; background:#1a3c5e; color:white; padding:4px 8px;">${name}</p>`;
}

/**
 * Split description text into a short flavor line and the remaining benefit text.
 * If the description is short (one sentence/paragraph), treat it all as benefit.
 */
function splitDescription(text) {
  // If there's a clear paragraph break, first paragraph is flavor
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length > 1) {
    return {
      flavor: paragraphs[0].trim(),
      benefit: paragraphs.slice(1).join("\n\n").trim()
    };
  }
  // Single block — treat the whole thing as benefit text
  return { flavor: "", benefit: text };
}

function formatPrerequisites(item) {
  const s = item.system;
  const parts = [];

  // Check associations for class requirements
  if (s.associations?.classes) {
    for (const cls of s.associations.classes) {
      if (cls.name) parts.push(cls.name);
    }
  }

  // Check feat prerequisites from links
  if (s.links?.children) {
    for (const link of s.links.children) {
      if (link.name) parts.push(link.name);
    }
  }

  return parts.length > 0 ? parts.join(", ") : "";
}

function formatChange(change) {
  if (!change.formula && !change.value) return "";
  const formula = change.formula || change.value || "";
  const target = change.subTarget || change.target || "";
  const type = change.modifier || change.type || "";

  const parts = [];
  if (formula) parts.push(formula);
  if (type) parts.push(type);
  if (target) parts.push(`to ${target}`);

  return parts.join(" ");
}
