import { htmlToWikitext } from "./html-utils.mjs";

const SIZE_MAP = {
  fine: "Fine", dim: "Diminutive", tiny: "Tiny", sm: "Small",
  med: "Medium", lg: "Large", huge: "Huge", grg: "Gargantuan", col: "Colossal",
  // PF1e live documents may use numeric size values
  0: "Fine", 1: "Diminutive", 2: "Tiny", 3: "Small",
  4: "Medium", 5: "Large", 6: "Huge", 7: "Gargantuan", 8: "Colossal"
};

const ALIGNMENT_MAP = {
  lg: "LG", ng: "NG", cg: "CG",
  ln: "LN", tn: "N", cn: "CN",
  le: "LE", ne: "NE", ce: "CE"
};

const ABILITY_TYPE_MAP = {
  ex: "Ex", su: "Su", sp: "Sp", na: ""
};

const SENSE_LABELS = {
  dv: "darkvision", ts: "tremorsense", bs: "blindsense",
  bse: "blindsight", sc: "scent", tr: "truesight"
};

/**
 * Format a PF1e NPC actor into a d20pfsrd-style wikitext stat block.
 * Works with live Foundry documents (computed values available).
 */
export function formatActor(actor, imageFilename = null) {
  const s = actor.system;
  const lines = [];

  const cr = s.details?.cr?.base ?? "?";
  const xp = computeXP(cr);
  const alignment = ALIGNMENT_MAP[s.details?.alignment] || s.details?.alignment || "";
  const rawSize = s.traits?.size;
  const sizeKey = typeof rawSize === "object" ? (rawSize?.value || rawSize?.base || "") : (rawSize || "");
  const size = SIZE_MAP[sizeKey] || sizeKey || "";
  const creatureType = getCreatureType(actor);

  // ========== PARSE BIOGRAPHY ==========
  const { flavorText, imageCaption } = parseBiography(s.details?.biography?.value);

  // ========== HEADER ==========
  // Portrait image (right-aligned thumbnail)
  if (imageFilename) {
    const caption = imageCaption || actor.name;
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${caption}]]`);
  }

  // Open stat block wrapper
  lines.push(`<div class="pointed-statblock" style="font-family:'Roboto'; font-size:14pt;">`);

  // Flavor text from biography (italicized, below header)
  if (flavorText) {
    lines.push(`<p class="pointed-statblock-description" style="font-style:italic;">${flavorText}</p>`);
  }

  // Name/CR header — dark blue with white text
  lines.push(`<p class="pointed-statblock-title" style="font-size:18px; font-weight:bold; background:#1a3c5e; color:white; padding:4px 8px; clear:both;">${actor.name} (CR ${cr})</p>`);

  const headerLines = [];
  if (xp) headerLines.push(`'''XP''' ${xp.toLocaleString()}`);
  headerLines.push([alignment, size, creatureType].filter(Boolean).join(" "));

  const initParts = [];
  const initTotal = actor.system.attributes?.init?.total;
  initParts.push(`'''Init''' ${formatBonus(initTotal ?? 0)}`);
  const senses = formatSenses(s.traits?.senses);
  if (senses) initParts.push(`'''Senses''' ${senses}`);
  const perTotal = getSkillTotal(actor, "per");
  if (perTotal !== null) initParts.push(`'''Perception''' ${formatBonus(perTotal)}`);
  headerLines.push(initParts.join("; "));

  lines.push(headerLines.join("<br/>\n"));

  // ========== DEFENSE ==========
  lines.push(sectionDivider("DEFENSE"));

  const defenseLines = [];

  // AC
  const acNormal = actor.system.attributes?.ac?.normal?.total;
  const acTouch = actor.system.attributes?.ac?.touch?.total;
  const acFF = actor.system.attributes?.ac?.flatFooted?.total;
  if (acNormal != null) {
    let acLine = `'''AC''' ${acNormal}`;
    if (acTouch != null) acLine += `, touch ${acTouch}`;
    if (acFF != null) acLine += `, flat-footed ${acFF}`;
    defenseLines.push(acLine);
  }

  // HP
  const hp = actor.system.attributes?.hp?.max;
  const hd = actor.system.attributes?.hd?.total;
  if (hp != null) {
    let hpLine = `'''hp''' ${hp}`;
    if (hd) hpLine += ` (${hd} HD)`;
    defenseLines.push(hpLine);
  }

  // Saves
  const fort = actor.system.attributes?.savingThrows?.fort?.total;
  const ref = actor.system.attributes?.savingThrows?.ref?.total;
  const will = actor.system.attributes?.savingThrows?.will?.total;
  if (fort != null || ref != null || will != null) {
    defenseLines.push(
      `'''Fort''' ${formatBonus(fort ?? 0)}, '''Ref''' ${formatBonus(ref ?? 0)}, '''Will''' ${formatBonus(will ?? 0)}`
    );
  }

  // Defensive abilities line: DR; Immune; Resist; Weaknesses; SR
  const defensiveParts = [];
  const dr = formatDR(s.traits?.dr);
  if (dr) defensiveParts.push(`'''DR''' ${dr}`);
  const immunities = formatList(s.traits?.di);
  if (immunities) defensiveParts.push(`'''Immune''' ${immunities}`);
  const eres = formatEnergyResist(s.traits?.eres);
  if (eres) defensiveParts.push(`'''Resist''' ${eres}`);
  const vulns = formatList(s.traits?.dv);
  if (vulns) defensiveParts.push(`'''Weaknesses''' ${vulns}`);
  const sr = s.attributes?.sr?.formula || s.attributes?.sr?.total;
  if (sr) defensiveParts.push(`'''SR''' ${sr}`);
  if (defensiveParts.length > 0) defenseLines.push(defensiveParts.join("; "));

  lines.push(defenseLines.join("<br/>\n"));

  // ========== OFFENSE ==========
  lines.push(sectionDivider("OFFENSE"));

  const offenseLines = [];

  // Speed
  const speed = formatSpeed(s.attributes?.speed);
  if (speed) offenseLines.push(`'''Speed''' ${speed}`);

  // Attacks
  const attacks = getItemsByType(actor, "attack");
  const meleeAttacks = attacks.filter(a =>
    a.system?.subType !== "ranged" && a.system?.attackType !== "ranged"
  );
  const rangedAttacks = attacks.filter(a =>
    a.system?.subType === "ranged" || a.system?.attackType === "ranged"
  );
  if (meleeAttacks.length > 0) {
    offenseLines.push(`'''Melee''' ${meleeAttacks.map(a => formatAttack(a, actor)).join(", ")}`);
  }
  if (rangedAttacks.length > 0) {
    offenseLines.push(`'''Ranged''' ${rangedAttacks.map(a => formatAttack(a, actor)).join(", ")}`);
  }

  // Space/Reach
  if (sizeKey && !["med", "sm"].includes(sizeKey)) {
    const spaceReach = getSpaceReach(sizeKey);
    if (spaceReach) offenseLines.push(`'''Space''' ${spaceReach.space} ft.; '''Reach''' ${spaceReach.reach} ft.`);
  }

  // Special Attacks
  const specialAttackFeats = getItemsByType(actor, "feat").filter(f =>
    f.system?.abilityType === "su" || f.system?.abilityType === "sp"
  );
  if (specialAttackFeats.length > 0) {
    offenseLines.push(`'''Special Attacks''' ${specialAttackFeats.map(f => f.name.toLowerCase()).join(", ")}`);
  }

  // Spell-like abilities
  const spellSection = formatSpells(actor);
  if (spellSection) offenseLines.push(spellSection);

  lines.push(offenseLines.join("<br/>\n"));

  // ========== STATISTICS ==========
  lines.push(sectionDivider("STATISTICS"));

  const statLines = [];

  // Ability scores
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  const abilityLine = abilities.map(ab => {
    const val = s.abilities?.[ab]?.value;
    const label = ab.charAt(0).toUpperCase() + ab.slice(1);
    return `'''${label}''' ${val != null ? val : "\u2014"}`;
  }).join(", ");
  statLines.push(abilityLine);

  // BAB; CMB; CMD
  const bab = actor.system.attributes?.bab?.total;
  const cmb = actor.system.attributes?.cmb?.total;
  const cmd = actor.system.attributes?.cmd?.total;
  if (bab != null || cmb != null || cmd != null) {
    const parts = [];
    if (bab != null) parts.push(`'''Base Atk''' ${formatBonus(bab)}`);
    if (cmb != null) parts.push(`'''CMB''' ${formatBonus(cmb)}`);
    if (cmd != null) parts.push(`'''CMD''' ${cmd}`);
    statLines.push(parts.join("; "));
  }

  // Feats
  const feats = getItemsByType(actor, "feat").filter(f =>
    f.system?.subType === "feat" || f.system?.featType === "feat"
  );
  if (feats.length > 0) {
    statLines.push(`'''Feats''' ${feats.map(f => f.name).join(", ")}`);
  }

  // Skills
  const skills = formatSkills(actor);
  if (skills) statLines.push(`'''Skills''' ${skills}`);

  // Languages
  const langs = s.traits?.languages;
  if (langs) {
    const langArr = Array.from(langs);
    if (langArr.length > 0) statLines.push(`'''Languages''' ${langArr.join(", ")}`);
  }

  // SQ
  const sqs = getItemsByType(actor, "feat").filter(f =>
    f.system?.subType !== "feat" && f.system?.featType !== "feat" &&
    f.system?.abilityType === "ex"
  );
  if (sqs.length > 0) {
    statLines.push(`'''SQ''' ${sqs.map(f => f.name.toLowerCase()).join(", ")}`);
  }

  lines.push(statLines.join("<br/>\n"));

  // ========== SPECIAL ABILITIES ==========
  // Only include features (traits, racial traits, templates, class features) — not actual feats
  // Exclude ecology entries (handled separately below)
  const FEATURE_SUBTYPES = ["trait", "racial", "template", "classFeat", "aura", "misc"];
  const specialAbilities = getItemsByType(actor, "feat").filter(f => {
    const sub = f.system?.subType || f.system?.featType || "";
    if (!FEATURE_SUBTYPES.includes(sub)) return false;
    if (!f.system?.description?.value) return false;
    if (isEcologyFeat(f)) return false;
    return true;
  });
  if (specialAbilities.length > 0) {
    lines.push(sectionDivider("SPECIAL ABILITIES"));
    for (const ability of specialAbilities) {
      const abilType = ABILITY_TYPE_MAP[ability.system?.abilityType] || "";
      const typeTag = abilType ? ` (${abilType})` : "";
      const desc = htmlToWikitext(ability.system.description.value).trim();
      lines.push("");
      lines.push(`'''${ability.name}${typeTag}''' ${desc}`);
    }
  }

  // ========== ECOLOGY (always last section) ==========
  const ecologySection = formatEcology(actor);
  if (ecologySection) {
    lines.push(sectionDivider("ECOLOGY"));
    lines.push(ecologySection);
  }

  // Close stat block wrapper
  lines.push(`</div>`);

  // Categories
  lines.push("");
  lines.push(`[[Category:Creatures]]`);
  lines.push(`[[Category:CR ${cr}]]`);
  if (creatureType) lines.push(`[[Category:${creatureType}]]`);

  return {
    title: actor.name,
    wikitext: lines.join("\n")
  };
}

// --- Helper functions ---

function formatBonus(val) {
  if (val == null) return "+0";
  return val >= 0 ? `+${val}` : `${val}`;
}

function formatList(arr) {
  if (!arr) return "";
  const items = Array.from(arr);
  if (items.length === 0) return "";
  return items.join(", ");
}

function formatDR(dr) {
  if (!dr) return "";
  const values = Array.isArray(dr.value) ? dr.value : (dr.value ? Array.from(dr.value) : []);
  if (values.length === 0 && !dr.custom) return "";
  const parts = [];
  for (const entry of values) {
    const types = Array.isArray(entry.types) ? entry.types : (entry.types ? Array.from(entry.types) : []);
    const typeStr = types.join(entry.operator ? " and " : " or ") || "\u2014";
    parts.push(`${entry.amount}/${typeStr}`);
  }
  if (dr.custom) parts.push(dr.custom);
  return parts.join(", ");
}

function formatEnergyResist(eres) {
  if (!eres) return "";
  const values = Array.isArray(eres.value) ? eres.value : (eres.value ? Array.from(eres.value) : []);
  if (values.length === 0 && !eres.custom) return "";
  const parts = [];
  for (const entry of values) {
    const types = Array.isArray(entry.types) ? entry.types : (entry.types ? Array.from(entry.types) : []);
    parts.push(`${types.join(", ") || "?"} ${entry.amount || ""}`);
  }
  if (eres.custom) parts.push(eres.custom);
  return parts.join(", ");
}

function formatSpeed(speed) {
  if (!speed) return "";
  const parts = [];
  if (speed.land?.base) parts.push(`${speed.land.base} ft.`);
  if (speed.climb?.base) parts.push(`climb ${speed.climb.base} ft.`);
  if (speed.swim?.base) parts.push(`swim ${speed.swim.base} ft.`);
  if (speed.burrow?.base) parts.push(`burrow ${speed.burrow.base} ft.`);
  if (speed.fly?.base) {
    const man = speed.fly.maneuverability ? ` (${speed.fly.maneuverability})` : "";
    parts.push(`fly ${speed.fly.base} ft.${man}`);
  }
  return parts.join(", ");
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
  if (senses.ll?.enabled) parts.push("low-light vision");
  if (senses.si) parts.push("see invisibility");
  if (senses.sid) parts.push("see in darkness");
  if (senses.custom) parts.push(senses.custom);
  return parts.join(", ");
}

function formatAttack(attack, actor) {
  const name = attack.name?.toLowerCase() || "attack";
  const actions = attack.system?.actions;
  if (actions && actions.length > 0) {
    const action = actions[0];

    // Compute total attack bonus: BAB + ability mod + extra attackBonus formula
    const atkTotal = computeAttackBonus(actor, action);

    // Primary damage parts
    const dmgParts = action.damage?.parts || [];
    const mainDmg = dmgParts
      .map(p => translateFormula(p.formula || p[0] || ""))
      .filter(Boolean)
      .join(" plus ");

    // Non-multiplying bonus damage (e.g. energy damage that doesn't crit-multiply)
    const nonCritParts = action.damage?.nonCritParts || [];
    const nonCritDmg = nonCritParts
      .map(p => {
        const formula = translateFormula(p.formula || p[0] || "");
        if (!formula) return "";
        const types = p.types || p.type || [];
        const typeArr = Array.isArray(types) ? types : [types];
        const typeLabel = typeArr.filter(Boolean).join(", ");
        return typeLabel ? `${formula} (${typeLabel})` : formula;
      })
      .filter(Boolean);

    // Combine all damage
    const allDmg = [mainDmg, ...nonCritDmg].filter(Boolean).join(" + ");

    if (atkTotal !== null || allDmg) {
      const atkStr = atkTotal !== null ? ` ${formatBonus(atkTotal)}` : "";
      return `${name}${atkStr}${allDmg ? ` (${allDmg})` : ""}`;
    }
  }
  return name;
}

/**
 * Compute the total attack bonus for an action.
 * Uses the actor's BAB + the relevant ability modifier + any extra attackBonus.
 */
function computeAttackBonus(actor, action) {
  if (!actor) return null;
  const bab = actor.system?.attributes?.bab?.total ?? 0;
  const abilKey = action?.ability?.attack || "str";
  const abilMod = actor.system?.abilities?.[abilKey]?.mod ?? 0;
  const extraBonus = parseInt(action?.attackBonus) || 0;
  return bab + abilMod + extraBonus;
}

/**
 * Translate Foundry roll formulas into standard display notation.
 * - sizeRoll(numDice, dieStep, @size, strBonus) → e.g. "1d6+4"
 * - Fixes "ft," → "ft.", "dc" → "DC"
 */
function translateFormula(formula) {
  if (!formula) return "";

  // Translate sizeRoll(numDice, dieStep, @size, strBonus) → NdX+bonus
  let result = formula.replace(
    /sizeRoll\(\s*(\d+)\s*,\s*(\d+)\s*,\s*@size\s*,\s*(\d+)\s*\)/gi,
    (match, numDice, dieStep, bonus) => {
      const dice = `${numDice}d${dieStep}`;
      const b = parseInt(bonus);
      if (b > 0) return `${dice}+${b}`;
      if (b < 0) return `${dice}${b}`;
      return dice;
    }
  );

  // Fix "ft," → "ft." and lowercase "dc" → "DC"
  result = result.replace(/\bft,/g, "ft.");
  result = result.replace(/\bdc\b/gi, "DC");

  return result;
}

function formatSpells(actor) {
  const spellbooks = actor.system?.attributes?.spells?.spellbooks;
  if (!spellbooks) return "";

  const sections = [];
  for (const [key, book] of Object.entries(spellbooks)) {
    if (!book.inUse) continue;
    const bookName = book.name || key;
    const spellItems = getItemsByType(actor, "spell").filter(s => s.system?.spellbook === key);
    if (spellItems.length === 0) continue;

    const clTotal = book.cl?.total || book.cl?.formula || "?";
    const concTotal = book.concentration?.total;
    let header = `'''${bookName}''' (CL ${clTotal}th`;
    if (concTotal != null) header += `; concentration ${formatBonus(concTotal)}`;
    header += `)`;

    // Group spells by level
    const byLevel = {};
    for (const spell of spellItems) {
      const lvl = spell.system?.level ?? 0;
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(spell);
    }

    const spellLines = [];
    const levels = Object.keys(byLevel).sort((a, b) => Number(b) - Number(a));
    for (const lvl of levels) {
      const names = byLevel[lvl].map(s => `''${s.name}''`).join(", ");
      const atWill = byLevel[lvl].some(s => s.system?.atWill);
      const prefix = atWill ? "At will" : `${ordinal(lvl)}`;
      spellLines.push(`: ${prefix}\u2014${names}`);
    }

    sections.push(header + "\n" + spellLines.join("\n"));
  }

  return sections.join("\n\n");
}

function formatSkills(actor) {
  const s = actor.system?.skills;
  if (!s) return "";

  const SKILL_NAMES = {
    acr: "Acrobatics", apr: "Appraise", art: "Artistry", blf: "Bluff",
    clm: "Climb", crf: "Craft", dip: "Diplomacy", dev: "Disable Device",
    dis: "Disguise", esc: "Escape Artist", fly: "Fly", han: "Handle Animal",
    hea: "Heal", int: "Intimidate", kar: "Knowledge (Arcana)",
    kdu: "Knowledge (Dungeoneering)", ken: "Knowledge (Engineering)",
    kge: "Knowledge (Geography)", khi: "Knowledge (History)",
    klo: "Knowledge (Local)", kna: "Knowledge (Nature)",
    kno: "Knowledge (Nobility)", kpl: "Knowledge (Planes)",
    kre: "Knowledge (Religion)", lin: "Linguistics", lor: "Lore",
    per: "Perception", prf: "Perform", pro: "Profession",
    rid: "Ride", sen: "Sense Motive", slt: "Sleight of Hand",
    spl: "Spellcraft", ste: "Stealth", sur: "Survival",
    swm: "Swim", umd: "Use Magic Device"
  };

  const parts = [];
  for (const [key, skill] of Object.entries(s)) {
    if (key === "per") continue; // Perception is in the header
    if (skill.rank > 0 || skill.mod) {
      const total = skill.mod ?? skill.rank ?? 0;
      const name = SKILL_NAMES[key] || key;
      parts.push(`${name} ${formatBonus(total)}`);
    }
  }

  return parts.join(", ");
}

function getItemsByType(actor, type) {
  const items = actor.items?.contents || actor.items || [];
  return items.filter(i => i.type === type).filter(i => !isExcludedFeat(i));
}

/**
 * Exclude feats/features with "Miscellaneous" in the name
 * or "SBC" in the description — these are Foundry-internal only.
 */
function isExcludedFeat(item) {
  if (item.type !== "feat") return false;
  const name = item.name || "";
  if (name.toLowerCase().includes("miscellaneous")) return true;
  const desc = item.system?.description?.value || "";
  if (desc.toUpperCase().includes("SBC")) return true;
  return false;
}

function getCreatureType(actor) {
  const raceItems = getItemsByType(actor, "race");
  if (raceItems.length > 0) return raceItems[0].name;
  const classItems = getItemsByType(actor, "class");
  if (classItems.length > 0) return classItems.map(c => c.name).join("/");
  return "";
}

function getSkillTotal(actor, skillKey) {
  const skill = actor.system?.skills?.[skillKey];
  return skill?.mod ?? null;
}

function getSpaceReach(sizeKey) {
  const table = {
    fine: { space: "1/2", reach: 0 },
    dim: { space: 1, reach: 0 },
    tiny: { space: "2-1/2", reach: 0 },
    lg: { space: 10, reach: 10 },
    huge: { space: 15, reach: 15 },
    grg: { space: 20, reach: 20 },
    col: { space: 30, reach: 30 }
  };
  return table[sizeKey] || null;
}

function computeXP(cr) {
  const xpTable = {
    "1/8": 50, "1/6": 65, "1/4": 100, "1/3": 135, "1/2": 200,
    1: 400, 2: 600, 3: 800, 4: 1200, 5: 1600,
    6: 2400, 7: 3200, 8: 4800, 9: 6400, 10: 9600,
    11: 12800, 12: 19200, 13: 25600, 14: 38400, 15: 51200,
    16: 76800, 17: 102400, 18: 153600, 19: 204800, 20: 307200,
    21: 409600, 22: 614400, 23: 819200, 24: 1228800, 25: 1638400
  };
  return xpTable[cr] || null;
}

/**
 * Parse biography HTML into flavor text and an optional image caption.
 * Any line starting with "Image:" is extracted as the portrait caption.
 * All remaining text becomes italicized flavor at the top of the page.
 */
function parseBiography(bioHtml) {
  if (!bioHtml) return { flavorText: "", imageCaption: "" };

  const bioText = htmlToWikitext(bioHtml).trim();
  if (!bioText) return { flavorText: "", imageCaption: "" };

  const lines = bioText.split(/\n/);
  let imageCaption = "";
  const flavorLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines starting with "Image:" (case-insensitive)
    const imageMatch = trimmed.match(/^Image:\s*(.+)$/i);
    if (imageMatch) {
      imageCaption = imageMatch[1].trim();
    } else if (trimmed) {
      flavorLines.push(trimmed);
    }
  }

  return {
    flavorText: flavorLines.join(" "),
    imageCaption
  };
}

/**
 * Check if a feat/feature is an ecology entry.
 */
function isEcologyFeat(item) {
  const name = (item.name || "").toLowerCase();
  return name.includes("ecology");
}

/**
 * Build the Ecology section from a feat/feature named "Ecology" on the actor.
 * Parses the description for Environment, Organization, Treasure lines,
 * and any additional descriptive text.
 */
function formatEcology(actor) {
  const allItems = actor.items?.contents || actor.items || [];
  const ecoFeat = allItems.find(i =>
    i.type === "feat" && (i.name || "").toLowerCase().includes("ecology")
  );
  if (!ecoFeat || !ecoFeat.system?.description?.value) return "";

  const desc = htmlToWikitext(ecoFeat.system.description.value).trim();
  if (!desc) return "";

  const ecoLines = [];
  const extraLines = [];

  for (const line of desc.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const envMatch = trimmed.match(/^'''?Environment'''?\s*:?\s*(.+)$/i) || trimmed.match(/^Environment\s*:?\s*(.+)$/i);
    const orgMatch = trimmed.match(/^'''?Organization'''?\s*:?\s*(.+)$/i) || trimmed.match(/^Organization\s*:?\s*(.+)$/i);
    const trsMatch = trimmed.match(/^'''?Treasure'''?\s*:?\s*(.+)$/i) || trimmed.match(/^Treasure\s*:?\s*(.+)$/i);

    if (envMatch) {
      ecoLines.push(`'''Environment''' ${envMatch[1].trim()}`);
    } else if (orgMatch) {
      ecoLines.push(`'''Organization''' ${orgMatch[1].trim()}`);
    } else if (trsMatch) {
      ecoLines.push(`'''Treasure''' ${trsMatch[1].trim()}`);
    } else {
      extraLines.push(trimmed);
    }
  }

  // If no structured lines found, treat the whole description as free-form ecology text
  if (ecoLines.length === 0) {
    // Try to use the raw text, splitting on common labels
    const rawText = desc;
    const envIdx = rawText.search(/environment/i);
    const orgIdx = rawText.search(/organization/i);
    const trsIdx = rawText.search(/treasure/i);

    if (envIdx >= 0 || orgIdx >= 0 || trsIdx >= 0) {
      // Has ecology keywords but not on separate lines — extract them
      const envPat = rawText.match(/Environment\s*:?\s*([^;.\n]+)/i);
      const orgPat = rawText.match(/Organization\s*:?\s*([^;.\n]+)/i);
      const trsPat = rawText.match(/Treasure\s*:?\s*([^;.\n]+)/i);
      if (envPat) ecoLines.push(`'''Environment''' ${envPat[1].trim()}`);
      if (orgPat) ecoLines.push(`'''Organization''' ${orgPat[1].trim()}`);
      if (trsPat) ecoLines.push(`'''Treasure''' ${trsPat[1].trim()}`);
    } else {
      // No ecology keywords at all — just output the text
      return desc;
    }
  }

  let result = ecoLines.join("<br/>\n");
  if (extraLines.length > 0) {
    result += "\n\n" + extraLines.join("\n");
  }
  return result;
}

/**
 * Generate a d20pfsrd-style section divider.
 * Renders as uppercase text with thin top/bottom borders.
 */
function sectionDivider(label) {
  return `\n<p class="pointed-statblock-divider" style="font-size:10px; border-top:solid thin; border-bottom:solid thin; text-transform:uppercase; overflow:hidden;">${label}</p>`;
}

function ordinal(n) {
  const num = Number(n);
  if (num === 0) return "0th";
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}
