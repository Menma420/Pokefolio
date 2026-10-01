import { QuestionTree } from '../../../domain/types';
import { ID_ACKO_CLINIC } from './index';
import { AUDIENCE_ENGINEER } from '../../audiences';

export const AckoClinicEngineerTree: QuestionTree = {
  projectId: ID_ACKO_CLINIC,
  audienceId: AUDIENCE_ENGINEER,
  status: 'stub',
  rootPrompt: { pages: ['Show me the architecture.'] },
  topics: [
    {
      id: 'node-e-o1',
      topicKey: 'how',
      label: 'How does the routing work?',
      answer: { pages: ['Server logic here.'] }
    },
    {
      id: 'node-e-o2',
      topicKey: 'why',
      label: 'Why this architecture?',
      answer: { pages: ['It provided better concurrency.'] }
    }
  ]
};
