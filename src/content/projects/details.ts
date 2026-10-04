import { VERIFIED_PROJECTS } from '../portfolio/verified';

/** Condensed from the supplied final answered trees; hypotheses stay in their Q&A. */
export const PROJECT_DETAILS: Record<string, {
  technologies: string[]; summary: string; overview: string[]; impact: string[];
  role?: string; period?: string; team?: string; sources: string[];
}> = {
  ACKO_CLINIC: {
    ...VERIFIED_PROJECTS.ACKO_CLINIC!,
    summary: 'Backend work across Acko Clinic Journey Management and adjacent services: family invitations, supplement fulfilment, adherence, continuation, financial reporting and reconciliation.',
    overview: ['Journey Management coordinates contracts across services that own identity, orders, fulfilment, finance and vendor integration.', 'Authored work includes lifecycle rules, replay-safe transitions, identity mapping, OneMG integration and focused failure-case tests.'],
    sources: ['verified-profile', 'answered-trees-final'],
  },
  KARSH: {
    technologies: ['TypeScript', 'Next.js', 'Node.js', 'Express', 'PostgreSQL', 'Prisma'],
    summary: 'A single-user Personal Capability OS that connects observations, experiments, decisions, learning and reviews into evidence of capability over time.',
    overview: ['Separate web and API workspaces share types and persist structured records in PostgreSQL through Prisma.', 'An external AI-review import/export workflow validates assessments before adding them to the capability history.'],
    impact: ['Implemented an evidence-to-assessment loop rather than a streak-based habit tracker.'],
    sources: ['answered-trees-final'],
  },
  NOMNOM: {
    ...VERIFIED_PROJECTS.NOMNOM!,
    overview: ['Profiles and dietary inputs feed personalized meal-plan generation; authentication and premium access use Clerk.', 'Stripe webhooks synchronize billing state with application data; Next.js server routes use Prisma and PostgreSQL.'],
    sources: ['verified-profile', 'original-resume', 'answered-trees-final'],
  },
  POKEFOLIO: {
    technologies: ['TypeScript', 'Next.js', 'React', 'Phaser', 'Zod', 'Zustand', 'Vitest', 'Playwright'],
    summary: 'An original RPG portfolio with a continuous overworld, audience-specific interview battles, direct portfolio menus and a semantic HTML layer sharing the same content.',
    overview: ['Typed project, audience and recursive question-tree contracts compile into a headless battle reducer.', 'Core rules stay separate from React UI and Phaser artwork; the 36×22 world uses a native integer camera and physical-pixel rendering.'],
    impact: ['Professional content can be reached through X/Y menus or conventional HTML routes without playing an interview.'],
    sources: ['answered-trees-final', 'current-pokefolio'],
  },
  PDF_QA: {
    technologies: ['Python', 'FastAPI', 'Next.js', 'LangChain', 'FAISS', 'HuggingFace', 'OpenRouter'],
    summary: 'A PDF question-answering application with a FastAPI backend and Next.js frontend. Document chunks are embedded, indexed and retrieved to provide context for an answer.',
    overview: ['PyPDFLoader and text splitting prepare chunks; HuggingFace embeddings populate a FAISS index.', 'A session ID connects uploads to questions. Retrieved chunks feed a RetrievalQA chain; the prototype keeps sessions in memory.'],
    impact: ['Implemented the ingestion-to-answer path; retrieval quality and unsupported answers remain explicit limitations, not claimed solved problems.'],
    sources: ['answered-trees-final'],
  },
  WEATHER_PI: {
    technologies: ['Python', 'Raspberry Pi', 'DHT11', 'MQTT', 'Flask', 'SQL', 'Server-Sent Events', 'Chart.js'],
    summary: 'An IoT telemetry prototype connecting DHT11 temperature and humidity readings on a Raspberry Pi to an MQTT-connected Flask host and a live browser dashboard.',
    overview: ['The device publishes readings; the host decrypts numeric payloads, maintains recent/latest state and serves HTTP history and SSE updates.', 'The dashboard uses Chart.js. This is a forked team project; the integrated device, host and dashboard flow is the relevant contribution.'],
    impact: ['Demonstrates the complete physical-sensor-to-browser data path. Durable telemetry history and stronger device authentication are proposed improvements.'],
    role: 'Integrated system contributor', team: 'Forked team project',
    sources: ['answered-trees-final'],
  },
  PORT_SCANNER: {
    ...VERIFIED_PROJECTS.PORT_SCANNER!,
    overview: ['CLI parsing and hostname resolution produce TCP probe jobs for a bounded Goroutine worker pool.', 'Timeouts bound each connection attempt; results preserve open/error state and support human table or structured JSON output.'],
    sources: ['verified-profile', 'original-resume', 'answered-trees-final'],
  },
  PARALLEL_DISTRIBUTED_COMPUTING: {
    technologies: ['CUDA', 'Pthreads', 'OpenMP', 'MPI'],
    summary: 'Academic HPC assignments exploring GPU acceleration, CPU multithreading and distributed message passing across image, vector, matrix and reduction workloads.',
    overview: ['Assignments include Sobel edge detection, sparse matrix-vector multiplication, prime counting, merge sort, weather-data reduction and distributed array sums.', 'The interview discusses synchronization, memory contention, load imbalance and communication cost without claiming a universal speedup.'],
    impact: ['Implemented and analyzed parallel workloads; coursework connects resource and coordination limits to backend engineering.'],
    role: 'Coursework author', sources: ['answered-trees-final', 'original-resume'],
  },
  ARISE: {
    technologies: [],
    summary: 'A Solo Leveling-inspired productivity experiment with a quest engine, XP/HP mechanics, rank feedback, achievements, profile/settings and an AI quest generator.',
    overview: ['Normal tasks become quests within an RPG-style interface.', 'The authored account treats gamification as an experiment; an engaging interface does not automatically solve motivation or behavior.'],
    impact: ['Built the quest/progression product interactions and explored their limits as a personal productivity tool.'],
    sources: ['answered-trees-final'],
  },
  POKEMON_ELO_RATING: {
    technologies: [],
    summary: 'A full-stack pairwise ranking experiment: choose a winner from two random Pokemon, update both Elo ratings and watch the persisted leaderboard evolve.',
    overview: ['The frontend/backend agree on matchup results and stored ratings.', 'The authored implementation uses an Elo expected-score formula with K-factor 16; this is a project rule, not a portfolio performance metric.'],
    impact: ['Implemented a repeated matchup-to-leaderboard loop with synchronized rating updates and persistence.'],
    sources: ['answered-trees-final'],
  },
  VANIX: {
    technologies: ['React', 'Node.js', 'TypeScript', 'Stream'],
    summary: 'A lightweight real-time voice-room project for spontaneous conversations, integrating Stream infrastructure with a React frontend and Node/TypeScript backend.',
    overview: ['Room flow connects authentication, participants and sessions across the deployed frontend/backend boundary.', 'The media stack is provided by Stream; it is not an independently implemented audio transport.'],
    impact: ['Integrated room creation and real-time participation; moderation, discovery and reconnect handling are proposed follow-ups.'],
    sources: ['answered-trees-final'],
  },
  CHATROOM_APP: {
    technologies: ['Socket.IO'],
    summary: 'A real-time chat-room project where multiple clients join a room and exchange messages without refreshing the page.',
    overview: ['Socket.IO connects server events to each client’s live room/message state.', 'It was built as a learning project, not a large public service; authentication and persistence are proposed improvements.'],
    impact: ['Implemented the end-to-end shared room/message loop and learned event-driven client/server coordination.'],
    sources: ['answered-trees-final'],
  },
};

/** Preserve source wording while satisfying the existing bounded summary-page contract. */
export function summaryPages(text: string): string[] {
  const pages: string[] = [];
  let page = '';
  for (const word of text.split(/\s+/)) {
    if (page && page.length + word.length + 1 > 250) { pages.push(page); page = ''; }
    page += (page ? ' ' : '') + word;
  }
  if (page) pages.push(page);
  return pages;
}
