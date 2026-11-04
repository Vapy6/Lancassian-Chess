/* dnd-rules.js - D&D 5e SRD rules library (no graphics, no DOM). Content from the SRD 5.1 (CC-BY-4.0).
   This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC,
   available at https://dnd.wizards.com/resources/systems-reference-document, licensed under CC-BY-4.0.
   Works as a browser global (window.DND) or a Node module. Level-1 creation for now; built to grow (levels, spells, combat). */
(function (root) {
  'use strict';
  var ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
  var SKILLS = {
    'Acrobatics': 'dex', 'Animal Handling': 'wis', 'Arcana': 'int', 'Athletics': 'str', 'Deception': 'cha', 'History': 'int',
    'Insight': 'wis', 'Intimidation': 'cha', 'Investigation': 'int', 'Medicine': 'wis', 'Nature': 'int', 'Perception': 'wis',
    'Performance': 'cha', 'Persuasion': 'cha', 'Religion': 'int', 'Sleight of Hand': 'dex', 'Stealth': 'dex', 'Survival': 'wis'
  };
  var ALL_SKILLS = Object.keys(SKILLS);

  // ---------- species (SRD). asi: fixed bonuses; asiChoose: [count, amount] free picks (Half-Elf) ----------
  var RACES = {
    'Dwarf': { size: 'Medium', speed: 25, asi: { con: 2 }, skills: [], languages: ['Common', 'Dwarvish'], traits: ['Darkvision (60 ft)', 'Dwarven Resilience (advantage on saves vs poison, resistance to poison damage)', 'Dwarven Combat Training (battleaxe, handaxe, light hammer, warhammer)', 'Stonecunning'],
      subraces: { 'Hill Dwarf': { asi: { wis: 1 }, hpPerLevel: 1, traits: ['Dwarven Toughness (+1 hit point per level)'] } } },
    'Elf': { size: 'Medium', speed: 30, asi: { dex: 2 }, skills: ['Perception'], languages: ['Common', 'Elvish'], traits: ['Darkvision (60 ft)', 'Keen Senses (Perception proficiency)', 'Fey Ancestry (advantage vs charm, immune to magical sleep)', 'Trance (4 hours of meditation = long rest)'],
      subraces: { 'High Elf': { asi: { int: 1 }, traits: ['Elf Weapon Training', 'One wizard cantrip (Intelligence)', 'One extra language'] } } },
    'Halfling': { size: 'Small', speed: 25, asi: { dex: 2 }, skills: [], languages: ['Common', 'Halfling'], traits: ['Lucky (reroll natural 1s on attacks, checks, saves)', 'Brave (advantage vs being frightened)', 'Halfling Nimbleness (move through larger creatures)'],
      subraces: { 'Lightfoot Halfling': { asi: { cha: 1 }, traits: ['Naturally Stealthy (hide behind larger creatures)'] } } },
    'Human': { size: 'Medium', speed: 30, asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, skills: [], languages: ['Common', 'One extra language'], traits: [], subraces: {} },
    'Dragonborn': { size: 'Medium', speed: 30, asi: { str: 2, cha: 1 }, skills: [], languages: ['Common', 'Draconic'], traits: ['Draconic Ancestry (choose a dragon type)', 'Breath Weapon (2d6, DC 8 + Con mod + proficiency, recharges on a short or long rest)', 'Damage Resistance (to your ancestry damage type)'], subraces: {} },
    'Gnome': { size: 'Small', speed: 25, asi: { int: 2 }, skills: [], languages: ['Common', 'Gnomish'], traits: ['Darkvision (60 ft)', 'Gnome Cunning (advantage on Int, Wis, Cha saves vs magic)'],
      subraces: { 'Rock Gnome': { asi: { con: 1 }, traits: ["Artificer's Lore", 'Tinker'] } } },
    'Half-Elf': { size: 'Medium', speed: 30, asi: { cha: 2 }, asiChoose: [2, 1], skillsChoose: 2, skills: [], languages: ['Common', 'Elvish', 'One extra language'], traits: ['Darkvision (60 ft)', 'Fey Ancestry (advantage vs charm, immune to magical sleep)', 'Skill Versatility (two extra skill proficiencies)'], subraces: {} },
    'Half-Orc': { size: 'Medium', speed: 30, asi: { str: 2, con: 1 }, skills: ['Intimidation'], languages: ['Common', 'Orc'], traits: ['Darkvision (60 ft)', 'Menacing (Intimidation proficiency)', 'Relentless Endurance (drop to 1 HP instead of 0, once per long rest)', 'Savage Attacks (extra weapon die on critical hits)'], subraces: {} },
    'Tiefling': { size: 'Medium', speed: 30, asi: { cha: 2, int: 1 }, skills: [], languages: ['Common', 'Infernal'], traits: ['Darkvision (60 ft)', 'Hellish Resistance (fire resistance)', 'Infernal Legacy (thaumaturgy; hellish rebuke at 3rd; darkness at 5th)'], subraces: {} }
  };

  // ---------- classes (SRD level-1 data) ----------
  var CLASSES = {
    'Barbarian': { hitDie: 12, saves: ['str', 'con'], skillCount: 2, skillList: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'], armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], unarmored: ['dex', 'con'], features: ['Rage (2/day, +2 damage, resistance to bludgeoning/piercing/slashing)', 'Unarmored Defense (AC 10 + Dex + Con)'] },
    'Bard': { hitDie: 8, saves: ['dex', 'cha'], skillCount: 3, skillList: ALL_SKILLS, armor: ['Light armor'], weapons: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'], spell: { ability: 'cha', cantrips: 2, known: 4, slots: 2, kind: 'known' }, features: ['Spellcasting (Charisma)', 'Bardic Inspiration (d6, Cha mod times per long rest)'] },
    'Cleric': { hitDie: 8, saves: ['wis', 'cha'], skillCount: 2, skillList: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'], armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons'], spell: { ability: 'wis', cantrips: 3, slots: 2, kind: 'prepared' }, features: ['Spellcasting (Wisdom, prepared)', 'Divine Domain (Life: heavy armor proficiency, Disciple of Life)'] },
    'Druid': { hitDie: 8, saves: ['int', 'wis'], skillCount: 2, skillList: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'], armor: ['Light armor (nonmetal)', 'Medium armor (nonmetal)', 'Shields (nonmetal)'], weapons: ['Clubs', 'Daggers', 'Darts', 'Javelins', 'Maces', 'Quarterstaffs', 'Scimitars', 'Sickles', 'Slings', 'Spears'], spell: { ability: 'wis', cantrips: 2, slots: 2, kind: 'prepared' }, features: ['Druidic (secret language)', 'Spellcasting (Wisdom, prepared)'] },
    'Fighter': { hitDie: 10, saves: ['str', 'con'], skillCount: 2, skillList: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'], armor: ['All armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], features: ['Fighting Style (choose one)', 'Second Wind (1d10 + level HP, once per short rest)'] },
    'Monk': { hitDie: 8, saves: ['str', 'dex'], skillCount: 2, skillList: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'], armor: [], weapons: ['Simple weapons', 'Shortswords'], unarmored: ['dex', 'wis'], features: ['Unarmored Defense (AC 10 + Dex + Wis)', 'Martial Arts (d4 unarmed, bonus-action strike)'] },
    'Paladin': { hitDie: 10, saves: ['wis', 'cha'], skillCount: 2, skillList: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'], armor: ['All armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], features: ['Divine Sense', 'Lay on Hands (5 x level HP pool)'] },
    'Ranger': { hitDie: 10, saves: ['str', 'dex'], skillCount: 3, skillList: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'], armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], features: ['Favored Enemy', 'Natural Explorer'] },
    'Rogue': { hitDie: 8, saves: ['dex', 'int'], skillCount: 4, skillList: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'], armor: ['Light armor'], weapons: ['Simple weapons', 'Hand crossbows', 'Longswords', 'Rapiers', 'Shortswords'], expertise: 2, features: ['Expertise (double proficiency in two skills)', 'Sneak Attack (1d6)', "Thieves' Cant"] },
    'Sorcerer': { hitDie: 6, saves: ['con', 'cha'], skillCount: 2, skillList: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'], armor: [], weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'], spell: { ability: 'cha', cantrips: 4, known: 2, slots: 2, kind: 'known' }, hpPerLevel: 1, draconicAC: true, features: ['Spellcasting (Charisma)', 'Sorcerous Origin (Draconic Bloodline: +1 HP per level, AC 13 + Dex unarmored)'] },
    'Warlock': { hitDie: 8, saves: ['wis', 'cha'], skillCount: 2, skillList: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'], armor: ['Light armor'], weapons: ['Simple weapons'], spell: { ability: 'cha', cantrips: 2, known: 2, slots: 1, kind: 'known' }, features: ['Otherworldly Patron', 'Pact Magic (1 slot, recharges on a short rest)'] },
    'Wizard': { hitDie: 6, saves: ['int', 'wis'], skillCount: 2, skillList: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'], armor: [], weapons: ['Daggers', 'Darts', 'Slings', 'Quarterstaffs', 'Light crossbows'], spell: { ability: 'int', cantrips: 3, spellbook: 6, slots: 2, kind: 'prepared' }, features: ['Spellcasting (Intelligence, spellbook of 6 spells)', 'Arcane Recovery (1/day on a short rest)'] }
  };

  var BACKGROUNDS = {
    'Acolyte': { skills: ['Insight', 'Religion'], languages: 2, feature: 'Shelter of the Faithful' },
    'Custom background': { skills: [], pick: 2, languages: 0, feature: 'Your own story (choose 2 skills)' }
  };

  var STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
  var POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  var POINT_BUDGET = 27;

  // ---------- dice ----------
  function defaultRng() { return Math.random(); }
  function d(n, rng) { return 1 + Math.floor((rng || defaultRng)() * n); }
  /** roll('2d6+3') -> {total, rolls, mod}. Supports NdM, +/-K, advantage via {adv:true} on d20 only. */
  function roll(expr, rng) {
    var m = /^\s*(\d*)d(\d+)\s*([+-]\s*\d+)?\s*$/i.exec(expr); if (!m) throw new Error('bad dice: ' + expr);
    var n = +(m[1] || 1), s = +m[2], mod = m[3] ? +m[3].replace(/\s/g, '') : 0, rolls = [], t = mod;
    for (var i = 0; i < n; i++) { var r = d(s, rng); rolls.push(r); t += r; }
    return { total: t, rolls: rolls, mod: mod };
  }
  function d20(mod, mode, rng) { var a = d(20, rng), b = mode ? d(20, rng) : a, r = mode === 'adv' ? Math.max(a, b) : mode === 'dis' ? Math.min(a, b) : a; return { natural: r, total: r + (mod || 0), crit: r === 20, fumble: r === 1 }; }
  function roll4d6(rng) { var r = [d(6, rng), d(6, rng), d(6, rng), d(6, rng)].sort(function (a, b) { return a - b; }); return r[1] + r[2] + r[3]; }
  function rollAbilityScores(rng) { var o = []; for (var i = 0; i < 6; i++) o.push(roll4d6(rng)); return o; }

  // ---------- derived numbers ----------
  function mod(score) { return Math.floor((score - 10) / 2); }
  function profBonus(level) { return 2 + Math.floor(((level || 1) - 1) / 4); }
  function pointCost(scores) { var t = 0; for (var i = 0; i < ABILITIES.length; i++) { var c = POINT_COST[scores[ABILITIES[i]]]; if (c === undefined) return Infinity; t += c; } return t; }
  function signed(n) { return (n >= 0 ? '+' : '') + n; }

  /** Validate and build a level-1 character sheet.
   *  opts: { name, race, subrace, cls, background, base:{str..cha} (before bonuses), method:'pointbuy'|'standard'|'roll'|'manual',
   *          skills:[class picks], bgSkills:[for Custom background], raceSkills:[Half-Elf picks], halfElfAsi:[2 abilities], expertise:[Rogue picks] }
   *  returns { ok, errors, sheet } */
  function buildCharacter(o) {
    var errors = [], race = RACES[o.race], cls = CLASSES[o.cls], bg = BACKGROUNDS[o.background || 'Custom background'];
    if (!race) errors.push('Choose a species.'); if (!cls) errors.push('Choose a class.'); if (!bg) errors.push('Choose a background.');
    if (errors.length) return { ok: false, errors: errors };
    var sub = o.subrace && race.subraces[o.subrace] ? race.subraces[o.subrace] : null;
    if (Object.keys(race.subraces).length && !sub) errors.push('Choose a ' + o.race + ' subrace.');
    var base = {}; ABILITIES.forEach(function (a) { base[a] = +(o.base && o.base[a]); if (!(base[a] >= 3 && base[a] <= 20)) errors.push('Set ' + ABILITY_NAMES[a] + ' (3-20).'); });
    if (o.method === 'pointbuy' && pointCost(base) > POINT_BUDGET) errors.push('Point buy is over budget (' + pointCost(base) + '/' + POINT_BUDGET + ').');
    if (o.method === 'standard' && base.str + base.dex + base.con + base.int + base.wis + base.cha !== 72) errors.push('Standard array uses 15, 14, 13, 12, 10, 8 once each.');
    var score = {}; ABILITIES.forEach(function (a) { score[a] = base[a] + (race.asi[a] || 0) + (sub && sub.asi && sub.asi[a] || 0); });
    if (race.asiChoose) {
      var picks = (o.halfElfAsi || []).filter(function (a, i, arr) { return ABILITIES.indexOf(a) >= 0 && a !== 'cha' && arr.indexOf(a) === i; });
      if (picks.length !== race.asiChoose[0]) errors.push('Pick ' + race.asiChoose[0] + ' different abilities (not Charisma) for +' + race.asiChoose[1] + ' each.'); else picks.forEach(function (a) { score[a] += race.asiChoose[1]; });
    }
    ABILITIES.forEach(function (a) { if (score[a] > 20) score[a] = 20; });
    // proficiencies
    var prof = {}, sources = {};
    function addSkill(s, src) { if (SKILLS[s] && !prof[s]) { prof[s] = 1; sources[s] = src; return true; } return false; }
    race.skills.forEach(function (s) { addSkill(s, o.race); });
    bg.skills.forEach(function (s) { addSkill(s, o.background); });
    var cp = (o.skills || []).filter(function (s, i, a) { return a.indexOf(s) === i; });
    if (cp.length !== cls.skillCount) errors.push('Pick ' + cls.skillCount + ' ' + o.cls + ' skills.');
    cp.forEach(function (s) { if (cls.skillList.indexOf(s) < 0) errors.push(s + ' is not a ' + o.cls + ' skill.'); else if (prof[s]) errors.push(s + ' is already granted by your species or background - pick another.'); else addSkill(s, o.cls); });
    if (bg.pick) { var bp = o.bgSkills || []; if (bp.length !== bg.pick) errors.push('Pick ' + bg.pick + ' background skills.'); bp.forEach(function (s) { if (prof[s]) errors.push(s + ' is already a proficiency.'); else addSkill(s, 'Background'); }); }
    if (race.skillsChoose) { var rp = o.raceSkills || []; if (rp.length !== race.skillsChoose) errors.push('Pick ' + race.skillsChoose + ' extra skills (Skill Versatility).'); rp.forEach(function (s) { if (prof[s]) errors.push(s + ' is already a proficiency.'); else addSkill(s, o.race); }); }
    var expert = {};
    if (cls.expertise) { var ex = o.expertise || []; if (ex.length !== cls.expertise) errors.push('Pick ' + cls.expertise + ' skills for Expertise.'); ex.forEach(function (s) { if (!prof[s]) errors.push('Expertise needs a skill you are proficient in (' + s + ').'); else expert[s] = 1; }); }
    if (errors.length) return { ok: false, errors: errors };

    var level = 1, pb = profBonus(level), m = {}; ABILITIES.forEach(function (a) { m[a] = mod(score[a]); });
    var hp = cls.hitDie + m.con + ((sub && sub.hpPerLevel || 0) + (cls.hpPerLevel || 0)) * level;
    var ac = 10 + m.dex, acNote = 'Unarmored';
    if (cls.unarmored) { ac = 10 + m[cls.unarmored[0]] + m[cls.unarmored[1]]; acNote = 'Unarmored Defense'; }
    if (cls.draconicAC) { ac = 13 + m.dex; acNote = 'Draconic Resilience'; }
    var skills = {}; ALL_SKILLS.forEach(function (s) { var b = m[SKILLS[s]] + (prof[s] ? pb * (expert[s] ? 2 : 1) : 0); skills[s] = { bonus: b, ability: SKILLS[s], proficient: !!prof[s], expertise: !!expert[s], source: sources[s] }; });
    var saves = {}; ABILITIES.forEach(function (a) { var p = cls.saves.indexOf(a) >= 0; saves[a] = { bonus: m[a] + (p ? pb : 0), proficient: p }; });
    var sheet = {
      name: o.name || 'Unnamed', race: o.race, subrace: o.subrace || null, cls: o.cls, background: o.background || 'Custom background', level: level,
      scores: score, mods: m, profBonus: pb, hp: hp, hpMax: hp, hitDie: 'd' + cls.hitDie, ac: ac, acNote: acNote, initiative: m.dex, speed: race.speed, size: race.size,
      saves: saves, skills: skills, passivePerception: 10 + skills['Perception'].bonus,
      languages: race.languages.concat(bg.languages ? ['+' + bg.languages + ' of your choice'] : []),
      armor: cls.armor, weapons: cls.weapons,
      features: race.traits.concat(sub && sub.traits || [], cls.features, [bg.feature]),
      spellcasting: null
    };
    if (cls.spell) {
      var sa = cls.spell.ability, sm = m[sa];
      sheet.spellcasting = { ability: sa, saveDC: 8 + pb + sm, attackBonus: pb + sm, cantrips: cls.spell.cantrips, slots: { 1: cls.spell.slots }, kind: cls.spell.kind,
        spellsKnown: cls.spell.known || null, spellbook: cls.spell.spellbook || null, prepared: cls.spell.kind === 'prepared' ? Math.max(1, sm + level) : null };
    }
    return { ok: true, errors: [], sheet: sheet };
  }

  var api = { ABILITIES: ABILITIES, ABILITY_NAMES: ABILITY_NAMES, SKILLS: SKILLS, ALL_SKILLS: ALL_SKILLS, RACES: RACES, CLASSES: CLASSES, BACKGROUNDS: BACKGROUNDS,
    STANDARD_ARRAY: STANDARD_ARRAY, POINT_COST: POINT_COST, POINT_BUDGET: POINT_BUDGET,
    d: d, roll: roll, d20: d20, roll4d6: roll4d6, rollAbilityScores: rollAbilityScores, mod: mod, profBonus: profBonus, pointCost: pointCost, signed: signed, buildCharacter: buildCharacter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DND = api;
})(typeof window !== 'undefined' ? window : this);
