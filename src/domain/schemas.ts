import { z } from 'zod';
import { LIMITS } from './limits';

// Branding helpers for Zod
const ProjectIdSchema = z.string().brand<'ProjectId'>();
const AudienceIdSchema = z.string().brand<'AudienceId'>();

const ProjectTypeIdSchema = z.string().brand<'ProjectTypeId'>();

export const AnswerBlockSchema = z.object({
  pages: z.array(z.string().min(1).max(LIMITS.MAX_PAGE_CHARS)).min(1).max(LIMITS.MAX_PAGES_PER_ANSWER),
  sourced: z.boolean().optional(),
  sourceRef: z.string().min(1).optional(),
});

// Since TopicNode is recursive, we must define it lazily
export const TopicNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    topicKey: z.string().optional(),
    label: z.string().max(LIMITS.MAX_LABEL_CHARS),
    shortLabel: z.string().min(1).max(34).optional(),
    answer: AnswerBlockSchema,
    children: z.array(TopicNodeSchema).optional(),
    reactionHook: z.string().optional(),
  })
);

export const QuestionTreeSchema = z.object({
  projectId: ProjectIdSchema,
  audienceId: AudienceIdSchema,
  status: z.enum(['stub', 'authored']),
  rootPrompt: AnswerBlockSchema.optional(),
  topics: z.array(TopicNodeSchema),
});

export const LinkDefSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

export const AssetRefSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
});

export const ProjectDefSchema = z.object({
  id: ProjectIdSchema,
  slug: z.string(),
  name: z.string(),
  tagline: z.string(),
  type: ProjectTypeIdSchema,
  technologies: z.array(z.string()),
  role: z.string(),
  period: z.string(),
  team: z.string().optional(),
  summary: AnswerBlockSchema,
  overview: z.array(z.string()),
  impact: z.array(z.string()),
  links: z.object({
    primary: LinkDefSchema,
    others: z.array(LinkDefSchema),
  }),
  visual: z.object({
    plateName: z.string().min(1).max(23).optional(),
    shortName: z.string().min(1).max(11).optional(),
    tagline: z.string().min(1).max(37).optional(),
    logo: AssetRefSchema,
    thumb: AssetRefSchema,
    alt: z.string(),
  }),
});

export const ReactionContextSchema = z.enum([
  'project-entry',
  'project-switch',
  'detail-open',
  'answer-return',
  'known-content'
]);

export const ReactionPoolSchema = z.record(
  ReactionContextSchema,
  z.array(z.string())
);

export const AudienceDefSchema = z.object({
  id: AudienceIdSchema,
  choiceLabel: z.string(),
  challengerTitle: z.string(),
  announcement: z.string(),
  portraitKey: z.string(),
  greetings: z.object({
    first: z.array(z.string()).optional(),
    repeat: z.array(z.string()),
  }),
  reactions: ReactionPoolSchema,
});

export const PartyConfigSchema = z.object({
  activeProjectIds: z.array(ProjectIdSchema).length(6),
  defaultFirst: ProjectIdSchema,
  orderByAudience: z.record(z.string(), z.array(ProjectIdSchema)).optional(),
});
