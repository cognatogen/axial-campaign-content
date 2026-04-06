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

  // ========== HEADER ==========
  const featType = FEAT_TYPE_MAP[s.subType] || FEAT_TYPE_MAP[s.featType] || "";
  const abilType = ABILITY_TYPE_LABELS[s.abilityType] || "";

  let titleSuffix = "";
  if (featType) titleSuffix = ` (${featType})`;
  else if (abilType) titleSuffix = ` (${abilType})`;

  lines.push(`= ${item.name}${titleSuffix} =`);

  if (imageFilename) {
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${item.name}]]`);
  }

  // ========== DESCRIPTION / FLAVOR ==========
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push("");
      lines.push(descText);
    }
  }

  // ========== PREREQUISITES ==========
  const prereqs = formatPrerequisites(item);
  if (prereqs) {
    lines.push("");
    lines.push(`'''Prerequisite(s):''' ${prereqs}`);
  }

  // ========== BENEFIT ==========
  // For feats, the description IS the benefit in most cases.
  // If there are context notes, list them as additional benefits.
  const contextNotes = s.contextNotes;
  if (contextNotes && contextNotes.length > 0) {
    const noteTexts = contextNotes.map(n => n.text).filter(Boolean);
    if (noteTexts.length > 0) {
      lines.push("");
      lines.push(`'''Benefit(s):''' ${noteTexts.join("; ")}`);
    }
  }

  // ========== CHANGES / MECHANICAL EFFECTS ==========
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

  // ========== SPECIAL ==========
  if (s.crOffset) {
    lines.push("");
    lines.push(`'''Special:''' CR offset ${s.crOffset >= 0 ? "+" : ""}${s.crOffset}`);
  }

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
