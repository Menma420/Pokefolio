import { Result, ok, err } from './result';
import { 
  ProjectDef, QuestionTree,
  AudienceId, ProjectId
} from './types';
import { 
  ProjectDefSchema, QuestionTreeSchema
} from './schemas';
import { compileTree } from './tree';
import { PROJECT_TYPE_REGISTRY } from './project-types';
import { LIMITS } from './limits';


export interface ValidationIssues {
  errors: string[];
}

export function validateContent(
  projects: ProjectDef[],
  trees: QuestionTree[],
  parties: Record<AudienceId, ProjectId[]>,
  isReleaseMode = false
): Result<boolean, ValidationIssues> {
  const errors: string[] = [];

  for (const p of projects) {
    const parse = ProjectDefSchema.safeParse(p);
    if (!parse.success) {
      const msg = parse.error.message;
      if (msg.includes('String must contain at most') || msg.includes('Too big')) {
        errors.push(`V10 Error in Project ${p.id}: field exceeds length limits.`);
      } else {
        errors.push(`Zod Error in Project ${p.id}: ${msg}`);
      }
    }
    
    if (!PROJECT_TYPE_REGISTRY.has(p.type)) {
      errors.push(`V7 Error in Project ${p.id}: Type ${p.type} is not in registry.`);
    }

    if (!p.links.primary.url.startsWith('https://')) {
      errors.push(`V8 Error in Project ${p.id}: Primary link must be HTTPS.`);
    }
  }

  for (const [aud, activeIds] of Object.entries(parties)) {
    if (activeIds.length !== 6) {
      errors.push(`V9 Error: Party for ${aud} must contain exactly 6 active projects.`);
    }
    if (new Set(activeIds).size !== activeIds.length) {
      errors.push(`V9 Error: Party for ${aud} contains duplicate projects.`);
    }
    for (const projectId of activeIds) {
      if (!projects.some((project) => project.id === projectId)) {
        errors.push(`V9 Error: Party for ${aud} references unknown project ${projectId}.`);
      }
    }
  }

  const projectTrees = new Map<ProjectId, Map<AudienceId, QuestionTree>>();
  for (const p of projects) {
    projectTrees.set(p.id, new Map());
  }

  const seenTreeKeys = new Set<string>();
  for (const t of trees) {
    const treeKey = `${t.projectId}:${t.audienceId}`;
    if (seenTreeKeys.has(treeKey)) errors.push(`V1 Error: Duplicate tree ${treeKey}.`);
    seenTreeKeys.add(treeKey);
    const parse = QuestionTreeSchema.safeParse(t);
    if (!parse.success) {
      const msg = parse.error.message;
      if (msg.includes('String must contain at most') || msg.includes('Array must contain at most') || msg.includes('Too big')) {
        errors.push(`V10 Error in Tree ${t.projectId}/${t.audienceId}: Page limits exceeded.`);
      } else {
        errors.push(`Zod Error in Tree ${t.projectId}/${t.audienceId}: ${msg}`);
      }
    }
    
    const treeMap = projectTrees.get(t.projectId);
    if (treeMap) {
      treeMap.set(t.audienceId, t);
    }
    
    if (isReleaseMode && t.status === 'stub') {
      errors.push(`V11 Error: Tree ${t.projectId}/${t.audienceId} is still marked as a stub in a release build.`);
    }

    const allowedRootKeys = new Set(['what', 'how', 'why', 'hard']);
    for (const root of t.topics) {
      if (root.topicKey && !allowedRootKeys.has(root.topicKey)) {
        errors.push(`V13 Error: Tree ${t.projectId}: Root topicKey ${root.topicKey} is not in the shared Level 1 auth list.`);
      }
    }

    const compileResult = compileTree(t);
    if (!compileResult.ok) {
      errors.push(`Tree compilation failed for ${t.projectId}: ${compileResult.error.map(e => e.message).join(', ')}`);
    } else {
      const cTree = compileResult.value;
      const ids = new Set<string>();
      
      if (cTree.rootChildren.length < LIMITS.MIN_ROOT_TOPICS) {
         errors.push(`V5 Error: Tree ${t.projectId}/${t.audienceId} root lacks minimum 2 topics.`);
      }

      if (cTree.rootChildren.length > LIMITS.MAX_TOPICS) {
        errors.push(`V5 Error: Tree ${t.projectId}/${t.audienceId} root exceeds ${LIMITS.MAX_TOPICS} topics.`);
      }

      for (const node of Object.values(cTree.nodes)) {
        if (ids.has(node.id)) errors.push(`V4 Error: Duplicate ID ${node.id}`);
        ids.add(node.id);

        if (!node.answer || !node.answer.pages || node.answer.pages.length === 0) {
          errors.push(`V2 Error: Node ${node.id} has an empty answer.`);
        }

        if (node.depth > LIMITS.MAX_ANSWER_DEPTH) {
          errors.push(`V3 Error: Node ${node.id} exceeds MAX_ANSWER_DEPTH.`);
        }

        if (node.childIds.length > 0 && (node.childIds.length < LIMITS.MIN_DEEPER_TOPICS || node.childIds.length > LIMITS.MAX_TOPICS)) {
          errors.push(`V5 Error: Node ${node.id} children out of bounds (has ${node.childIds.length}).`);
        }

        // V12: Implicit metrics banned unless explicitly sourced
        const hasMetric = /\b\d+(?:%|x)(?!\w)/i.test(node.answer.pages.join(' '));
        if (hasMetric && !node.answer.sourced) {
          errors.push(`V12 Error: Node ${node.id} contains metrics but is not sourced.`);
        }
      }
      
      const rootTopicKeys = new Set();
      for (const c of cTree.rootChildren) {
        const key = cTree.nodes[c]?.topicKey;
        if (key) {
          if (rootTopicKeys.has(key)) errors.push(`V6 Error: Duplicate sibling topicKey '${key}' at root.`);
          rootTopicKeys.add(key);
        }
      }
      for (const node of Object.values(cTree.nodes)) {
        if (node.childIds.length > 0) {
          const siblingKeys = new Set();
          for (const c of node.childIds) {
            const key = cTree.nodes[c]?.topicKey;
            if (key) {
              if (siblingKeys.has(key)) errors.push(`V6 Error: Duplicate sibling topicKey '${key}' under ${node.id}.`);
              siblingKeys.add(key);
            }
          }
        }
      }
    }
  }

  for (const [aud, activeProjectIds] of Object.entries(parties)) {
    for (const pid of activeProjectIds) {
      const pTree = projectTrees.get(pid);
      if (!pTree || !pTree.has(aud as AudienceId)) {
        errors.push(`V1 Error: Active project ${pid} missing tree for audience ${aud}`);
      }
    }
  }

  if (trees.length !== 18) {
    errors.push(`V1 Error: Expected 18 authored project/audience trees, found ${trees.length}.`);
  }

  return errors.length ? err({ errors }) : ok(true);
}
