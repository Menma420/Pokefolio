export type Brand<T, K> = T & { __brand: K };

export type ProjectId = Brand<string, 'ProjectId'>;
export type AudienceId = Brand<string, 'AudienceId'>;
export type NodeId = Brand<string, 'NodeId'>;
export type ProjectTypeId = Brand<string, 'ProjectTypeId'>;

// Content: Tree primitives
export interface AnswerBlock {
  pages: string[];
  sourced?: boolean;
  sourceRef?: string;
}

export interface TopicNode {
  id: string;
  topicKey?: string;
  label: string;
  shortLabel?: string;
  answer: AnswerBlock;
  children?: TopicNode[];
  reactionHook?: string;
}

export interface QuestionTree {
  projectId: ProjectId;
  audienceId: AudienceId;
  status: 'stub' | 'authored';
  rootPrompt?: AnswerBlock;
  topics: TopicNode[];
}

// Result compiled logic
export interface CompiledNode {
  id: NodeId;
  parent: NodeId | null;
  depth: 1 | 2 | 3;
  childIds: NodeId[];
  topicKey?: string;
  label: string;
  shortLabel?: string;
  answer: AnswerBlock;
}

export interface CompiledTree {
  projectId: ProjectId;
  audienceId: AudienceId;
  rootPrompt?: AnswerBlock;
  nodes: Record<string, CompiledNode>;
  rootChildren: NodeId[];
}

// Content: Project Details
export interface LinkDef {
  label: string;
  url: string;
}

export interface AssetRef {
  src: string;
  alt?: string;
}

export interface ProjectDef {
  id: ProjectId;
  slug: string;
  name: string;
  tagline: string;
  type: ProjectTypeId;
  technologies: string[];
  role: string;
  period: string;
  team?: string;
  summary: AnswerBlock;
  overview: string[];
  impact: string[];
  links: {
    primary: LinkDef;
    others: LinkDef[];
  };
  visual: {
    plateName?: string;
    shortName?: string;
    tagline?: string;
    artKey?: string;
    logo: AssetRef;
    thumb: AssetRef;
    alt: string;
  };
}

// Content: Audiences
export type ReactionContext = 
  | 'project-entry'
  | 'project-switch'
  | 'detail-open'
  | 'answer-return'
  | 'known-content';

export type ReactionPool = Record<ReactionContext, string[]>;

export interface AudienceDef {
  id: AudienceId;
  choiceLabel: string;
  challengerTitle: string;
  announcement: string;
  portraitKey: string;
  greetings: {
    first?: string[];
    repeat: string[];
  };
  reactions: ReactionPool;
}

// Content: Party Array
export interface PartyConfig {
  activeProjectIds: ProjectId[];
  defaultFirst: ProjectId;
  orderByAudience?: Partial<Record<string, ProjectId[]>>; // Note string is used logically since Object keys are coerced strings
}

export interface TreeError {
  type: string;
  message: string;
  nodeId?: string;
}
