import { AudienceId, ProjectId } from '../domain/types';
import { PROJECT_IDS } from './projects/catalog';

const PARTIES: Record<string, readonly ProjectId[]> = {
  RECRUITER: [
    PROJECT_IDS.ACKO_CLINIC,
    PROJECT_IDS.KARSH,
    PROJECT_IDS.NOMNOM,
    PROJECT_IDS.POKEFOLIO,
    PROJECT_IDS.PDF_QA,
    PROJECT_IDS.WEATHER_PI,
  ] as ProjectId[],
  ENGINEER: [
    PROJECT_IDS.ACKO_CLINIC,
    PROJECT_IDS.POKEFOLIO,
    PROJECT_IDS.PORT_SCANNER,
    PROJECT_IDS.PDF_QA,
    PROJECT_IDS.WEATHER_PI,
    PROJECT_IDS.PARALLEL_DISTRIBUTED_COMPUTING,
  ] as ProjectId[],
  FRIEND: [
    PROJECT_IDS.POKEFOLIO,
    PROJECT_IDS.KARSH,
    PROJECT_IDS.ARISE,
    PROJECT_IDS.POKEMON_ELO_RATING,
    PROJECT_IDS.VANIX,
    PROJECT_IDS.CHATROOM_APP,
  ] as ProjectId[],
};

export function getParty(audienceId: AudienceId): ProjectId[] {
  return [...(PARTIES[audienceId] ?? [])];
}
