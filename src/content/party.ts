import { PartyConfig } from '../domain/types';
import { ID_ACKO_CLINIC } from './projects/acko-clinic';
import { ID_BMA, ID_PDF, ID_PORT, ID_NOMNOM, ID_IOT } from './projects/seeds';

export const Party: PartyConfig = {
  activeProjectIds: [
    ID_ACKO_CLINIC,
    ID_BMA,
    ID_PDF,
    ID_PORT,
    ID_NOMNOM,
    ID_IOT
  ],
  defaultFirst: ID_ACKO_CLINIC,
};
