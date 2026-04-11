import { htmlToWikitext } from "./html-utils.mjs";

const BAB_PROGRESSION = {
  high: { label: "Full", values: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20] },
  med: { label: "3/4", values: [0,1,2,3,3,4,5,6,6,7,8,9,9,10,11,12,12,13,14,15] },
  low: { label: "1/2", values: [0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10] }
};

const SAVE_PROGRESSION = {
  high: [2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12],
  low: [0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6]
};

const HD_MAP = {
  6: "d6", 8: "d8", 10: "d10", 12: "d12"
};

/**
 * Format a PF1e class item into d20pfsrd-style wikitext.
 */
export function formatClass(item, imageFilename = null) {
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

  // ========== CLASS OVERVIEW ==========
  lines.push(sectionDivider("CLASS OVERVIEW"));

  const overviewLines = [];

  // Hit Die
  const hd = s.hd || s.hitDice;
  if (hd) {
    const hdStr = HD_MAP[hd] || `d${hd}`;
    overviewLines.push(`'''Hit Die:''' ${hdStr}`);
  }

  // BAB progression
  const bab = s.bab || s.babFormula;
  if (bab) {
    const babLabel = BAB_PROGRESSION[bab]?.label || bab;
    overviewLines.push(`'''Base Attack Bonus:''' ${babLabel} progression`);
  }

  // Saves
  const savingThrows = s.savingThrows;
  if (savingThrows) {
    const saveParts = [];
    if (savingThrows.fort?.value) saveParts.push(`Fort ${savingThrows.fort.value}`);
    if (savingThrows.ref?.value) saveParts.push(`Ref ${savingThrows.ref.value}`);
    if (savingThrows.will?.value) saveParts.push(`Will ${savingThrows.will.value}`);
    if (saveParts.length > 0) {
      overviewLines.push(`'''Good Saves:''' ${saveParts.join(", ")}`);
    }
  }

  // Skill Ranks Per Level
  const skillsPerLevel = s.skillsPerLevel;
  if (skillsPerLevel) {
    overviewLines.push(`'''Skill Ranks Per Level:''' ${skillsPerLevel} + Int modifier`);
  }

  if (overviewLines.length > 0) {
    lines.push(overviewLines.join("<br/>\n"));
  }

  // ========== PROFICIENCIES ==========
  const armorProf = s.armorProf;
  const weaponProf = s.weaponProf;
  if (armorProf || weaponProf) {
    lines.push(sectionDivider("WEAPON AND ARMOR PROFICIENCY"));

    const profLines = [];

    if (weaponProf) {
      const wpParts = [];
      if (weaponProf.value) wpParts.push(...Array.from(weaponProf.value));
      if (weaponProf.custom) wpParts.push(weaponProf.custom);
      if (wpParts.length > 0) {
        profLines.push(`'''Weapon Proficiencies:''' ${wpParts.join(", ")}`);
      }
    }

    if (armorProf) {
      const apParts = [];
      if (armorProf.value) apParts.push(...Array.from(armorProf.value));
      if (armorProf.custom) apParts.push(armorProf.custom);
      if (apParts.length > 0) {
        profLines.push(`'''Armor Proficiencies:''' ${apParts.join(", ")}`);
      }
    }

    lines.push(profLines.join("<br/>\n"));
  }

  // ========== CLASS SKILLS ==========
  const classSkills = s.classSkills;
  if (classSkills && typeof classSkills === "object") {
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

    const skillList = [];
    for (const [key, val] of Object.entries(classSkills)) {
      if (val === true || val === 1) {
        const name = SKILL_NAMES[key] || key;
        skillList.push(name);
      }
    }

    if (skillList.length > 0) {
      lines.push(sectionDivider("CLASS SKILLS"));
      lines.push(skillList.sort().join(", "));
    }
  }

  // ========== CLASS PROGRESSION TABLE ==========
  const babType = s.bab || "high";
  const fortType = savingThrows?.fort?.value || "low";
  const refType = savingThrows?.ref?.value || "low";
  const willType = savingThrows?.will?.value || "low";

  if (BAB_PROGRESSION[babType]) {
    lines.push(sectionDivider("CLASS PROGRESSION"));

    // d20pfsrd uses tables with blue header bg and alternating rows
    lines.push(`{| class="wikitable" style="width:100%;" border="1" cellpadding="5"`);
    lines.push(`|+ Table: ${item.name}`);
    lines.push(`! style="background-color:rgb(207,226,243);" | Level`);
    lines.push(`! style="background-color:rgb(207,226,243);" | BAB`);
    lines.push(`! style="background-color:rgb(207,226,243);" | Fort`);
    lines.push(`! style="background-color:rgb(207,226,243);" | Ref`);
    lines.push(`! style="background-color:rgb(207,226,243);" | Will`);

    for (let i = 0; i < 20; i++) {
      const level = i + 1;
      const babVal = BAB_PROGRESSION[babType]?.values[i] ?? "?";
      const fortVal = SAVE_PROGRESSION[fortType]?.[i] ?? SAVE_PROGRESSION.low[i];
      const refVal = SAVE_PROGRESSION[refType]?.[i] ?? SAVE_PROGRESSION.low[i];
      const willVal = SAVE_PROGRESSION[willType]?.[i] ?? SAVE_PROGRESSION.low[i];

      lines.push(`|-`);
      lines.push(`| ${ordinal(level)} || +${babVal} || +${fortVal} || +${refVal} || +${willVal}`);
    }

    lines.push(`|}`);
  }

  // ========== CLASS FEATURES ==========
  const changes = s.changes;
  const contextNotes = s.contextNotes;

  if ((changes && changes.length > 0) || (contextNotes && contextNotes.length > 0)) {
    lines.push(sectionDivider("CLASS FEATURES"));
    lines.push(`All of the following are class features of the ${item.name}.`);

    if (changes && changes.length > 0) {
      const featureLines = [];
      for (const change of changes) {
        const target = change.subTarget || change.target || "";
        const formula = change.formula || change.value || "";
        if (target && formula) {
          featureLines.push(`'''${target}:''' ${formula}`);
        }
      }
      if (featureLines.length > 0) {
        lines.push("");
        lines.push(featureLines.join("<br/>\n"));
      }
    }

    if (contextNotes && contextNotes.length > 0) {
      const noteLines = [];
      for (const note of contextNotes) {
        if (note.text) {
          noteLines.push(note.text);
        }
      }
      if (noteLines.length > 0) {
        lines.push("");
        lines.push(noteLines.join("<br/>\n"));
      }
    }
  }

  // Close stat block wrapper
  lines.push(`</div>`);

  // Categories
  lines.push("");
  lines.push(`[[Category:Classes]]`);

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
  // Class pages use colored title headers for all sections (not thin dividers)
  const titleCase = label.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return `\n<p class="pointed-statblock-title" style="font-size:18px; font-weight:bold; background:#1a3c5e; color:white; padding:4px 8px;">${titleCase}</p>`;
}

function ordinal(n) {
  const num = Number(n);
  if (num === 0) return "0th";
  const s = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}
