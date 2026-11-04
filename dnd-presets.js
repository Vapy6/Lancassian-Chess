/* dnd-presets.js - ready-made level-1 heroes for quick tests and as examples of character-creation input. */
(function (root) {
  'use strict';
  var DND = typeof require === 'function' && typeof module !== 'undefined' ? require('./dnd-rules.js') : root.DND;
  var P = {
    'Aldric (Hill Dwarf Fighter)': { name: 'Aldric', race: 'Dwarf', subrace: 'Hill Dwarf', cls: 'Fighter', background: 'Acolyte', method: 'standard', base: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, skills: ['Athletics', 'Perception'], kit: { choices: [0, 0, 0, 0], picks: { '1.0': 'Longsword' } } },
    'Sable (Human Rogue)': { name: 'Sable', race: 'Human', cls: 'Rogue', background: 'Acolyte', method: 'standard', base: { str: 8, dex: 15, con: 13, int: 12, wis: 10, cha: 14 }, skills: ['Acrobatics', 'Perception', 'Stealth', 'Sleight of Hand'], expertise: ['Stealth', 'Insight'], kit: { choices: [0, 0, 0] } },
    'Brother Tomas (Human Cleric)': { name: 'Brother Tomas', race: 'Human', cls: 'Cleric', background: 'Acolyte', method: 'standard', base: { str: 13, dex: 8, con: 14, int: 10, wis: 15, cha: 12 }, skills: ['Medicine', 'Persuasion'], kit: { choices: [0, 0, 0, 0] }, spells: { cantrips: ['Sacred Flame', 'Guidance', 'Light'], prepared: ['Cure Wounds', 'Guiding Bolt', 'Healing Word', 'Bless'] } },
    'Mira (High Elf Wizard)': { name: 'Mira', race: 'Elf', subrace: 'High Elf', cls: 'Wizard', background: 'Acolyte', method: 'standard', base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, skills: ['Arcana', 'History'], kit: { choices: [0, 0, 0] }, spells: { cantrips: ['Fire Bolt', 'Mage Hand', 'Light', 'Ray of Frost'], known: ['Magic Missile', 'Shield', 'Mage Armor', 'Sleep', 'Detect Magic', 'Burning Hands'], prepared: ['Magic Missile', 'Shield', 'Sleep', 'Burning Hands'] } },
    'Grok (Half-Orc Barbarian)': { name: 'Grok', race: 'Half-Orc', cls: 'Barbarian', background: 'Acolyte', method: 'standard', base: { str: 13, dex: 14, con: 15, int: 8, wis: 12, cha: 10 }, skills: ['Athletics', 'Survival'], kit: { choices: [0, 0] } }
  };
  function build(name) { var r = DND.buildCharacter(P[name]); if (!r.ok) throw new Error(name + ': ' + r.errors.join('; ')); return r.sheet; }
  var api = { PRESETS: P, build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DNDPRESETS = api;
})(typeof window !== 'undefined' ? window : this);
