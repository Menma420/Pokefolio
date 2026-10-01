import { validateContent } from '../src/domain/validators';
import { AudienceId } from '../src/domain/types';
import { AUDIENCE_ENGINEER, AUDIENCE_FRIEND, AUDIENCE_RECRUITER } from '../src/content/audiences';
import { getParty } from '../src/content/party';
import { getAuthoredTrees, getProjectDefinitions } from '../src/content/registry';

const parties = {
  [AUDIENCE_RECRUITER]: getParty(AUDIENCE_RECRUITER),
  [AUDIENCE_ENGINEER]: getParty(AUDIENCE_ENGINEER),
  [AUDIENCE_FRIEND]: getParty(AUDIENCE_FRIEND),
} as Record<AudienceId, ReturnType<typeof getParty>>;

const result = validateContent(
  getProjectDefinitions(),
  getAuthoredTrees(),
  parties,
  process.env.STRICT_RELEASE === 'true',
);

if (!result.ok) {
  console.error('Content validation failed:');
  for (const issue of result.error.errors) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${getAuthoredTrees().length} authored project/audience trees.`);
}
