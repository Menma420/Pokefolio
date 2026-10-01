import { ProjectTypeId } from './types';

export const PROJECT_TYPES = {
  BACKEND: 'BACKEND' as ProjectTypeId,
  BLOCKCHAIN: 'BLOCKCHAIN' as ProjectTypeId,
  AI: 'AI' as ProjectTypeId,
  NETWORKING: 'NETWORKING' as ProjectTypeId,
  FULL_STACK: 'FULL_STACK' as ProjectTypeId,
  IOT: 'IOT' as ProjectTypeId,
} as const;

export const PROJECT_TYPE_REGISTRY = new Set<ProjectTypeId>(
  Object.values(PROJECT_TYPES)
);
