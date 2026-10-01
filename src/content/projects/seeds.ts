import { ProjectDef, ProjectId } from '../../domain/types';
import { PROJECT_TYPES } from '../project-types';

export const ID_BMA = 'BMA_DAPP' as ProjectId;
export const ID_PDF = 'PDF_QA' as ProjectId;
export const ID_PORT = 'MINI_PORT' as ProjectId;
export const ID_NOMNOM = 'NOMNOM' as ProjectId;
export const ID_IOT = 'IOT_WEATHER' as ProjectId;

const generateStub = (id: ProjectId, name: string, type: string): ProjectDef => ({
  id,
  slug: name.toLowerCase().replace(/ /g, '-'),
  name,
  tagline: 'Placeholder stub',
  type: type as any,
  technologies: ['Stub'],
  role: 'Developer',
  period: '2023',
  summary: { pages: ['Stub summary'] },
  overview: ['Stub overview'],
  impact: ['Stub impact'],
  links: { primary: { label: 'GitHub', url: 'https://github.com/placeholder' }, others: [] },
  visual: {
    logo: { src: '/placeholder.png' },
    thumb: { src: '/placeholder.png' },
    alt: name
  }
});

export const BmaDef = generateStub(ID_BMA, 'Buy Me A Coffee dApp', PROJECT_TYPES.BLOCKCHAIN);
export const PdfDef = generateStub(ID_PDF, 'PDF QA', PROJECT_TYPES.AI);
export const PortDef = generateStub(ID_PORT, 'Mini Port Scanner', PROJECT_TYPES.NETWORKING);
export const NomDef = generateStub(ID_NOMNOM, 'NomNom Planner', PROJECT_TYPES.FULL_STACK);
export const IotDef = generateStub(ID_IOT, 'IoT Weather', PROJECT_TYPES.IOT);
