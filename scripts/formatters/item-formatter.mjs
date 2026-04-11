import { htmlToWikitext } from "./html-utils.mjs";

const SCHOOL_MAP = {
  abj: "Abjuration", con: "Conjuration", div: "Divination",
  enc: "Enchantment", evo: "Evocation", ill: "Illusion",
  nec: "Necromancy", trs: "Transmutation", uni: "Universal"
};

const SLOT_MAP = {
  armor: "Armor", belt: "Belt", body: "Body", chest: "Chest",
  eyes: "Eyes", feet: "Feet", hands: "Hands", head: "Head",
  headband: "Headband", neck: "Neck", ring: "Ring",
  shield: "Shield", shoulders: "Shoulders", wrists: "Wrists",
  slotless: "None (slotless)"
};

const WEAPON_SUBTYPE_MAP = {
  light: "Light melee", "1hMelee": "One-handed melee",
  "2hMelee": "Two-handed melee", ranged: "Ranged",
  splash: "Splash", misc: "Miscellaneous"
};

const WEAPON_TYPE_MAP = {
  simple: "Simple", martial: "Martial", exotic: "Exotic", misc: "Miscellaneous"
};

const ARMOR_TYPE_MAP = {
  lightArmor: "Light Armor", mediumArmor: "Medium Armor",
  heavyArmor: "Heavy Armor", shield: "Shield"
};

/**
 * Format a PF1e item into d20pfsrd-style wikitext.
 * Handles weapons, equipment (armor/wondrous), consumables, and loot.
 */
