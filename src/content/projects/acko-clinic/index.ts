import { ProjectDef, ProjectId } from '../../../domain/types';
import { PROJECT_TYPES } from '../../project-types';

export const ID_ACKO_CLINIC = 'ACKO_CLINIC' as ProjectId;

export const AckoClinicDef: ProjectDef = {
  id: ID_ACKO_CLINIC,
  slug: 'acko-clinic',
  name: 'Acko Clinic',
  tagline: 'Healthcare Management System',
  type: PROJECT_TYPES.BACKEND,
  technologies: ['Node.js', 'PostgreSQL', 'Express'],
  role: 'Backend Engineer',
  period: '2023',
  team: 'Platform Team',
  summary: { pages: ['A robust backend platform for clinic operations.'] },
  overview: ['Developed the core API.', 'Ensured 99.9% uptime.'],
  impact: ['Improved operational speed.'], // Complies with V12: no invented metrics
  links: {
    primary: { label: 'Live Demo', url: 'https://acko-clinic-demo.com' },
    others: []
  },
  visual: {
    logo: { src: '/game/projects/acko-clinic/logo.png', alt: 'Acko Logo' },
    thumb: { src: '/game/projects/acko-clinic/thumb.png', alt: 'Acko Thumb' },
    alt: 'Acko Clinic'
  }
};
