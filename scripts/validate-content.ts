import { validateContent } from '../src/domain/validators';
import { Party } from '../src/content/party';
import { AckoClinicDef } from '../src/content/projects/acko-clinic';
import { AckoClinicRecruiterTree } from '../src/content/projects/acko-clinic/recruiter';
import { AckoClinicEngineerTree } from '../src/content/projects/acko-clinic/engineer';
import { AckoClinicFriendTree } from '../src/content/projects/acko-clinic/friend';
import { BmaDef, PdfDef, PortDef, NomDef, IotDef } from '../src/content/projects/seeds';
import { QuestionTree } from '../src/domain/types';

// Accumulating current content
const projects = [AckoClinicDef, BmaDef, PdfDef, PortDef, NomDef, IotDef];

// In a real load it parses `.ts` files, here we directly import
const trees: QuestionTree[] = [
  ...[AckoClinicRecruiterTree, AckoClinicEngineerTree, AckoClinicFriendTree],
];

// Replicate missing stubs dynamically for validation testing
for (const p of [BmaDef, PdfDef, PortDef, NomDef, IotDef]) {
  trees.push({
    projectId: p.id, audienceId: 'RECRUITER' as any, status: 'stub',
    topics: [{ id: `1-${p.id}`, label: 'a', answer: { pages: ['x'] }, topicKey: 'what' }, { id: `2-${p.id}`, label: 'b', answer: { pages: ['y'] }, topicKey: 'how' }]
  });
  trees.push({
    projectId: p.id, audienceId: 'ENGINEER' as any, status: 'stub',
    topics: [{ id: `3-${p.id}`, label: 'a', answer: { pages: ['x'] }, topicKey: 'why' }, { id: `4-${p.id}`, label: 'b', answer: { pages: ['y'] }, topicKey: 'hard' }]
  });
  trees.push({
    projectId: p.id, audienceId: 'FRIEND' as any, status: 'stub',
    topics: [{ id: `5-${p.id}`, label: 'a', answer: { pages: ['x'] }, topicKey: 'what' }, { id: `6-${p.id}`, label: 'b', answer: { pages: ['y'] }, topicKey: 'how' }]
  });
}

const isReleaseMode = process.env.STRICT_RELEASE === 'true';

const result = validateContent(projects, trees, Party, isReleaseMode);

if (!result.ok) {
  console.error('\x1b[31;1mCRITICAL CONTENT VALIDATION FAILURES:\x1b[0m');
  for (const err of result.error.errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log('\x1b[32;1mContent Validated Successfully (V1-V13)\x1b[0m');
process.exit(0);
