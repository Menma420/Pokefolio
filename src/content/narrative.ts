export const INTRO_NARRATION = [
  'Here, you play as Uttkarsh.',
  'But somewhere in this world, you are here too.',
  'Find yourself, and you may get the chance to face Uttkarsh—as yourself.',
] as const;

export const FIRST_ENCOUNTER_DIALOGUE = [
  'Hey!',
  'You’re Uttkarsh, right?',
  'I’ve heard about the things you’ve built.',
  'Show me what you have got',
] as const;

export const ENCOUNTER_AUDIENCE_PROMPT = 'What brings you here?';
export const ENCOUNTER_AUDIENCE_CHOICES = [
  { id: 'RECRUITER', label: 'I’m hiring' },
  { id: 'ENGINEER', label: 'I’m an engineer' },
  { id: 'FRIEND', label: 'I’m just visiting' },
] as const;

export const BATTLE_OVER_LINE = 'Battle over!';
