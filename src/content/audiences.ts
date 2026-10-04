import { AudienceId, AudienceDef } from '../domain/types';

export const AUDIENCE_RECRUITER = 'RECRUITER' as AudienceId;
export const AUDIENCE_ENGINEER = 'ENGINEER' as AudienceId;
export const AUDIENCE_FRIEND = 'FRIEND' as AudienceId;

export const Audiences: Record<string, AudienceDef> = {
  [AUDIENCE_RECRUITER]: {
    id: AUDIENCE_RECRUITER,
    choiceLabel: "I'm hiring",
    challengerTitle: "Recruiter",
    announcement: "You were challenged by the Recruiter!",
    portraitKey: "portrait-recruiter",
    greetings: { repeat: ["Let's connect your work to the role."] },
    reactions: {
      'project-entry': ["Start with the work you owned.", "Show me the problem behind the project.", "Let's connect the scope to your decisions."],
      'project-switch': ["What responsibility changed here?", "Let's compare the scope of this work.", "What made this project worth doing?"],
      'detail-open': ["Separate your contribution from the team's.", "Walk me through the decision and its result.", "Tell me what changed for the user."],
      'answer-return': ["That gives me the context. What came next?", "Let's follow another part of the work.", "We can come back to the tradeoff."],
      'known-content': ["Let's revisit the details behind that answer.", "We covered the outline; take another look.", "You can ask about that work again."],
    }
  },
  [AUDIENCE_ENGINEER]: {
    id: AUDIENCE_ENGINEER,
    choiceLabel: "I'm an engineer",
    challengerTitle: "Engineer",
    announcement: "You were challenged by the Engineer!",
    portraitKey: "portrait-engineer",
    greetings: { repeat: ["Let's trace a boundary and its failure cases."] },
    reactions: {
      'project-entry': ["Let's follow the data through the system.", "Start with the boundaries and state owners.", "Show me the mechanism behind the interface."],
      'project-switch': ["Where does this design handle failure?", "Let's compare the implementation boundaries.", "What is the unit of work in this system?"],
      'detail-open': ["Trace the steps, including the failure path.", "Which state survives a retry?", "Show me the contract behind that behavior."],
      'answer-return': ["Now let's inspect another boundary.", "Keep that constraint in mind for the next part.", "We can compare another path through it."],
      'known-content': ["Let's trace that path once more.", "Revisit it with the failure case in mind.", "The same contract is worth another look."],
    }
  },
  [AUDIENCE_FRIEND]: {
    id: AUDIENCE_FRIEND,
    choiceLabel: "I'm just visiting",
    challengerTitle: "Visitor",
    announcement: "You were challenged by the Visitor!",
    portraitKey: "portrait-friend",
    greetings: { repeat: ["Back for another story? Pick a project."] },
    reactions: {
      'project-entry': ["What made you want this to exist?", "Show me the idea you kept thinking about.", "Where does the fun part begin?"],
      'project-switch': ["Different project, different rabbit hole?", "What pulled you into making this one?", "Which part would you show a friend first?"],
      'detail-open': ["Tell me how that idea turned out.", "What was it like to actually build it?", "Was that the part you expected to be fun?"],
      'answer-return': ["There is probably another story in here.", "Let's try another corner of the idea.", "What else did the project surprise you with?"],
      'known-content': ["Back to that story? Let's hear it again.", "That is worth another look.", "We can revisit the part you were curious about."],
    }
  }
};
