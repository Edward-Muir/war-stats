// Super-faction groupings for two-stage faction picker.
// Faction names must match index.json exactly.

export interface SuperFaction {
  id: string;
  name: string;
  factions: readonly string[];
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
      'Space Marines',
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
