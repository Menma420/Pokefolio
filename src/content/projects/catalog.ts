import { ProjectDef, ProjectId } from '../../domain/types';
import { PROJECT_TYPES } from '../../domain/project-types';

export const PROJECT_IDS = {
  ACKO_CLINIC: 'ACKO_CLINIC' as ProjectId,
  KARSH: 'KARSH' as ProjectId,
  NOMNOM: 'NOMNOM' as ProjectId,
  POKEFOLIO: 'POKEFOLIO' as ProjectId,
  PDF_QA: 'PDF_QA' as ProjectId,
  WEATHER_PI: 'WEATHER_PI' as ProjectId,
  PORT_SCANNER: 'PORT_SCANNER' as ProjectId,
  PARALLEL_DISTRIBUTED_COMPUTING: 'PARALLEL_DISTRIBUTED_COMPUTING' as ProjectId,
  ARISE: 'ARISE' as ProjectId,
  POKEMON_ELO_RATING: 'POKEMON_ELO_RATING' as ProjectId,
  VANIX: 'VANIX' as ProjectId,
  CHATROOM_APP: 'CHATROOM_APP' as ProjectId,
} as const satisfies Record<string, string>;

const definitions: Array<{
  id: keyof typeof PROJECT_IDS;
  slug: string;
  name: string;
  type: string;
  summary: string;
  url: string;
}> = [
  { id: 'ACKO_CLINIC', slug: 'acko-clinic', name: 'Acko Clinic', type: PROJECT_TYPES.BACKEND, summary: 'Clinic Journey Management and adjacent backend workflows.', url: 'https://github.com/Menma420' },
  { id: 'KARSH', slug: 'karsh', name: 'Karsh', type: PROJECT_TYPES.FULL_STACK, summary: 'A personal system for tracking and understanding capability over time.', url: 'https://github.com/Menma420/Karsh' },
  { id: 'NOMNOM', slug: 'nomnom-planner', name: 'NomNom Planner', type: PROJECT_TYPES.FULL_STACK, summary: 'A full-stack product for personalized meal planning.', url: 'https://github.com/Menma420/NomNom-Planner' },
  { id: 'POKEFOLIO', slug: 'pokefolio', name: 'Pokefolio', type: PROJECT_TYPES.FULL_STACK, summary: 'A Pokémon-inspired portfolio and interview experience.', url: 'https://github.com/Menma420/Pokefolio' },
  { id: 'PDF_QA', slug: 'pdf-qa', name: 'PDF-QA', type: PROJECT_TYPES.AI, summary: 'A system for asking questions about PDF documents.', url: 'https://github.com/Menma420/PDF-QA' },
  { id: 'WEATHER_PI', slug: 'weatherpi', name: 'WeatherPi', type: PROJECT_TYPES.IOT, summary: 'An IoT project that collects and presents sensor readings.', url: 'https://github.com/Menma420/WeatherPi' },
  { id: 'PORT_SCANNER', slug: 'portscanner', name: 'PortScanner', type: PROJECT_TYPES.NETWORKING, summary: 'A concurrent TCP port scanner with a command-line interface.', url: 'https://github.com/Menma420/PortScanner' },
  { id: 'PARALLEL_DISTRIBUTED_COMPUTING', slug: 'parallel-distributed-computing', name: 'Parallel-Distributed Computing', type: PROJECT_TYPES.BACKEND, summary: 'Coursework exploring parallel and distributed computing.', url: 'https://github.com/Menma420/Parallel-Distributed_Computing' },
  { id: 'ARISE', slug: 'arise', name: 'Arise', type: PROJECT_TYPES.FULL_STACK, summary: 'A Solo Leveling-inspired productivity application.', url: 'https://github.com/Menma420/Arise' },
  { id: 'POKEMON_ELO_RATING', slug: 'pokemon-elo-rating', name: 'Pokémon Elo Rating', type: PROJECT_TYPES.FULL_STACK, summary: 'A Pokémon matchup and Elo ranking project.', url: 'https://github.com/Menma420/PokemonEloRating' },
  { id: 'VANIX', slug: 'vanix', name: 'Vanix', type: PROJECT_TYPES.FULL_STACK, summary: 'A project exploring real-time voice rooms.', url: 'https://github.com/Menma420/Vanix' },
  { id: 'CHATROOM_APP', slug: 'chatroomapp', name: 'ChatRoomApp', type: PROJECT_TYPES.FULL_STACK, summary: 'A chat application project.', url: 'https://github.com/Menma420/ChatRoomApp' },
];

export const PROJECTS: ProjectDef[] = definitions.map((definition) => ({
  id: PROJECT_IDS[definition.id],
  slug: definition.slug,
  name: definition.name,
  tagline: definition.summary,
  type: definition.type as ProjectDef['type'],
  technologies: [],
  role: definition.id === 'ACKO_CLINIC' ? 'Backend engineering intern' : 'Project author',
  period: 'Not specified',
  summary: { pages: [definition.summary] },
  overview: [],
  impact: [],
  links: { primary: { label: 'GitHub repository', url: definition.url }, others: [] },
  visual: {
    logo: { src: `/game/projects/${definition.slug}/logo.png`, alt: `${definition.name} logo` },
    thumb: { src: `/game/projects/${definition.slug}/thumb.png`, alt: `${definition.name} icon` },
    alt: definition.name,
  },
}));

export const PROJECTS_BY_ID = new Map(PROJECTS.map((project) => [project.id, project]));
