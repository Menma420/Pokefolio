/** Optional fictional world flavor. No professional facts or exclusive portfolio content. */
export const WORLD_FLAVOR: Record<string, { text: string; repeat?: string; discovery?: string }> = {
  'route-guide': {
    text: 'The paths loop around the pond. The woodland trail starts beyond the cottage.',
    repeat: 'The town is small. There is still something around the next corner.',
  },
  'route-neighbor': {
    text: 'I take a little walk while the kettle warms. No need to hurry.',
    repeat: 'Still walking. Still waiting for that kettle.',
  },
  'town-sign': {
    text: 'Village green: south. Woodland trail: east. X opens your menu; Y opens your Bag.',
  },
  'route-sign': { text: 'A quiet lane. Someone nearby looks ready for a conversation.' },
  'forest-sign': { text: 'Woodland loop. Keep to the path; take a look around the corners.' },
  'grand-tree-note': {
    text: 'A note between the roots: "There are only two hard things: naming things, cache invalidation, and off-by-one errors."',
    repeat: 'The note is still here. The tree keeps its secrets cached.',
    discovery: 'grand-tree-note',
  },
  'forest-cache': {
    text: 'Under a smooth stone: a tiny wooden knight. A quiet reward for taking the long way round.',
    repeat: 'The little knight marks your favorite corner of the route.',
    discovery: 'forest-knight',
  },
  'home-shelf': {
    text: 'A shelf of notebooks, a spare key, and a bookmark. It feels like someone will be back soon.',
  },
  'workshop-note': {
    text: 'A handwritten workshop rule: "Make it work. Understand why it works. Leave a note for the next person."',
  },
  'cottage-note': {
    text: 'A guest book reads: "The best shortcut sometimes takes the scenic route."',
  },
};
