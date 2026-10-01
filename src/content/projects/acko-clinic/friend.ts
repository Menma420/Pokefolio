import { QuestionTree } from '../../../domain/types';
import { ID_ACKO_CLINIC } from './index';
import { AUDIENCE_FRIEND } from '../../audiences';

export const AckoClinicFriendTree: QuestionTree = {
  projectId: ID_ACKO_CLINIC,
  audienceId: AUDIENCE_FRIEND,
  status: 'stub',
  rootPrompt: { pages: ['What is this?'] },
  topics: [
    {
      id: 'node-f-o1',
      topicKey: 'what',
      label: 'What does this app do?',
      answer: { pages: ['It helps clinics schedule things.'] }
    },
    {
      id: 'node-f-o2',
      label: 'Was it fun to make?',
      answer: { pages: ['Yes, quite interesting.'] }
    }
  ]
};
