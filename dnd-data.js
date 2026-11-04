/* dnd-data.js - equipment, starting kits and level 0-1 spells for the SRD classes (SRD 5.1, CC-BY-4.0; spell text is paraphrased).
   Browser global window.DNDDATA or Node module. */
(function (root) {
  'use strict';
  // name: [category, melee/ranged, damage, damageType, properties, cost, weight]
  var W = {
    'Club': ['simple', 'melee', '1d4', 'bludgeoning', ['light'], '1 sp', 2], 'Dagger': ['simple', 'melee', '1d4', 'piercing', ['finesse', 'light', 'thrown (20/60)'], '2 gp', 1],
    'Greatclub': ['simple', 'melee', '1d8', 'bludgeoning', ['two-handed'], '2 sp', 10], 'Handaxe': ['simple', 'melee', '1d6', 'slashing', ['light', 'thrown (20/60)'], '5 gp', 2],
    'Javelin': ['simple', 'melee', '1d6', 'piercing', ['thrown (30/120)'], '5 sp', 2], 'Light hammer': ['simple', 'melee', '1d4', 'bludgeoning', ['light', 'thrown (20/60)'], '2 gp', 2],
    'Mace': ['simple', 'melee', '1d6', 'bludgeoning', [], '5 gp', 4], 'Quarterstaff': ['simple', 'melee', '1d6', 'bludgeoning', ['versatile (1d8)'], '2 sp', 4],
    'Sickle': ['simple', 'melee', '1d4', 'slashing', ['light'], '1 gp', 2], 'Spear': ['simple', 'melee', '1d6', 'piercing', ['thrown (20/60)', 'versatile (1d8)'], '1 gp', 3],
    'Light crossbow': ['simple', 'ranged', '1d8', 'piercing', ['ammunition (80/320)', 'loading', 'two-handed'], '25 gp', 5], 'Dart': ['simple', 'ranged', '1d4', 'piercing', ['finesse', 'thrown (20/60)'], '5 cp', 0.25],
    'Shortbow': ['simple', 'ranged', '1d6', 'piercing', ['ammunition (80/320)', 'two-handed'], '25 gp', 2], 'Sling': ['simple', 'ranged', '1d4', 'bludgeoning', ['ammunition (30/120)'], '1 sp', 0],
    'Battleaxe': ['martial', 'melee', '1d8', 'slashing', ['versatile (1d10)'], '10 gp', 4], 'Flail': ['martial', 'melee', '1d8', 'bludgeoning', [], '10 gp', 2],
    'Glaive': ['martial', 'melee', '1d10', 'slashing', ['heavy', 'reach', 'two-handed'], '20 gp', 6], 'Greataxe': ['martial', 'melee', '1d12', 'slashing', ['heavy', 'two-handed'], '30 gp', 7],
    'Greatsword': ['martial', 'melee', '2d6', 'slashing', ['heavy', 'two-handed'], '50 gp', 6], 'Halberd': ['martial', 'melee', '1d10', 'slashing', ['heavy', 'reach', 'two-handed'], '20 gp', 6],
    'Lance': ['martial', 'melee', '1d12', 'piercing', ['reach', 'special'], '10 gp', 6], 'Longsword': ['martial', 'melee', '1d8', 'slashing', ['versatile (1d10)'], '15 gp', 3],
    'Maul': ['martial', 'melee', '2d6', 'bludgeoning', ['heavy', 'two-handed'], '10 gp', 10], 'Morningstar': ['martial', 'melee', '1d8', 'piercing', [], '15 gp', 4],
    'Pike': ['martial', 'melee', '1d10', 'piercing', ['heavy', 'reach', 'two-handed'], '5 gp', 18], 'Rapier': ['martial', 'melee', '1d8', 'piercing', ['finesse'], '25 gp', 2],
    'Scimitar': ['martial', 'melee', '1d6', 'slashing', ['finesse', 'light'], '25 gp', 3], 'Shortsword': ['martial', 'melee', '1d6', 'piercing', ['finesse', 'light'], '10 gp', 2],
    'Trident': ['martial', 'melee', '1d6', 'piercing', ['thrown (20/60)', 'versatile (1d8)'], '5 gp', 4], 'War pick': ['martial', 'melee', '1d8', 'piercing', [], '5 gp', 2],
    'Warhammer': ['martial', 'melee', '1d8', 'bludgeoning', ['versatile (1d10)'], '15 gp', 2], 'Whip': ['martial', 'melee', '1d4', 'slashing', ['finesse', 'reach'], '2 gp', 3],
    'Blowgun': ['martial', 'ranged', '1', 'piercing', ['ammunition (25/100)', 'loading'], '10 gp', 1], 'Hand crossbow': ['martial', 'ranged', '1d6', 'piercing', ['ammunition (30/120)', 'light', 'loading'], '75 gp', 3],
    'Heavy crossbow': ['martial', 'ranged', '1d10', 'piercing', ['ammunition (100/400)', 'heavy', 'loading', 'two-handed'], '50 gp', 18], 'Longbow': ['martial', 'ranged', '1d8', 'piercing', ['ammunition (150/600)', 'heavy', 'two-handed'], '50 gp', 2]
  };
  var WEAPONS = {}; Object.keys(W).forEach(function (n) { var w = W[n]; WEAPONS[n] = { name: n, cat: w[0], kind: w[1], dice: w[2], type: w[3], props: w[4], cost: w[5], weight: w[6] }; });
  // name: [type light/medium/heavy/shield, base AC, dex cap (null = none), strength req, stealth disadvantage, cost, weight]
  var A = {
    'Padded': ['light', 11, null, 0, true, '5 gp', 8], 'Leather': ['light', 11, null, 0, false, '10 gp', 10], 'Studded leather': ['light', 12, null, 0, false, '45 gp', 13],
    'Hide': ['medium', 12, 2, 0, false, '10 gp', 12], 'Chain shirt': ['medium', 13, 2, 0, false, '50 gp', 20], 'Scale mail': ['medium', 14, 2, 0, true, '50 gp', 45],
    'Breastplate': ['medium', 14, 2, 0, false, '400 gp', 20], 'Half plate': ['medium', 15, 2, 0, true, '750 gp', 40], 'Ring mail': ['heavy', 14, 0, 0, true, '30 gp', 40],
    'Chain mail': ['heavy', 16, 0, 13, true, '75 gp', 55], 'Splint': ['heavy', 17, 0, 15, true, '200 gp', 60], 'Plate': ['heavy', 18, 0, 15, true, '1500 gp', 65], 'Shield': ['shield', 2, 0, 0, false, '10 gp', 6]
  };
  var ARMOR = {}; Object.keys(A).forEach(function (n) { var a = A[n]; ARMOR[n] = { name: n, type: a[0], base: a[1], dexCap: a[2], str: a[3], stealthDis: a[4], cost: a[5], weight: a[6] }; });
  var PACKS = {
    "Burglar's Pack": ['Backpack', 'Bag of 1,000 ball bearings', '10 ft of string', 'Bell', '5 candles', 'Crowbar', 'Hammer', '10 pitons', 'Hooded lantern', '2 flasks of oil', '5 days rations', 'Tinderbox', 'Waterskin', '50 ft hempen rope'],
    "Diplomat's Pack": ['Chest', '2 cases for maps and scrolls', 'Fine clothes', 'Bottle of ink', 'Ink pen', 'Lamp', '2 flasks of oil', '5 sheets of paper', 'Vial of perfume', 'Sealing wax', 'Soap'],
    "Dungeoneer's Pack": ['Backpack', 'Crowbar', 'Hammer', '10 pitons', '10 torches', 'Tinderbox', '10 days rations', 'Waterskin', '50 ft hempen rope'],
    "Entertainer's Pack": ['Backpack', 'Bedroll', '2 costumes', '5 candles', '5 days rations', 'Waterskin', 'Disguise kit'],
    "Explorer's Pack": ['Backpack', 'Bedroll', 'Mess kit', 'Tinderbox', '10 torches', '10 days rations', 'Waterskin', '50 ft hempen rope'],
    "Priest's Pack": ['Backpack', 'Blanket', '10 candles', 'Tinderbox', 'Alms box', '2 blocks of incense', 'Censer', 'Vestments', '2 days rations', 'Waterskin'],
    "Scholar's Pack": ['Backpack', 'Book of lore', 'Bottle of ink', 'Ink pen', '10 sheets of parchment', 'Little bag of sand', 'Small knife']
  };
  var TOKENS = { '@simple': 'any simple weapon', '@simplemelee': 'any simple melee weapon', '@martial': 'any martial weapon', '@martialmelee': 'any martial melee weapon', '@instrument': 'any musical instrument' };
  var INSTRUMENTS = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'];
  // kit: slots; each slot = list of options; each option = {l: label, i: [items]}; tokens (@...) get a picker; fixed = always received
  function o(l, i) { return { l: l, i: i }; }
  var KITS = {
    'Barbarian': { slots: [[o('Greataxe', ['Greataxe']), o('Any martial melee weapon', ['@martialmelee'])], [o('Two handaxes', ['Handaxe', 'Handaxe']), o('Any simple weapon', ['@simple'])]], fixed: ["Explorer's Pack", '4 Javelins'] },
    'Bard': { slots: [[o('Rapier', ['Rapier']), o('Longsword', ['Longsword']), o('Any simple weapon', ['@simple'])], [o("Diplomat's Pack", ["Diplomat's Pack"]), o("Entertainer's Pack", ["Entertainer's Pack"])], [o('Lute', ['Lute']), o('Other instrument', ['@instrument'])]], fixed: ['Leather', 'Dagger'] },
    'Cleric': { slots: [[o('Mace', ['Mace']), o('Warhammer', ['Warhammer'])], [o('Scale mail', ['Scale mail']), o('Leather armor', ['Leather']), o('Chain mail', ['Chain mail'])], [o('Light crossbow and 20 bolts', ['Light crossbow', '20 bolts']), o('Any simple weapon', ['@simple'])], [o("Priest's Pack", ["Priest's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: ['Shield', 'Holy symbol'] },
    'Druid': { slots: [[o('Wooden shield', ['Shield']), o('Any simple weapon', ['@simple'])], [o('Scimitar', ['Scimitar']), o('Any simple melee weapon', ['@simplemelee'])]], fixed: ['Leather', "Explorer's Pack", 'Druidic focus'] },
    'Fighter': { slots: [[o('Chain mail', ['Chain mail']), o('Leather, longbow and 20 arrows', ['Leather', 'Longbow', '20 arrows'])], [o('A martial weapon and a shield', ['@martial', 'Shield']), o('Two martial weapons', ['@martial', '@martial'])], [o('Light crossbow and 20 bolts', ['Light crossbow', '20 bolts']), o('Two handaxes', ['Handaxe', 'Handaxe'])], [o("Dungeoneer's Pack", ["Dungeoneer's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: [] },
    'Monk': { slots: [[o('Shortsword', ['Shortsword']), o('Any simple weapon', ['@simple'])], [o("Dungeoneer's Pack", ["Dungeoneer's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: ['10 darts'] },
    'Paladin': { slots: [[o('A martial weapon and a shield', ['@martial', 'Shield']), o('Two martial weapons', ['@martial', '@martial'])], [o('Five javelins', ['5 Javelins']), o('Any simple melee weapon', ['@simplemelee'])], [o("Priest's Pack", ["Priest's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: ['Chain mail', 'Holy symbol'] },
    'Ranger': { slots: [[o('Scale mail', ['Scale mail']), o('Leather armor', ['Leather'])], [o('Two shortswords', ['Shortsword', 'Shortsword']), o('Two simple melee weapons', ['@simplemelee', '@simplemelee'])], [o("Dungeoneer's Pack", ["Dungeoneer's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: ['Longbow', 'Quiver of 20 arrows'] },
    'Rogue': { slots: [[o('Rapier', ['Rapier']), o('Shortsword', ['Shortsword'])], [o('Shortbow and quiver of 20 arrows', ['Shortbow', 'Quiver of 20 arrows']), o('Shortsword', ['Shortsword'])], [o("Burglar's Pack", ["Burglar's Pack"]), o("Dungeoneer's Pack", ["Dungeoneer's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: ['Leather', 'Dagger', 'Dagger', "Thieves' tools"] },
    'Sorcerer': { slots: [[o('Light crossbow and 20 bolts', ['Light crossbow', '20 bolts']), o('Any simple weapon', ['@simple'])], [o('Component pouch', ['Component pouch']), o('Arcane focus', ['Arcane focus'])], [o("Dungeoneer's Pack", ["Dungeoneer's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: ['Dagger', 'Dagger'] },
    'Warlock': { slots: [[o('Light crossbow and 20 bolts', ['Light crossbow', '20 bolts']), o('Any simple weapon', ['@simple'])], [o('Component pouch', ['Component pouch']), o('Arcane focus', ['Arcane focus'])], [o("Scholar's Pack", ["Scholar's Pack"]), o("Dungeoneer's Pack", ["Dungeoneer's Pack"])]], fixed: ['Leather', '@simple', 'Dagger', 'Dagger'] },
    'Wizard': { slots: [[o('Quarterstaff', ['Quarterstaff']), o('Dagger', ['Dagger'])], [o('Component pouch', ['Component pouch']), o('Arcane focus', ['Arcane focus'])], [o("Scholar's Pack", ["Scholar's Pack"]), o("Explorer's Pack", ["Explorer's Pack"])]], fixed: ['Spellbook'] }
  };
  // ---------- spells: name -> [level, school, casting time, range, summary] ----------
  var S = {};
  function sp(lvl, rows) { rows.forEach(function (r) { var p = r.split('|'); S[p[0]] = [lvl, p[1], p[2], p[3], p[4]]; }); }
  sp(0, [
    'Acid Splash|Conjuration|Action|60 ft|Acid hits one or two adjacent creatures: Dex save or 1d6 acid damage.',
    'Blade Ward|Abjuration|Action|Self|Until your next turn, resistance to bludgeoning, piercing and slashing damage from weapon attacks.',
    'Chill Touch|Necromancy|Action|120 ft|Ranged spell attack, 1d8 necrotic; the target cannot regain hit points until your next turn.',
    'Dancing Lights|Evocation|Action|120 ft|Up to four torch-sized lights you can move; concentration, 1 minute.',
    'Druidcraft|Transmutation|Action|30 ft|Tiny nature effects: weather sense, bloom a flower, light or snuff a small flame.',
    'Eldritch Blast|Evocation|Action|120 ft|Ranged spell attack, 1d10 force damage; extra beams at higher levels.',
    'Fire Bolt|Evocation|Action|120 ft|Ranged spell attack, 1d10 fire damage; ignites flammable objects.',
    'Friends|Enchantment|Action|Self|Advantage on Charisma checks against one creature; it realizes afterward. Concentration, 1 minute.',
    'Guidance|Divination|Action|Touch|A creature adds 1d4 to one ability check of its choice. Concentration, 1 minute.',
    'Light|Evocation|Action|Touch|An object sheds bright light in 20 ft for 1 hour.',
    'Mage Hand|Conjuration|Action|30 ft|A spectral hand manipulates objects up to 10 lb for 1 minute.',
    'Mending|Transmutation|1 minute|Touch|Repairs a single break or tear up to 1 ft in an object.',
    'Message|Transmutation|Action|120 ft|Whisper to a creature in range; only it hears and can answer.',
    'Minor Illusion|Illusion|Action|30 ft|Create a sound or an image of an object for 1 minute.',
    'Poison Spray|Conjuration|Action|10 ft|Con save or 1d12 poison damage.',
    'Prestidigitation|Transmutation|Action|10 ft|Minor tricks: sparks, cleaning, tastes, small marks, tiny illusions.',
    'Produce Flame|Conjuration|Action|Self|Flame in hand gives light; hurl it as a ranged spell attack for 1d8 fire.',
    'Ray of Frost|Evocation|Action|60 ft|Ranged spell attack, 1d8 cold; target speed -10 ft until your next turn.',
    'Resistance|Abjuration|Action|Touch|A creature adds 1d4 to one saving throw of its choice. Concentration, 1 minute.',
    'Sacred Flame|Evocation|Action|60 ft|Dex save or 1d8 radiant damage; cover does not help.',
    'Shillelagh|Transmutation|Bonus action|Touch|Club or quarterstaff uses your spellcasting ability and deals 1d8 for 1 minute.',
    'Shocking Grasp|Evocation|Action|Touch|Melee spell attack (advantage vs metal armor), 1d8 lightning; no reactions until its next turn.',
    'Spare the Dying|Necromancy|Action|Touch|Stabilize a creature with 0 hit points.',
    'Thaumaturgy|Transmutation|Action|30 ft|Minor wonders: booming voice, flickering flames, tremors, altered eyes.',
    'True Strike|Divination|Action|30 ft|Advantage on your first attack against a target on your next turn. Concentration.',
    'Vicious Mockery|Enchantment|Action|60 ft|Wis save or 1d4 psychic damage and disadvantage on its next attack roll.'
  ]);
  sp(1, [
    'Alarm|Abjuration|1 minute|30 ft|Ritual. Warns you when a creature enters a ward for 8 hours.',
    'Animal Friendship|Enchantment|Action|30 ft|Wis save or a beast (Int 3 or less) is charmed for 24 hours.',
    'Armor of Agathys|Abjuration|Action|Self|5 temporary HP; melee attackers take 5 cold damage while they last.',
    'Arms of Hadar|Conjuration|Action|Self (10 ft)|Str save or 2d6 necrotic and no reactions; half on success.',
    'Bane|Enchantment|Action|30 ft|Up to three creatures subtract 1d4 from attacks and saves (Cha save). Concentration.',
    'Bless|Enchantment|Action|30 ft|Up to three creatures add 1d4 to attacks and saves. Concentration, 1 minute.',
    'Burning Hands|Evocation|Action|Self (15 ft cone)|Dex save or 3d6 fire; half on success.',
    'Charm Person|Enchantment|Action|30 ft|Wis save or a humanoid is charmed for 1 hour.',
    'Color Spray|Illusion|Action|Self (15 ft cone)|Blinds creatures with the lowest HP (6d10 total HP affected).',
    'Command|Enchantment|Action|60 ft|Wis save or the target obeys a one-word command on its next turn.',
    'Comprehend Languages|Divination|Action|Self|Ritual. Understand any spoken or written language for 1 hour.',
    'Create or Destroy Water|Transmutation|Action|30 ft|Create up to 10 gallons of water, or destroy fog / up to 30 ft cube of water.',
    'Cure Wounds|Evocation|Action|Touch|Heal 1d8 + spellcasting modifier.',
    'Detect Evil and Good|Divination|Action|Self|Sense aberrations, celestials, elementals, fey, fiends, undead within 30 ft. Concentration.',
    'Detect Magic|Divination|Action|Self|Ritual. Sense magic within 30 ft and learn its school. Concentration, 10 minutes.',
    'Detect Poison and Disease|Divination|Action|Self|Ritual. Sense poisons, poisonous creatures and diseases within 30 ft.',
    'Disguise Self|Illusion|Action|Self|Change your appearance for 1 hour.',
    'Dissonant Whispers|Enchantment|Action|60 ft|Wis save or 3d6 psychic and flee in fear; half and no fear on success.',
    'Entangle|Conjuration|Action|90 ft|Grasping plants restrain creatures in a 20 ft square (Str save). Concentration.',
    'Expeditious Retreat|Transmutation|Bonus action|Self|Dash as a bonus action each turn. Concentration, 10 minutes.',
    'Faerie Fire|Evocation|Action|60 ft|Dex save or creatures in a 20 ft cube glow; attacks against them have advantage. Concentration.',
    'False Life|Necromancy|Action|Self|Gain 1d4 + 4 temporary hit points for 1 hour.',
    'Feather Fall|Transmutation|Reaction|60 ft|Up to five falling creatures descend slowly and take no fall damage.',
    'Find Familiar|Conjuration|1 hour|10 ft|Ritual. Summon a spirit that takes an animal form and serves you.',
    'Fog Cloud|Conjuration|Action|120 ft|Heavily obscuring 20 ft radius fog. Concentration, 1 hour.',
    'Goodberry|Transmutation|Action|Touch|Create ten berries, each heals 1 HP and feeds for a day.',
    'Grease|Conjuration|Action|60 ft|10 ft square of slick ground; Dex save or fall prone.',
    'Guiding Bolt|Evocation|Action|120 ft|Ranged spell attack, 4d6 radiant; the next attack against the target has advantage.',
    'Healing Word|Evocation|Bonus action|60 ft|Heal 1d4 + spellcasting modifier at range.',
    'Hellish Rebuke|Evocation|Reaction|60 ft|When damaged: Dex save or 2d10 fire to the attacker; half on success.',
    'Heroism|Enchantment|Action|Touch|Immune to fright and gain temporary HP equal to your casting modifier each turn. Concentration.',
    'Hex|Enchantment|Bonus action|90 ft|Curse a creature: +1d6 necrotic on your hits and disadvantage on one ability. Concentration.',
    'Identify|Divination|1 minute|Touch|Ritual. Learn the properties of a magic item or spell on a creature.',
    'Illusory Script|Illusion|1 minute|Touch|Ritual. Write in a script only chosen readers can understand.',
    'Inflict Wounds|Necromancy|Action|Touch|Melee spell attack, 3d10 necrotic damage.',
    'Jump|Transmutation|Action|Touch|Triple a creature\'s jump distance for 1 minute.',
    'Longstrider|Transmutation|Action|Touch|Speed +10 ft for 1 hour.',
    'Mage Armor|Abjuration|Action|Touch|Unarmored target has base AC 13 + Dex for 8 hours.',
    'Magic Missile|Evocation|Action|120 ft|Three darts, each 1d4 + 1 force damage, auto-hit.',
    'Protection from Evil and Good|Abjuration|Action|Touch|Aberrations, celestials, elementals, fey, fiends and undead have disadvantage to hit the target. Concentration.',
    'Purify Food and Drink|Transmutation|Action|10 ft|Ritual. Removes poison and disease from food and drink.',
    'Ray of Sickness|Necromancy|Action|60 ft|Ranged spell attack, 2d8 poison and poisoned until end of your next turn (Con save).',
    'Sanctuary|Abjuration|Bonus action|30 ft|Attackers must make a Wis save to target the creature; ends if it attacks.',
    'Shield|Abjuration|Reaction|Self|+5 AC until your next turn and no damage from magic missile.',
    'Shield of Faith|Abjuration|Bonus action|60 ft|+2 AC to one creature. Concentration, 10 minutes.',
    'Silent Image|Illusion|Action|60 ft|Create a moving image of an object or creature. Concentration, 10 minutes.',
    'Sleep|Enchantment|Action|90 ft|Puts creatures to sleep, starting with lowest HP (5d8 HP total).',
    'Speak with Animals|Divination|Action|Self|Ritual. Talk with beasts for 10 minutes.',
    'Tasha\'s Hideous Laughter|Enchantment|Action|30 ft|Wis save or fall prone laughing and incapacitated. Concentration.',
    'Thunderwave|Evocation|Action|Self (15 ft cube)|Con save or 2d8 thunder and pushed 10 ft; half on success.',
    'Unseen Servant|Conjuration|Action|60 ft|Ritual. An invisible force performs simple tasks for 1 hour.',
    'Witch Bolt|Evocation|Action|30 ft|Ranged spell attack, 1d12 lightning; keep dealing 1d12 each turn. Concentration.'
  ]);
  var SPELLS = {}; Object.keys(S).forEach(function (n) { var s = S[n]; SPELLS[n] = { name: n, level: s[0], school: s[1], time: s[2], range: s[3], text: s[4] }; });
  function L(s) { return s.split(',').map(function (x) { return x.trim(); }); }
  var CLASS_SPELLS = {
    'Bard': { 0: L('Blade Ward, Dancing Lights, Friends, Light, Mage Hand, Mending, Message, Minor Illusion, Prestidigitation, True Strike, Vicious Mockery'),
      1: L('Animal Friendship, Bane, Charm Person, Comprehend Languages, Cure Wounds, Detect Magic, Disguise Self, Dissonant Whispers, Faerie Fire, Feather Fall, Healing Word, Heroism, Identify, Illusory Script, Longstrider, Silent Image, Sleep, Speak with Animals, Tasha\'s Hideous Laughter, Thunderwave, Unseen Servant') },
    'Cleric': { 0: L('Guidance, Light, Mending, Resistance, Sacred Flame, Spare the Dying, Thaumaturgy'),
      1: L('Bane, Bless, Command, Create or Destroy Water, Cure Wounds, Detect Evil and Good, Detect Magic, Detect Poison and Disease, Guiding Bolt, Healing Word, Inflict Wounds, Protection from Evil and Good, Purify Food and Drink, Sanctuary, Shield of Faith') },
    'Druid': { 0: L('Druidcraft, Guidance, Mending, Poison Spray, Produce Flame, Resistance, Shillelagh'),
      1: L('Animal Friendship, Charm Person, Create or Destroy Water, Cure Wounds, Detect Magic, Detect Poison and Disease, Entangle, Faerie Fire, Fog Cloud, Goodberry, Healing Word, Jump, Longstrider, Purify Food and Drink, Speak with Animals, Thunderwave') },
    'Sorcerer': { 0: L('Acid Splash, Blade Ward, Chill Touch, Dancing Lights, Fire Bolt, Friends, Light, Mage Hand, Mending, Message, Minor Illusion, Poison Spray, Prestidigitation, Ray of Frost, Shocking Grasp, True Strike'),
      1: L('Burning Hands, Charm Person, Color Spray, Comprehend Languages, Detect Magic, Disguise Self, Expeditious Retreat, False Life, Feather Fall, Fog Cloud, Jump, Mage Armor, Magic Missile, Ray of Sickness, Shield, Silent Image, Sleep, Thunderwave') },
    'Warlock': { 0: L('Blade Ward, Chill Touch, Eldritch Blast, Friends, Mage Hand, Minor Illusion, Poison Spray, Prestidigitation, True Strike'),
      1: L('Armor of Agathys, Arms of Hadar, Charm Person, Comprehend Languages, Expeditious Retreat, Hellish Rebuke, Hex, Illusory Script, Protection from Evil and Good, Unseen Servant, Witch Bolt') },
    'Wizard': { 0: L('Acid Splash, Blade Ward, Chill Touch, Dancing Lights, Fire Bolt, Friends, Light, Mage Hand, Mending, Message, Minor Illusion, Poison Spray, Prestidigitation, Ray of Frost, Shocking Grasp, True Strike'),
      1: L('Alarm, Burning Hands, Charm Person, Color Spray, Comprehend Languages, Detect Magic, Disguise Self, Expeditious Retreat, False Life, Feather Fall, Find Familiar, Fog Cloud, Grease, Identify, Illusory Script, Jump, Longstrider, Mage Armor, Magic Missile, Protection from Evil and Good, Ray of Sickness, Shield, Silent Image, Sleep, Tasha\'s Hideous Laughter, Thunderwave, Unseen Servant') }
  };
  var ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];
  var api = { WEAPONS: WEAPONS, ARMOR: ARMOR, PACKS: PACKS, KITS: KITS, TOKENS: TOKENS, INSTRUMENTS: INSTRUMENTS, SPELLS: SPELLS, CLASS_SPELLS: CLASS_SPELLS, ALIGNMENTS: ALIGNMENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DNDDATA = api;
})(typeof window !== 'undefined' ? window : this);
