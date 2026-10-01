import { AudienceId, AudienceDef } from '../domain/types';

export const AUDIENCE_RECRUITER = 'RECRUITER' as AudienceId;
export const AUDIENCE_ENGINEER = 'ENGINEER' as AudienceId;
export const AUDIENCE_FRIEND = 'FRIEND' as AudienceId;

export const Audiences: Record<string, AudienceDef> = {
  [AUDIENCE_RECRUITER]: {
    id: AUDIENCE_RECRUITER,
    choiceLabel: "I'm hiring",
    challengerTitle: "Recruiter",
    announcement: "Recruiter wants to battle!",
    portraitKey: "portrait-recruiter",
    greetings: { repeat: ["Let's talk business."] },
    reactions: {
      'project-entry': ["Interesting scope."],
      'project-switch': ["Let's look at this one."],
      'detail-open': ["Tell me more about the impact."],
      'answer-return': ["Got it."],
      'known-content': ["We covered this part."],
    }
  },
  [AUDIENCE_ENGINEER]: {
    id: AUDIENCE_ENGINEER,
    choiceLabel: "I'm an engineer",
    challengerTitle: "Engineer",
    announcement: "Engineer challenged you!",
    portraitKey: "portrait-engineer",
    greetings: { repeat: ["Show me the architecture."] },
    reactions: {
      'project-entry': ["Let's see the tech stack."],
      'project-switch': ["What about this stack?"],
      'detail-open': ["How did you solve that?"],
      'answer-return': ["Makes sense."],
      'known-content': ["Read that already."],
    }
  },
  [AUDIENCE_FRIEND]: {
    id: AUDIENCE_FRIEND,
    choiceLabel: "I'm just visiting",
    challengerTitle: "Friend",
    announcement: "Friend wants to play!",
    portraitKey: "portrait-friend",
    greetings: { repeat: ["Hey again!"] },
    reactions: {
      'project-entry': ["Whoa, cool project!"],
      'project-switch': ["Ooh, next one!"],
      'detail-open': ["Wait, what was that?"],
      'answer-return': ["Haha, right."],
      'known-content': ["Yeah yeah, I know."],
    }
  }
};
