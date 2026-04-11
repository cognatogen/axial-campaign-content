import { htmlToWikitext } from "./html-utils.mjs";

const SCHOOL_MAP = {
  abj: "Abjuration", con: "Conjuration", div: "Divination",
  enc: "Enchantment", evo: "Evocation", ill: "Illusion",
  nec: "Necromancy", trs: "Transmutation", uni: "Universal"
};

const CLASS_MAP = {
  wizard: "Wizard/Sorcerer", sorcerer: "Wizard/Sorcerer",
  cleric: "Cleric", druid: "Druid", bard: "Bard",
  paladin: "Paladin", ranger: "Ranger", witch: "Witch",
  magus: "Magus", alchemist: "Alchemist", summoner: "Summoner",
  inquisitor: "Inquisitor", oracle: "Oracle", antipaladin: "Antipaladin",
  bloodrager: "Bloodrager", shaman: "Shaman", psychic: "Psychic",
  medium: "Medium", mesmerist: "Mesmerist", occultist: "Occultist",
  spiritualist: "Spiritualist", hunter: "Hunter", skald: "Skald",
  investigator: "Investigator", warpriest: "Warpriest", arcanist: "Arcanist"
};

/**
 * Format a PF1e spell into d20pfsrd-style wikitext.
 */
export function formatSpell(item, imageFilename = null) {
  const s = item.system;
  const lines = [];

  // Portrait image
  if (imageFilename) {
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${item.name}]]`);
  }

  // Open stat block wrapper
  lines.push(`<div class="pointed-statblock">`);

  // Title header — dark blue with white text (matches actor formatter)
  lines.push(titleHeader(item.name));

  // ========== SCHOOL & LEVEL LINE ==========
  const schoolLine = [];

  // School [subschool] [descriptors]
  const school = SCHOOL_MAP[s.school] || s.school || "";
  let schoolStr = `'''School''' ${school.toLowerCase()}`;
  if (s.subschool && s.subschool.length > 0) {
    schoolStr += ` (${s.subschool.join(", ")})`;
  }
  if (s.descriptors && s.descriptors.length > 0) {
    const descArr = Array.from(s.descriptors);
    if (descArr.length > 0) schoolStr += ` [${descArr.join(", ")}]`;
  }
  schoolLine.push(schoolStr);

  // Level - from learnedAt.class
  const levelParts = formatSpellLevels(s);
  if (levelParts) schoolLine.push(`'''Level''' ${levelParts}`);

  lines.push(schoolLine.join("; "));

  // ========== CASTING ==========
  lines.push(sectionDivider("CASTING"));

  const castingLines = [];

  // Casting Time
  const actions = s.actions;
  if (actions && actions.length > 0 && actions[0].activation?.type) {
    const actType = actions[0].activation.type;
    const actCost = actions[0].activation.cost || 1;
    castingLines.push(`'''Casting Time''' ${actCost} ${actType}`);
  } else {
    castingLines.push(`'''Casting Time''' 1 standard action`);
  }

  // Components
  const components = formatComponents(s);
  if (components) castingLines.push(`'''Components''' ${components}`);

  lines.push(castingLines.join("<br/>\n"));

  // ========== EFFECT ==========
  lines.push(sectionDivider("EFFECT"));

  const effectLines = [];

  if (actions && actions.length > 0) {
    const action = actions[0];
    if (action.measureTemplate?.type) {
      const tmpl = action.measureTemplate;
      effectLines.push(`'''Area''' ${tmpl.size || ""} ft. ${tmpl.type || ""}`);
    }
    if (action.range?.value) {
      effectLines.push(`'''Range''' ${action.range.value} ft.`);
    } else if (action.range?.units) {
      effectLines.push(`'''Range''' ${action.range.units}`);
    }
    if (action.duration?.value) {
      effectLines.push(`'''Duration''' ${action.duration.value}`);
    }
    if (action.save?.type) {
      let saveLine = `'''Saving Throw''' ${action.save.type}`;
      if (action.save.description) saveLine += ` ${action.save.description}`;
      saveLine += `; '''Spell Resistance''' ${s.sr ? "yes" : "no"}`;
      effectLines.push(saveLine);
    } else {
      effectLines.push(`'''Spell Resistance''' ${s.sr ? "yes" : "no"}`);
    }
  }

  if (effectLines.length > 0) {
    lines.push(effectLines.join("<br/>\n"));
  }

  // ========== DESCRIPTION ==========
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push(sectionDivider("DESCRIPTION"));
      lines.push(`<p class="pointed-statblock-description" style="font-style:italic;">${descText}</p>`);
    }
  }

  // Close stat block wrapper
  lines.push(`</div>`);

  // Categories
  lines.push("");
  lines.push(`[[Category:Spells]]`);
  if (school) lines.push(`[[Category:${school} spells]]`);
  lines.push(`[[Category:Level ${s.level || 0} spells]]`);

  return {
    title: item.name,
    wikitext: lines.join("\n")
  };
}

// --- Helper functions ---

function titleHeader(name) {
  return `<p class="pointed-statblock-title" style="font-size:18px; font-weight:bold; background:#1a3c5e; color:white; padding:4px 8px;">${name}</p>`;
}

function sectionDivider(label) {
  return `\n<p class="pointed-statblock-divider" style="font-size:10px; border-top:solid thin; border-bottom:solid thin; text-transform:uppercase; overflow:hidden;">${label}</p>`;
}

function formatSpellLevels(s) {
  const learnedAt = s.learnedAt?.class;
  if (!learnedAt || typeof learnedAt !== "object") {
    return `${s.level || 0}`;
  }

  const parts = [];
  for (const [cls, lvl] of Object.entries(learnedAt)) {
    const className = CLASS_MAP[cls.toLowerCase()] || cls;
    parts.push(`${className} ${lvl}`);
  }

  if (parts.length === 0) return `${s.level || 0}`;
  return parts.join(", ");
}

function formatComponents(s) {
  const comp = s.components;
  if (!comp) return "";

  const parts = [];
  if (comp.verbal) parts.push("V");
  if (comp.somatic) parts.push("S");
  if (comp.material) parts.push("M");
  if (comp.focus) parts.push("F");
  if (comp.thought) parts.push("T");
  if (comp.emotion) parts.push("E");
  if (comp.divineFocus === 1) parts.push("DF");

  let result = parts.join(", ");

  // Add material/focus descriptions
  const extras = [];
  if (s.materials?.value) extras.push(s.materials.value);
  if (s.materials?.focus) extras.push(s.materials.focus);
  if (extras.length > 0) result += ` (${extras.join("; ")})`;

  return result;
}
