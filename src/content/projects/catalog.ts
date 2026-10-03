import { ProjectDef, ProjectId } from '../../domain/types';
import battleAssets from '../../../assets-src/battle/manifest.json';
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

const visualLabels: Record<string, {plateName:string;shortName:string;tagline:string}> = {
 ACKO_CLINIC:{plateName:'ACKO CLINIC',shortName:'ACKO CLINIC',tagline:'Clinic journeys and backend services.'},
 KARSH:{plateName:'KARSH',shortName:'KARSH',tagline:'Track capability and personal growth.'},
 NOMNOM:{plateName:'NOMNOM PLANNER',shortName:'NOMNOM',tagline:'Personalized meal planning.'},
 POKEFOLIO:{plateName:'POKEFOLIO',shortName:'POKEFOLIO',tagline:'A playable portfolio and interview.'},
 PDF_QA:{plateName:'PDF-QA',shortName:'PDF-QA',tagline:'Ask questions about PDF documents.'},
 WEATHER_PI:{plateName:'WEATHERPI',shortName:'WEATHERPI',tagline:'Collect and explore sensor readings.'},
 PORT_SCANNER:{plateName:'PORTSCANNER',shortName:'PORTSCANNER',tagline:'Concurrent TCP discovery from a CLI.'},
 PARALLEL_DISTRIBUTED_COMPUTING:{plateName:'PARALLEL COMPUTING',shortName:'PARALLEL',tagline:'Parallel and distributed coursework.'},
 ARISE:{plateName:'ARISE',shortName:'ARISE',tagline:'A system for personal productivity.'},
 POKEMON_ELO_RATING:{plateName:'POKEMON ELO RATING',shortName:'POKEMON ELO',tagline:'Matchup ranking with the Elo system.'},
 VANIX:{plateName:'VANIX',shortName:'VANIX',tagline:'Explore real-time voice rooms.'},
 CHATROOM_APP:{plateName:'CHATROOMAPP',shortName:'CHATROOMAPP',tagline:'A real-time chat application.'},
};

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
    ...visualLabels[definition.id],
    artKey: definition.slug,
    logo: { src: (battleAssets as Record<string,{src:string}>)[`project-${definition.slug}`]!.src, alt: `${definition.name} logo` },
    thumb: { src: (battleAssets as Record<string,{src:string}>)[`thumb-${definition.slug}`]!.src, alt: `${definition.name} icon` },
    alt: definition.name,
  },
}));

export const PROJECTS_BY_ID = new Map(PROJECTS.map((project) => [project.id, project]));
