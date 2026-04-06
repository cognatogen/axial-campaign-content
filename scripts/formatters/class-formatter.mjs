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

  // ========== HEADER ==========
  lines.push(`= ${item.name} =`);

  if (imageFilename) {
    lines.push(`[[File:${imageFilename}|thumb|right|300px|${item.name}]]`);
  }

  // ========== DESCRIPTION ==========
  const desc = s.description?.value;
  if (desc) {
    const descText = htmlToWikitext(desc).trim();
    if (descText) {
      lines.push("");
      lines.push(descText);
    }
  }

  // ========== CLASS OVERVIEW ==========
  lines.push("");
  lines.push(`== Class Overview ==`);

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
      lines.push("");
      lines.push(`== Class Skills ==`);
      lines.push(skillList.sort().join(", "));
    }
  }

  // ========== CLASS PROGRESSION TABLE ==========
  const babType = s.bab || "high";
  const fortType = savingThrows?.fort?.value || "low";
  const refType = savingThrows?.ref?.value || "low";
  const willType = savingThrows?.will?.value || "low";

  if (BAB_PROGRESSION[babType]) {
    lines.push("");
    lines.push(`== Class Progression ==`);
    lines.push(`{| class="wikitable"`);
    lines.push(`! Level !! BAB !! Fort !! Ref !! Will`);

    for (let i = 0; i < 20; i++) {
      const level = i + 1;
      const babVal = BAB_PROGRESSION[babType]?.values[i] ?? "?";
      const fortVal = SAVE_PROGRESSION[fortType]?.[i] ?? SAVE_PROGRESSION.low[i];
      const refVal = SAVE_PROGRESSION[refType]?.[i] ?? SAVE_PROGRESSION.low[i];
      const willVal = SAVE_PROGRESSION[willType]?.[i] ?? SAVE_PROGRESSION.low[i];

      lines.push(`|-`);
      lines.push(`| ${level} || +${babVal} || +${fortVal} || +${refVal} || +${willVal}`);
    }

    lines.push(`|}`);
  }

  // ========== CLASS FEATURES ==========
  // Check for class features stored in changes/contextNotes
  const changes = s.changes;
  const contextNotes = s.contextNotes;

  if ((changes && changes.length > 0) || (contextNotes && contextNotes.length > 0)) {
    lines.push("");
    lines.push(`== Class Features ==`);
    lines.push(`All of the following are class features of the ${item.name}.`);

    if (changes && changes.length > 0) {
      lines.push("");
      for (const change of changes) {
        const target = change.subTarget || change.target || "";
        const formula = change.formula || change.value || "";
        if (target && formula) {
          lines.push(`* '''${target}:''' ${formula}`);
        }
      }
    }

    if (contextNotes && contextNotes.length > 0) {
      lines.push("");
      for (const note of contextNotes) {
        if (note.text) {
          lines.push(`* ${note.text}`);
        }
      }
    }
  }

  // ========== PROFICIENCIES ==========
  const armorProf = s.armorProf;
  const weaponProf = s.weaponProf;
  if (armorProf || weaponProf) {
    lines.push("");
    lines.push(`== Proficiencies ==`);

    if (weaponProf) {
      const wpParts = [];
      if (weaponProf.value) wpParts.push(...Array.from(weaponProf.value));
      if (weaponProf.custom) wpParts.push(weaponProf.custom);
      if (wpParts.length > 0) {
        lines.push(`'''Weapon Proficiencies:''' ${wpParts.join(", ")}`);
      }
    }

    if (armorProf) {
      const apParts = [];
      if (armorProf.value) apParts.push(...Array.from(armorProf.value));
      if (armorProf.custom) apParts.push(armorProf.custom);
      if (apParts.length > 0) {
        lines.push("<br/>");
        lines.push(`'''Armor Proficiencies:''' ${apParts.join(", ")}`);
      }
    }
  }

  // Categories
  lines.push("");
  lines.push(`[[Category:Classes]]`);

  return {
    title: item.name,
    wikitext: lines.join("\n")
  };
}
