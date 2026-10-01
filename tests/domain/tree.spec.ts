import { describe, it, expect } from 'vitest';
import { compileTree, getChildren, resolveTree } from '../../src/domain/tree';
import { QuestionTree, ProjectDef, AudienceDef } from '../../src/domain/types';
import { AckoClinicRecruiterTree } from '../../src/content/projects/acko-clinic/recruiter';
import { AckoClinicDef } from '../../src/content/projects/acko-clinic';
import { Audiences, AUDIENCE_RECRUITER } from '../../src/content/audiences';

describe('Domain Tree Logistics', () => {
  it('compileTree translates structured input into a CompiledTree retaining pure references', () => {
    const res = compileTree(AckoClinicRecruiterTree);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const cTree = res.value;
    expect(cTree.projectId).toBe(AckoClinicRecruiterTree.projectId);
    expect(cTree.audienceId).toBe(AckoClinicRecruiterTree.audienceId);

    // Assert Root Topics parsed correctly
    expect(cTree.rootChildren.length).toBe(AckoClinicRecruiterTree.topics.length);
    
    // Test node reference translation
    const firstRootId = cTree.rootChildren[0];
    if (firstRootId) {
      const node = cTree.nodes[firstRootId];
      expect(node).toBeDefined();
      if (node) {
        expect(node.depth).toBe(1);
        expect(node.parent).toBeNull();
      }
    }
  });

  it('getChildren computes accurate descendants of a specific context layer', () => {
    const res = compileTree(AckoClinicRecruiterTree);
    if (!res.ok) throw new Error();

    // From actual root depth (null)
    const rootNodes = getChildren(res.value, null);
    expect(rootNodes.length).toBe(2);

    // From the first root node
    if (rootNodes[0]) {
      const descendants = getChildren(res.value, rootNodes[0].id);
      expect(descendants.length).toBe(2);
      expect(descendants[0]!.depth).toBe(2);
      expect(descendants[0]!.parent).toBe(rootNodes[0].id);
    }
  });

  it('resolveTree pulls specific definitions deterministically', () => {
    const acko = AckoClinicDef;
    const aud = Audiences[AUDIENCE_RECRUITER];
    if (!aud) throw new Error('aud missing');

    const mockGetter = (p: ProjectDef, a: AudienceDef) => {
      if (p.id === acko.id && a.id === aud.id) return AckoClinicRecruiterTree;
      return undefined;
    };

    const treeData = resolveTree(acko, aud, mockGetter);
    expect(treeData.ok).toBe(true);
    if (treeData.ok) {
      expect(treeData.value).toBe(AckoClinicRecruiterTree);
    }
  });

  it('compileTree intercepts duplicate node ID graph collisions gracefully', () => {
    const duplicateTree: QuestionTree = {
      projectId: AckoClinicDef.id,
      audienceId: AUDIENCE_RECRUITER,
      status: 'stub',
      topics: [
        { id: '1', label: '1', answer: { pages: ['1'] } },
        { id: '1', label: '2', answer: { pages: ['2'] } }, // Intentionally duplicated
      ]
    };
    const compileResult = compileTree(duplicateTree);
    expect(compileResult.ok).toBe(false);
    if (!compileResult.ok) {
      expect(compileResult.error[0]!.message).toContain('Duplicate node ID detected: 1');
    }
  });
});
