/* D&D 5e (2014 SRD) levelling, levels 1-5. Pure functions on a character sheet made by dnd-rules.js.
   plan(sheet) -> what the player must choose; apply(sheet, choices) -> new sheet (or {errors}).
   Spell data only exists for cantrips and level-1 spells, so higher-level slots are tracked but have no spells to cast yet.
   Paladin/Ranger spellcasting (level 2) is listed as a feature only until their spell lists are added. */
(function (root) {
  var DND = root.DND || (typeof require !== 'undefined' ? require('./dnd-rules.js') : null);
  var DATA = root.DNDDATA || (typeof require !== 'undefined' ? require('./dnd-data.js') : null);
  var MAXLV = 5, XP = [0, 300, 900, 2700, 6500, 14000];
  var HD = { Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10, Monk: 8, Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6 };
  var ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  var ASI_AT = { Fighter: [4, 6], Rogue: [4, 10] };
  var FEAT = {
    Barbarian: { 2: ['Reckless Attack', 'Danger Sense'], 3: ['Primal Path: Path of the Berserker (Frenzy)', 'Rage: 3 uses'], 5: ['Extra Attack', 'Fast Movement (+10 ft speed)'] },
    Bard: { 2: ['Jack of All Trades', 'Song of Rest (d6)'], 3: ['Bard College', 'Expertise'], 5: ['Font of Inspiration', 'Bardic Inspiration becomes d8'] },
    Cleric: { 2: ['Channel Divinity (1/rest)', 'Turn Undead', 'Divine Domain feature (Life: Preserve Life)'], 5: ['Destroy Undead (CR 1/2)'] },
    Druid: { 2: ['Wild Shape', 'Druid Circle: Circle of the Land'] },
    Fighter: { 2: ['Action Surge (once per short rest)'], 3: ['Martial Archetype: Champion', 'Improved Critical (crit on 19-20)'], 5: ['Extra Attack'] },
    Monk: { 2: ['Ki (points = level)', 'Unarmored Movement (+10 ft speed)'], 3: ['Monastic Tradition: Way of the Open Hand', 'Deflect Missiles'], 4: ['Slow Fall'], 5: ['Extra Attack', 'Stunning Strike'] },
    Paladin: { 2: ['Fighting Style', 'Spellcasting (spell list not yet in game)', 'Divine Smite'], 3: ['Divine Health', 'Sacred Oath: Oath of Devotion', 'Channel Divinity'], 5: ['Extra Attack'] },
    Ranger: { 2: ['Fighting Style', 'Spellcasting (spell list not yet in game)'], 3: ['Ranger Archetype: Hunter', 'Primeval Awareness'], 5: ['Extra Attack'] },
    Rogue: { 2: ['Cunning Action'], 3: ['Roguish Archetype: Thief', 'Fast Hands', 'Second-Story Work'], 5: ['Uncanny Dodge'] },
    Sorcerer: { 2: ['Font of Magic (sorcery points = level)'], 3: ['Metamagic (2 options)'] },
    Warlock: { 2: ['Eldritch Invocations (2)'], 3: ['Pact Boon'] },
    Wizard: { 2: ['Arcane Tradition: School of Evocation', 'Sculpt Spells'] }
  };
  var FULL = { 1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 }, 4: { 1: 4, 2: 3 }, 5: { 1: 4, 2: 3, 3: 2 } };
  var HALF = { 1: {}, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3 }, 5: { 1: 4, 2: 2 } };
  var PACT = { 1: { 1: 1 }, 2: { 1: 2 }, 3: { 2: 2 }, 4: { 2: 2 }, 5: { 3: 2 } };
  var CANT = { Bard: [0, 2, 2, 2, 3, 3], Cleric: [0, 3, 3, 3, 4, 4], Druid: [0, 2, 2, 2, 3, 3], Sorcerer: [0, 4, 4, 4, 5, 5], Warlock: [0, 2, 2, 2, 3, 3], Wizard: [0, 3, 3, 3, 4, 4] };
  var KNOWN = { Bard: [0, 4, 5, 6, 7, 8], Sorcerer: [0, 2, 3, 4, 5, 6], Warlock: [0, 2, 3, 4, 5, 6] };
  function slotsFor(cls, lv) { return JSON.parse(JSON.stringify(cls === 'Warlock' ? PACT[lv] : /Paladin|Ranger/.test(cls) ? HALF[lv] : FULL[lv])); }
  function nextXp(sheet) { return sheet.level >= MAXLV ? null : XP[sheet.level]; }
  function levelFor(xp) { var l = 1; for (var i = 1; i <= MAXLV; i++) if (xp >= XP[i]) l = i + 1; return Math.min(l, MAXLV); }
  function canLevel(sheet) { return sheet.level < MAXLV && (sheet.xp || 0) >= XP[sheet.level]; }
  function mod(n) { return Math.floor((n - 10) / 2); }
  function plan(sheet) {
    var lv = sheet.level + 1, c = sheet.cls, p = { level: lv, asi: (lv === 4) || ((ASI_AT[c] || []).indexOf(lv) >= 0), cantrips: 0, known: 0, book: 0, prepared: 0, expertise: 0, features: (FEAT[c] || {})[lv] || [] };
    var sc = sheet.spellcasting; if (sc && DATA) {
      if (CANT[c]) p.cantrips = Math.max(0, CANT[c][lv] - CANT[c][lv - 1]);
      if (KNOWN[c]) p.known = KNOWN[c][lv] - KNOWN[c][lv - 1];
      if (c === 'Wizard') p.book = 2;
      if (sc.kind === 'prepared') p.prepared = Math.max(1, mod(sheet.scores[sc.ability]) + lv);
    }
    if (c === 'Bard' && lv === 3) p.expertise = 2;
    return p;
  }
  function apply(sheet0, ch) {
    ch = ch || {}; var s = JSON.parse(JSON.stringify(sheet0)), errors = [];
    if (!canLevel(s)) return { errors: ['Not enough XP to level up (need ' + nextXp(s) + ').'] };
    var pl = plan(s), lv = pl.level, c = s.cls, oldPB = s.profBonus, newPB = DND.profBonus(lv), oldMods = JSON.parse(JSON.stringify(s.mods));
    // ability score improvement: +2 to one or +1 to two
    if (pl.asi) { var asi = ch.asi || {}, tot = 0, bad = false; ABIL.forEach(function (a) { var v = asi[a] || 0; tot += v; if (v < 0 || v > 2 || s.scores[a] + v > 20) bad = true; });
      if (tot !== 2 || bad) errors.push('Ability Score Improvement: spend exactly 2 points (max 2 in one score, scores cap at 20).'); else ABIL.forEach(function (a) { s.scores[a] += asi[a] || 0; }); }
    var cantrips = ch.cantrips || [], known = ch.known || [], book = ch.book || [], prep = ch.prepared || [], exp = ch.expertise || [], sc = s.spellcasting, CS = DATA && DATA.CLASS_SPELLS[c];
    if (sc) {
      if (cantrips.length !== pl.cantrips) errors.push('Pick ' + pl.cantrips + ' new cantrip(s).');
      cantrips.forEach(function (n) { if (!CS || CS[0].indexOf(n) < 0 || (sc.cantripList || []).indexOf(n) >= 0) errors.push(n + ' is not a valid new cantrip.'); });
      if (known.length !== pl.known) errors.push('Pick ' + pl.known + ' new spell(s).');
      known.forEach(function (n) { if (!CS || CS[1].indexOf(n) < 0 || (sc.knownSpells || []).indexOf(n) >= 0) errors.push(n + ' is not a valid new spell.'); });
      if (book.length !== pl.book) errors.push('Add ' + pl.book + ' spells to your spellbook.');
      book.forEach(function (n) { if (!CS || CS[1].indexOf(n) < 0 || (sc.knownSpells || []).indexOf(n) >= 0) errors.push(n + ' is not a valid spellbook spell.'); });
      if (pl.prepared) { var pool = c === 'Wizard' ? (sc.knownSpells || []).concat(book) : CS ? CS[1] : []; if (prep.length !== pl.prepared) errors.push('Prepare exactly ' + pl.prepared + ' spells.'); prep.forEach(function (n) { if (pool.indexOf(n) < 0) errors.push(n + ' cannot be prepared.'); }); }
    }
    if (exp.length !== pl.expertise) errors.push('Pick ' + pl.expertise + ' skills for Expertise.'); exp.forEach(function (k) { if (!s.skills[k] || !s.skills[k].proficient || s.skills[k].expertise) errors.push(k + ' cannot take Expertise.'); });
    if (errors.length) return { errors: errors };
    // new modifiers and everything derived from them
    var m = {}; ABIL.forEach(function (a) { m[a] = mod(s.scores[a]); }); s.mods = m;
    var gains = [], dPB = newPB - oldPB;
    var die = HD[c], hpRoll = Math.floor(die / 2) + 1, hpGain = Math.max(1, hpRoll + m.con) + (/Dwarven Toughness/.test((s.features || []).join('|')) ? 1 : 0);
    var conBack = (m.con - oldMods.con) * (lv - 1); s.hpMax += hpGain + conBack; s.hp += hpGain + conBack; gains.push('+' + (hpGain + conBack) + ' max HP');
    s.level = lv; s.profBonus = newPB; s.hitDiceTotal = lv + (s.hitDie || 'd' + die); if (typeof s.hdLeft === 'number') s.hdLeft = Math.min(lv, s.hdLeft + 1); if (dPB) gains.push('Proficiency bonus is now +' + newPB);
    ABIL.forEach(function (a) { if (s.saves && s.saves[a]) { var sv = s.saves[a]; if (typeof sv === 'object') sv.bonus += (m[a] - oldMods[a]) + (sv.proficient ? dPB : 0); else s.saves[a] = sv + (m[a] - oldMods[a]); } });
    Object.keys(s.skills).forEach(function (k) { var sk = s.skills[k]; sk.bonus += (m[sk.ability] - oldMods[sk.ability]) + (sk.proficient ? dPB * (sk.expertise ? 2 : 1) : 0); if (exp.indexOf(k) >= 0) { sk.expertise = true; sk.bonus += newPB; } });
    s.passivePerception = 10 + s.skills['Perception'].bonus; s.initiative = m.dex;
    (s.attacks || []).forEach(function (a) { var d = m[a.ability] - oldMods[a.ability]; a.bonus += d + (a.proficient ? dPB : 0); a.mod += d; });
    if (m.dex !== oldMods.dex && s.ac !== undefined) { var an = (s.acNote || '').toLowerCase(), fnd = null; Object.keys(DATA.ARMOR).forEach(function (n) { if (an.indexOf(n.toLowerCase()) >= 0 && (!fnd || n.length > fnd.length)) fnd = n; });
      var arm = fnd ? DATA.ARMOR[fnd] : null, cap = arm ? (arm.type === 'heavy' ? 0 : (arm.dexCap === null || arm.dexCap === undefined ? 99 : arm.dexCap)) : 99; s.ac += Math.min(m.dex, cap) - Math.min(oldMods.dex, cap); }
    if (sc) { sc.saveDC = 8 + newPB + m[sc.ability]; sc.attackBonus = newPB + m[sc.ability]; sc.slots = slotsFor(c, lv); sc.cantrips = (CANT[c] || [])[lv] || sc.cantrips;
      sc.cantripList = (sc.cantripList || []).concat(cantrips); sc.knownSpells = (sc.knownSpells || []).concat(known, book);
      if (pl.prepared) { sc.prepared = pl.prepared; sc.preparedSpells = prep.slice(); } else if (KNOWN[c]) sc.preparedSpells = sc.knownSpells.slice();
      if (KNOWN[c]) sc.spellsKnown = KNOWN[c][lv]; if (c === 'Wizard') sc.spellbook = (sc.spellbook || 6) + 2; gains.push('Spell slots: ' + Object.keys(sc.slots).map(function (k) { return sc.slots[k] + ' x L' + k; }).join(', ')); }
    if (/Barbarian|Monk/.test(c) && ((c === 'Barbarian' && lv === 5) || (c === 'Monk' && lv === 2))) { s.speed += 10; gains.push('Speed +10 ft'); }
    pl.features.forEach(function (f) { s.features.push(f); gains.push(f); });
    if (c === 'Rogue') gains.push('Sneak Attack ' + Math.ceil(lv / 2) + 'd6');
    if (pl.asi) gains.push('Ability Score Improvement applied');
    return { sheet: s, gains: gains };
  }
  var api = { MAXLV: MAXLV, XP: XP, nextXp: nextXp, levelFor: levelFor, canLevel: canLevel, plan: plan, apply: apply, slotsFor: slotsFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DNDLEVELS = api;
})(typeof window !== 'undefined' ? window : this);
