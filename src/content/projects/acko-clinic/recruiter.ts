import { QuestionTree } from '../../../domain/types';
import { ID_ACKO_CLINIC } from './index';
import { AUDIENCE_RECRUITER } from '../../audiences';

export const AckoClinicRecruiterTree: QuestionTree = {
  projectId: ID_ACKO_CLINIC,
  audienceId: AUDIENCE_RECRUITER,
  status: 'stub',
  rootPrompt: { pages: ['What did you build?'] },
  topics: [
    {
      id: 'node-r-o1',
      topicKey: 'what',
      label: 'What did you build?',
      answer: { pages: ['I built the clinic backend.'] },
      children: [
        {
          id: 'node-r-o1-c1',
          label: 'What was your role?',
          answer: { pages: ['I led the backend migration.'] }
        },
        {
          id: 'node-r-o1-c2',
          label: 'Why did it matter?',
          answer: { pages: ['It unblocked clinic scheduling.'] } // No fabricated metrics allowed
        }
      ]
    },
    {
      id: 'node-r-o2',
      topicKey: 'hard',
      label: 'What was the hardest part?',
      answer: { pages: ['Coordinating the legacy integration.'] }
    }
  ]
};
