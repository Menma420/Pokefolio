import { CompiledTree, NodeId } from '../../domain/types';
import { ViewSnapshot } from './types';
import { getChildren } from '../../domain/tree';

/**
 * Extracts the hierarchical path of topicKeys from the root to the specified focusNode.
 * Nodes without a topicKey break the match chain logically by outputting undefined in the array.
 */
function getPath(tree: CompiledTree, focusId: NodeId | null): (string | undefined)[] {
  if (!focusId) return [];
  const path: (string | undefined)[] = [];
  let current: NodeId | null = focusId;
  
  while (current) {
    const node: import('../../domain/types').CompiledNode | undefined = tree.nodes[current];
    if (!node) break;
    path.unshift(node.topicKey);
    current = node.parent;
  }
  return path;
}

/**
 * Walks the new tree attempting to match the given topicKey path depth by depth.
 * Returns the deepest matched NodeId, or null if the path is empty/unmatchable at root.
 */
function resolvePath(newTree: CompiledTree, path: (string | undefined)[]): NodeId | null {
  if (path.length === 0) return null;
  
  let currentId: NodeId | null = null;
  let candidates = getChildren(newTree, null);

  for (const targetKey of path) {
    if (!targetKey) break; // Cannot match an undefined key across projects safely
    
    const match = candidates.find(c => c.topicKey === targetKey);
    if (!match) break; // First miss stops resolution

    currentId = match.id;
    candidates = getChildren(newTree, currentId);
  }

  return currentId;
}

/**
 * Resolves project transitioning matching the D2 identical-depth semantics precisely.
 */
export function resolveSwitch(
  oldTree: CompiledTree,
  oldSnapshot: ViewSnapshot,
  newTree: CompiledTree
): ViewSnapshot {
  const oldPath = getPath(oldTree, oldSnapshot.focusId);
  const matchedId = resolvePath(newTree, oldPath);

  if (!matchedId) {
    // Empty path or early miss at root
    return {
      view: 'root',
      focusId: null,
      pageIndex: 0
    };
  }

  // D2 rules: 
  // If old view was answer(P): land on topics(parent(P')), cursor will naturally target it based on selector defaults.
  // If old view was topics(P): land on topics(P').
  if (oldSnapshot.view === 'answer') {
    const matchedNode = newTree.nodes[matchedId];
    if (!matchedNode) return { view: 'root', focusId: null, pageIndex: 0 };
    return {
      view: 'topics',
      focusId: matchedNode.parent,
      pageIndex: 0
    };
  }

  return {
    view: 'topics',
    focusId: matchedId,
    pageIndex: 0
  };
}
