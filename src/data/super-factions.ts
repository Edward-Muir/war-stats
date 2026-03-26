// Super-faction groupings for two-stage faction picker.
// Faction names must match index.json exactly.

export interface Chapter {
  name: string;
  factionSlug: string;
  chapterKeyword: string;
  unitCount?: number;
}

export interface SuperFaction {
  id: string;
  name: string;
  factions: readonly string[];
  chapters?: readonly Chapter[];
}

export const SUPER_FACTIONS: readonly SuperFaction[] = [
  {
    id: 'imperium',
    name: 'Imperium',
    factions: [
      'Adepta Sororitas',
      'Adeptus Custodes',
      'Adeptus Mechanicus',
      'Astra Militarum',
      'Grey Knights',
      'Imperial Agents',
      'Imperial Knights',
    ],
  },
  {
    id: 'space-marines',
    name: 'Space Marines',
    factions: [],
    chapters: [
      {
        name: 'Space Wolves',
        factionSlug: 'space-marines',
        chapterKeyword: 'SPACE WOLVES',
        unitCount: 41,
      },
      {
        name: 'Blood Angels',
        factionSlug: 'space-marines',
        chapterKeyword: 'BLOOD ANGELS',
        unitCount: 26,
      },
      {
        name: 'Black Templars',
        factionSlug: 'space-marines',
        chapterKeyword: 'BLACK TEMPLARS',
        unitCount: 19,
      },
      {
        name: 'Dark Angels',
        factionSlug: 'space-marines',
        chapterKeyword: 'DARK ANGELS',
        unitCount: 19,
      },
      {
        name: 'Ultramarines',
        factionSlug: 'space-marines',
        chapterKeyword: 'ULTRAMARINES',
        unitCount: 15,
      },
      {
        name: 'Deathwatch',
        factionSlug: 'space-marines',
        chapterKeyword: 'DEATHWATCH',
        unitCount: 11,
      },
      {
        name: 'Imperial Fists',
        factionSlug: 'space-marines',
        chapterKeyword: 'IMPERIAL FISTS',
        unitCount: 3,
      },
      {
        name: 'Salamanders',
        factionSlug: 'space-marines',
        chapterKeyword: 'SALAMANDERS',
        unitCount: 2,
      },
      {
        name: 'Raven Guard',
        factionSlug: 'space-marines',
        chapterKeyword: 'RAVEN GUARD',
        unitCount: 2,
      },
      {
        name: 'Iron Hands',
        factionSlug: 'space-marines',
        chapterKeyword: 'IRON HANDS',
        unitCount: 2,
      },
      {
        name: 'White Scars',
        factionSlug: 'space-marines',
        chapterKeyword: 'WHITE SCARS',
        unitCount: 2,
      },
      {
        name: 'Blood Ravens',
        factionSlug: 'space-marines',
        chapterKeyword: 'BLOOD RAVENS',
        unitCount: 2,
      },
      { name: 'Other Chapters', factionSlug: 'space-marines', chapterKeyword: 'ADEPTUS ASTARTES' },
    ],
  },
  {
    id: 'chaos',
    name: 'Chaos',
    factions: [
      'Chaos Daemons',
      'Chaos Knights',
      'Chaos Space Marines',
      'Death Guard',
      'Emperors Children',
      'Thousand Sons',
      'World Eaters',
    ],
  },
  {
    id: 'aeldari',
    name: 'Aeldari',
    factions: ['Aeldari', 'Drukhari'],
  },
  {
    id: 'tyranids',
    name: 'Hive Mind',
    factions: ['Tyranids', 'Genestealer Cults'],
  },
  {
    id: 'xenos',
    name: 'Xenos',
    factions: ['Necrons', 'Orks', 'Tau Empire', 'Leagues Of Votann'],
  },
  {
    id: 'other',
    name: 'Other',
    factions: ['Adeptus Titanicus', 'Unaligned Forces'],
  },
];
