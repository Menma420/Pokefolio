import { expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BattleScreen } from '../../src/ui/battle/BattleScreen';
import { getContentTree } from '../../src/content/registry';
import { getParty } from '../../src/content/party';
import { AUDIENCE_ENGINEER } from '../../src/content/audiences';
import { PROJECT_IDS } from '../../src/content/projects/catalog';
import type { BattleContext } from '../../src/core/battle/types';
import { axe } from '../helpers/axe';

it('shows the condensed choice while retaining its complete accessible question',async()=>{
 const tree=getContentTree(PROJECT_IDS.PORT_SCANNER,AUDIENCE_ENGINEER)!;
 const nodes=tree.rootChildren.map(id=>tree.nodes[id]!);
 const ctx:BattleContext={projectId:PROJECT_IDS.PORT_SCANNER,audienceId:AUDIENCE_ENGINEER,partyOrder:getParty(AUDIENCE_ENGINEER),view:'topics',focusId:null,pageIndex:0,visited:new Set(),reactionCounts:{},reactionCooldown:0};
 const view=render(<BattleScreen ctx={ctx} visibleTopics={nodes} availableCommands={[]} pageText="" summary="" linkAvailable dispatch={vi.fn()}/>);
 const first=view.getByRole('button',{name:nodes[0]!.label});
 expect(first.textContent).toContain(nodes[0]!.shortLabel);
 expect(first.textContent).not.toContain(nodes[0]!.label);
 expect(view.getByRole('group',{name:'Interview topics'}).querySelectorAll('button')).toHaveLength(3);
 const results = await axe(view.container, {rules:{'landmark-main-is-top-level':{enabled:false}}});
 expect(results.violations.map(v=>v.id)).toEqual([]);
});
