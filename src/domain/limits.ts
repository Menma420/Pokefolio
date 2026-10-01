export const LIMITS = {
  // Tree depth limit (V3)
  MAX_ANSWER_DEPTH: 3,
  
  // Menu children limits (V5)
  MIN_ROOT_TOPICS: 2,
  MAX_TOPICS: 4,
  MIN_DEEPER_TOPICS: 2,
  
  // Text constraints (V10)
  MAX_PAGE_CHARS: 250,
  MAX_PAGES_PER_ANSWER: 5,
  MAX_LABEL_CHARS: 40,
} as const;