export function formatItem(item, imageFilename = null) {
  const s = item.system;
  const lines = [];

  // Portrait image
  if (imageFilename) {
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${item.name}]]`);
  }

  // Open stat block wrapper
  lines.push(`<div class="pointed-statblock">`);

  // ========== TYPE-SPECIFIC FORMATTING ==========
  if (item.type === "weapon") {
    formatWeaponBlock(lines, item);
  } else if (item.type === "equipment" && isArmor(item)) {
    formatArmorBlock(lines, item);
  } else {
    // Magic items, wondrous items, consumables, loot
    formatMagicItemBlock(lines, item);
  }

  // Close stat block wrapper
  lines.push(`</div>`);

  // Categories
  lines.push("");
  const categories = getItemCategories(item);
  for (const cat of categories) {
    lines.push(`[[Category:${cat}]]`);
  }

  return {
    title: item.name,
    wikitext: lines.join("\n")
  };
}

// --- Weapon formatting (d20pfsrd style) ---

function formatWeaponBlock(lines, item) {
  const s = item.system;

  // Title header
  lines.push(titleHeader(item.name));

  // Stats block — all in one section with <br/> between lines
  const statLines = [];

  const price = formatPrice(s);
  const weight = s.weight?.value;
  const priceLine = [];
  if (price) priceLine.push(`'''Cost''' ${price}`);
  if (weight) priceLine.push(`'''Weight''' ${weight} lb${weight !== 1 ? "s" : ""}.`);
  if (priceLine.length > 0) statLines.push(priceLine.join(" "));

  // Damage and critical
  const dmgLine = [];
  const actions = s.actions;
  if (actions && actions.length > 0) {
    const action = actions[0];
    const dmgParts = action.damage?.parts || [];
    const dmgStr = dmgParts.map(p => p.formula || p[0] || "").filter(Boolean).join(" + ");
    if (dmgStr) dmgLine.push(`'''Damage''' ${dmgStr}`);
  }
  if (s.ability?.critRange) dmgLine.push(`'''Critical''' ${s.ability.critRange}/x${s.ability.critMult || 2}`);
  else if (s.ability?.critMult && s.ability.critMult > 2) dmgLine.push(`'''Critical''' x${s.ability.critMult}`);
  // Damage types
  const damageTypes = s.damageTypes || [];
  if (damageTypes.length > 0) dmgLine.push(`'''Type''' ${damageTypes.join(" or ")}`);
  if (dmgLine.length > 0) statLines.push(dmgLine.join(" "));

  // Category and proficiency
  const catLine = [];
  const weaponSubtype = WEAPON_SUBTYPE_MAP[s.weaponSubtype] || s.weaponSubtype || "";
  if (weaponSubtype) catLine.push(`'''Category''' ${weaponSubtype}`);
  const weaponType = WEAPON_TYPE_MAP[s.subType] || s.subType || "";
  if (weaponType) catLine.push(`'''Proficiency''' ${weaponType}`);
  if (catLine.length > 0) statLines.push(catLine.join(" "));

  // Enhancement / masterwork / material
  const qualLine = [];
  if (s.masterwork) qualLine.push(`'''Quality''' Masterwork`);
  if (s.enh) qualLine.push(`'''Enhancement''' +${s.enh}`);
  const material = s.material?.normal?.value || s.material?.base?.value;
  if (material) qualLine.push(`'''Material''' ${material}`);
  if (qualLine.length > 0) statLines.push(qualLine.join(" "));

  lines.push(statLines.join("<br/>\n"));

  // Description
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push("");
      lines.push(descText);
    }
  }
}

// --- Armor formatting (d20pfsrd style) ---

function formatArmorBlock(lines, item) {
  const s = item.system;

  // Title header
  lines.push(titleHeader(item.name));

  const statLines = [];

  // Armor type on its own line
  const armorType = ARMOR_TYPE_MAP[s.equipmentSubtype] || s.equipmentSubtype || "";
  if (armorType) statLines.push(`'''${armorType}'''`);

  // Cost and weight
  const priceLine = [];
  const price = formatPrice(s);
  if (price) priceLine.push(`'''Cost''' ${price}`);
  const weight = s.weight?.value;
  if (weight) priceLine.push(`'''Weight''' ${weight} lb${weight !== 1 ? "s" : ""}.`);
  if (priceLine.length > 0) statLines.push(priceLine.join("; "));

  // Armor bonus, max dex, ACP
  const armorStats = [];
  if (s.armor?.value) armorStats.push(`'''Armor Bonus''' +${s.armor.value}`);
  if (s.armor?.dex != null) armorStats.push(`'''Max Dex Bonus''' +${s.armor.dex}`);
  if (s.armor?.acp) armorStats.push(`'''Armor Check Penalty''' ${s.armor.acp}`);
  if (armorStats.length > 0) statLines.push(armorStats.join("; "));

  // Spell failure and speed
  const miscLine = [];
  if (s.spellFailure) miscLine.push(`'''Arcane Spell Failure Chance''' ${s.spellFailure}%`);
  // Speed adjustments based on armor type
  if (s.equipmentSubtype === "mediumArmor") miscLine.push(`'''Speed''' 20 ft./15 ft.`);
  else if (s.equipmentSubtype === "heavyArmor") miscLine.push(`'''Speed''' 20 ft./15 ft.`);
  else if (s.equipmentSubtype === "lightArmor") miscLine.push(`'''Speed''' 30 ft./20 ft.`);
  if (miscLine.length > 0) statLines.push(miscLine.join("; "));

  // Enhancement / material
  const qualLine = [];
  if (s.masterwork) qualLine.push(`'''Quality''' Masterwork`);
  if (s.enh) qualLine.push(`'''Enhancement''' +${s.enh}`);
  const material = s.material?.normal?.value || s.material?.base?.value;
  if (material) qualLine.push(`'''Material''' ${material}`);
  if (qualLine.length > 0) statLines.push(qualLine.join("; "));

  lines.push(statLines.join("<br/>\n"));

  // Description
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push("");
      lines.push(descText);
    }
  }
}

// --- Magic Item / Wondrous Item formatting (d20pfsrd style) ---

function formatMagicItemBlock(lines, item) {
  const s = item.system;

  // Title header
  lines.push(titleHeader(item.name));

  // Stat line: Aura; CL; Slot; Price; Weight — all on one line with semicolons
  const statParts = [];

  const aura = formatAura(s);
  if (aura) statParts.push(`'''Aura''' ${aura}`);

  const cl = s.cl;
  if (cl) statParts.push(`'''CL''' ${ordinal(cl)}`);

  const slot = formatSlot(item);
  if (slot) statParts.push(`'''Slot''' ${slot}`);

  const price = formatPrice(s);
  if (price) statParts.push(`'''Price''' ${price}`);

  const weight = s.weight?.value;
  if (weight) statParts.push(`'''Weight''' ${weight} lb${weight !== 1 ? "s" : ""}.`);

  if (statParts.length > 0) {
    lines.push(statParts.join("; "));
  }

  // Description
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push(sectionDivider("DESCRIPTION"));
      lines.push(`<p class="pointed-statblock-description" style="font-style:italic;">${descText}</p>`);
    }
  }

  // Construction requirements
  if (cl || s.craftingRequirements) {
    lines.push(sectionDivider("CONSTRUCTION REQUIREMENTS"));
    const constructLines = [];
    if (cl) constructLines.push(`'''CL''' ${ordinal(cl)}`);
    constructLines.push(`'''Cost''' ${formatCost(s)}`);
    lines.push(constructLines.join("; "));
  }
}

// --- Shared helper functions ---

function titleHeader(name) {
  return `<p class="pointed-statblock-title" style="font-size:18px; font-weight:bold; background:#1a3c5e; color:white; padding:4px 8px;">${name}</p>`;
}

function sectionDivider(label) {
  return `\n<p class="pointed-statblock-divider" style="font-size:10px; border-top:solid thin; border-bottom:solid thin; text-transform:uppercase; overflow:hidden;">${label}</p>`;
}

function formatAura(s) {
  if (s.aura?.school) {
    const school = SCHOOL_MAP[s.aura.school] || s.aura.school;
    return school.toLowerCase();
  }
  if (s.aura?.custom) return s.aura.custom;
  return "";
}

function formatSlot(item) {
  const s = item.system;
  if (item.type === "weapon") return "None (held)";
  if (item.type === "equipment") {
    return SLOT_MAP[s.slot] || s.slot || "None";
  }
  return "None (slotless)";
}

function formatPrice(s) {
  const price = s.price;
  if (!price) return "";
  if (typeof price === "object") {
    return price.value ? `${price.value.toLocaleString()} gp` : "";
  }
  return `${Number(price).toLocaleString()} gp`;
}

function formatCost(s) {
  const price = typeof s.price === "object" ? (s.price.value || 0) : (s.price || 0);
  const cost = Math.floor(Number(price) / 2);
  return cost > 0 ? `${cost.toLocaleString()} gp` : "";
}

function isArmor(item) {
  const subtype = item.system?.equipmentSubtype;
  return ["lightArmor", "mediumArmor", "heavyArmor", "shield"].includes(subtype);
}

function getItemCategories(item) {
  const cats = [];
  switch (item.type) {
    case "weapon": cats.push("Weapons"); break;
    case "equipment":
      if (isArmor(item)) cats.push("Armor");
      else cats.push("Wondrous Items");
      break;
    case "consumable": cats.push("Consumables"); break;
    case "loot": cats.push("Loot"); break;
    default: cats.push("Items");
  }
  return cats;
}

function ordinal(n) {
  const num = Number(n);
  if (num === 0) return "0th";
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}
