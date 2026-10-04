import { QuestionTree, CompiledTree, CompiledNode, NodeId, ProjectDef, AudienceDef } from './types';
import { Result, ok, err } from './result';
import { LIMITS } from './limits';

export function compileTree(tree: QuestionTree): Result<CompiledTree, { message: string; nodeId?: string }[]> {
  const nodes: Record<string, CompiledNode> = {};
  const rootChildren: NodeId[] = [];
  const errors: { message: string; nodeId?: string }[] = [];

  function walk(node: typeof tree.topics[0], depth: 1 | 2 | 3, parentId: NodeId | null) {
    if (depth > LIMITS.MAX_ANSWER_DEPTH) {
      errors.push({ message: `Max depth exceeded at node ${node.id}`, nodeId: node.id });
      return;
    }

    if (nodes[node.id]) {
      errors.push({ message: `Duplicate node ID detected: ${node.id}`, nodeId: node.id });
      return;
    }

    const nId = node.id as NodeId;
    const childIds: NodeId[] = [];

    if (node.children) {
      for (const child of node.children) {
        childIds.push(child.id as NodeId);
        walk(child, (depth + 1) as 2 | 3, nId);
      }
    }

    nodes[nId] = {
      id: nId,
      parent: parentId,
      depth,
      childIds,
      topicKey: node.topicKey,
      label: node.label,
      shortLabel: node.shortLabel,
      answer: node.answer, // Just passes AnswerBlock along
    };
  }

  for (const child of tree.topics) {
    rootChildren.push(child.id as NodeId);
    walk(child, 1, null);
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    projectId: tree.projectId,
    audienceId: tree.audienceId,
    rootPrompt: tree.rootPrompt,
    nodes,
    rootChildren,
  });
}

export function getChildren(tree: CompiledTree, focusNodeId: NodeId | null): CompiledNode[] {
  if (focusNodeId === null) {
    return tree.rootChildren.map(id => tree.nodes[id]!).filter(Boolean);
  }
  const parent = tree.nodes[focusNodeId];
  if (!parent) return [];
  return parent.childIds.map(id => tree.nodes[id]!).filter(Boolean);
}

/**
 * Returns a specific project's authored tree for the specified audience.
 * Switch resolution / view resolution / key paths is a Layer 2 concern (Battle reducer).
 */
export function resolveTree(project: ProjectDef, audience: AudienceDef, getter: (p: ProjectDef, a: AudienceDef) => QuestionTree | undefined): Result<QuestionTree, string> {
  const tree = getter(project, audience);
  if (!tree) {
    return err(`Tree not found for Project ${project.id} and Audience ${audience.id}`);
  }
  return ok(tree);
}
