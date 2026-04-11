import { htmlToWikitext } from "./html-utils.mjs";

const SIZE_MAP = {
  fine: "Fine", dim: "Diminutive", tiny: "Tiny", sm: "Small",
  med: "Medium", lg: "Large", huge: "Huge", grg: "Gargantuan", col: "Colossal"
};

const SENSE_LABELS = {
  dv: "Darkvision", ts: "Tremorsense", bs: "Blindsense",
  bse: "Blindsight", sc: "Scent", tr: "Truesight"
};

/**
 * Format a PF1e race item into d20pfsrd-style wikitext.
 */
export function formatRace(item, imageFilename = null) {
  const s = item.system;
  const lines = [];

  // Portrait image
  if (imageFilename) {
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${item.name}]]`);
  }

  // Open stat block wrapper
  lines.push(`<div class="pointed-statblock">`);

  // Title header — dark blue with white text
  lines.push(titleHeader(item.name));

  // ========== DESCRIPTION ==========
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push(`<p class="pointed-statblock-description" style="font-style:italic;">${descText}</p>`);
    }
  }

  // ========== STANDARD RACIAL TRAITS ==========
  lines.push(sectionDivider("STANDARD RACIAL TRAITS"));

  const traitLines = [];

  // Ability Score Modifiers from changes
  const abilMods = formatAbilityModifiers(s.changes);
  if (abilMods) {
    traitLines.push(`'''Ability Score Modifiers:''' ${abilMods}`);
  }

  // Size
  const size = SIZE_MAP[s.size] || s.size;
  if (size) {
    traitLines.push(`'''Size:''' ${size}`);
  }

  // Type
  const creatureType = s.creatureType || "";
  if (creatureType) {
    traitLines.push(`'''Type:''' ${creatureType}`);
  }

  // Base Speed
  const speed = s.speed?.land?.base || s.speed;
  if (speed) {
    traitLines.push(`'''Base Speed:''' ${typeof speed === "object" ? "30" : speed} ft.`);
  }

  // Senses
  const senses = formatSenses(s.senses);
  if (senses) {
    traitLines.push(`'''Senses:''' ${senses}`);
  }

  // Languages
  const langs = s.languages;
  if (langs) {
    const langArr = Array.isArray(langs) ? langs : Array.from(langs);
    if (langArr.length > 0) {
      traitLines.push(`'''Languages:''' ${langArr.join(", ")}`);
    }
  }

  // Change flags (special vision, etc.)
  const flags = s.changeFlags;
  if (flags) {
    if (flags.lowLightVision) traitLines.push(`'''Low-Light Vision:''' Members of this race can see twice as far as humans in conditions of dim light.`);
    if (flags.seeInvisibility) traitLines.push(`'''See Invisibility:''' Members of this race can see invisible creatures.`);
    if (flags.seeInDarkness) traitLines.push(`'''See in Darkness:''' Members of this race can see perfectly in darkness of any kind.`);
  }

  // Racial modifiers from changes
  const otherChanges = formatOtherChanges(s.changes);
  for (const change of otherChanges) {
    traitLines.push(`'''${change.name}:''' ${change.description}`);
  }

  if (traitLines.length > 0) {
    lines.push(traitLines.join("<br/>\n"));
  }

  // ========== RACIAL ABILITIES ==========
  const contextNotes = s.contextNotes;
  if (contextNotes && contextNotes.length > 0) {
    lines.push(sectionDivider("RACIAL ABILITIES"));
    const abilityLines = [];
    for (const note of contextNotes) {
      if (note.text) {
        abilityLines.push(`'''${note.text}'''`);
      }
    }
    lines.push(abilityLines.join("<br/>\n"));
  }

  // Close stat block wrapper
  lines.push(`</div>`);

  // Categories
  lines.push("");
  lines.push(`[[Category:Races]]`);
  if (size) lines.push(`[[Category:${size} Races]]`);

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

function formatAbilityModifiers(changes) {
  if (!changes || changes.length === 0) return "";

  const ABILITY_NAMES = {
    str: "Strength", dex: "Dexterity", con: "Constitution",
    int: "Intelligence", wis: "Wisdom", cha: "Charisma"
  };

  const mods = [];
  for (const change of changes) {
    const target = change.subTarget || change.target || "";
    for (const [key, name] of Object.entries(ABILITY_NAMES)) {
      if (target.toLowerCase().includes(key)) {
        const val = change.formula || change.value || 0;
        const num = parseInt(val);
        if (num) {
          mods.push(`${num >= 0 ? "+" : ""}${num} ${name}`);
        }
        break;
      }
    }
  }

  return mods.join(", ");
}

function formatSenses(senses) {
  if (!senses) return "";
  const parts = [];
  for (const [key, label] of Object.entries(SENSE_LABELS)) {
    const sense = senses[key];
    if (sense?.value && sense.value > 0) {
      parts.push(`${label} ${sense.value} ft.`);
    }
  }
  if (senses.ll?.enabled) parts.push("Low-Light Vision");
  if (senses.custom) parts.push(senses.custom);
  return parts.join(", ");
}

function formatOtherChanges(changes) {
  if (!changes || changes.length === 0) return [];

  const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
  const results = [];

  for (const change of changes) {
    const target = change.subTarget || change.target || "";
    const isAbility = ABILITY_KEYS.some(k => target.toLowerCase().includes(k));
    if (isAbility) continue;

    const formula = change.formula || change.value || "";
    if (!formula) continue;

    const modifier = change.modifier || change.type || "";
    results.push({
      name: target || "Racial Modifier",
      description: `${formula}${modifier ? ` ${modifier}` : ""} bonus`
    });
  }

  return results;
}
