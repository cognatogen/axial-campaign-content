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
  lightArmor: "Light armor", mediumArmor: "Medium armor",
  heavyArmor: "Heavy armor", shield: "Shield"
};

/**
 * Format a PF1e item into d20pfsrd-style wikitext.
 * Handles weapons, equipment (armor/wondrous), consumables, and loot.
 */
export function formatItem(item, imageFilename = null) {
  const s = item.system;
  const lines = [];

  // ========== HEADER ==========
  lines.push(`= ${item.name} =`);

  if (imageFilename) {
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${item.name}]]`);
  }

  // ========== STAT LINE ==========
  // Aura; CL; Slot; Price; Weight
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

  // ========== TYPE-SPECIFIC STATS ==========
  if (item.type === "weapon") {
    lines.push("");
    lines.push(formatWeaponStats(item));
  } else if (item.type === "equipment" && isArmor(item)) {
    lines.push("");
    lines.push(formatArmorStats(item));
  }

  // ========== DESCRIPTION ==========
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push("");
      lines.push(`== Description ==`);
      lines.push(descText);
    }
  }

  // ========== CONSTRUCTION ==========
  if (cl || s.craftingRequirements) {
    lines.push("");
    lines.push(`== Construction Requirements ==`);
    const constructLines = [];
    if (cl) constructLines.push(`'''CL''' ${ordinal(cl)}`);
    constructLines.push(`'''Cost''' ${formatCost(s)}`);
    lines.push(constructLines.join("; "));
  }

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

// --- Weapon-specific formatting ---

function formatWeaponStats(item) {
  const s = item.system;
  const parts = [];

  const weaponType = WEAPON_TYPE_MAP[s.subType] || s.subType || "";
  const weaponSubtype = WEAPON_SUBTYPE_MAP[s.weaponSubtype] || s.weaponSubtype || "";
  if (weaponType || weaponSubtype) {
    parts.push(`'''Type''' ${[weaponType, weaponSubtype].filter(Boolean).join(" ")}`);
  }

  if (s.masterwork) parts.push(`'''Quality''' Masterwork`);
  if (s.enh) parts.push(`'''Enhancement''' +${s.enh}`);

  // Try to get damage from actions
  const actions = s.actions;
  if (actions && actions.length > 0) {
    const action = actions[0];
    const dmgParts = action.damage?.parts || [];
    const dmgStr = dmgParts.map(p => p.formula || p[0] || "").filter(Boolean).join(" + ");
    if (dmgStr) parts.push(`'''Damage''' ${dmgStr}`);
    if (action.attackBonus) parts.push(`'''Attack Bonus''' ${action.attackBonus}`);
  }

  // Material
  const material = s.material?.normal?.value || s.material?.base?.value;
  if (material) parts.push(`'''Material''' ${material}`);

  return parts.join("<br/>\n");
}

// --- Armor-specific formatting ---

function formatArmorStats(item) {
  const s = item.system;
  const parts = [];

  const armorType = ARMOR_TYPE_MAP[s.equipmentSubtype] || s.equipmentSubtype || "";
  if (armorType) parts.push(`'''Type''' ${armorType}`);

  if (s.armor?.value) parts.push(`'''Armor Bonus''' +${s.armor.value}`);
  if (s.armor?.dex != null) parts.push(`'''Max Dex''' +${s.armor.dex}`);
  if (s.armor?.acp) parts.push(`'''Armor Check Penalty''' ${s.armor.acp}`);
  if (s.spellFailure) parts.push(`'''Arcane Spell Failure''' ${s.spellFailure}%`);

  return parts.join("<br/>\n");
}

// --- Helper functions ---

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
    // v13 might store price as an object
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
