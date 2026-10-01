'use client';

import { useEffect, useState } from 'react';
import { BattleOrchestrator } from '../../../ui/battle/BattleOrchestrator';
import { ProjectId, AudienceId } from '../../../domain/types';
import { Audiences, AUDIENCE_RECRUITER } from '../../../content/audiences';
import { getParty } from '../../../content/party';
import { getProject } from '../../../content/registry';
import { globalInputRouter, KeyboardAdapter } from '../../../core/input';

export default function DevBattleArena() {
  const [active, setActive] = useState(false);
  const [audience, setAudience] = useState<AudienceId>(AUDIENCE_RECRUITER);
  const party = getParty(audience);
  const [project, setProject] = useState<ProjectId>(party[0]!);

  useEffect(() => {
    if (!active) return;
    const adapter = new KeyboardAdapter(globalInputRouter);
    adapter.mount();
    globalInputRouter.isGameFocused = true;
    return () => {
      adapter.unmount();
      globalInputRouter.isGameFocused = false;
      globalInputRouter.clearHeld();
    };
  }, [active]);

  const changeAudience = (nextAudience: AudienceId) => {
    setAudience(nextAudience);
    const first = getParty(nextAudience)[0];
    if (first) setProject(first);
  };

  if (active) {
    return (
      <div className="h-screen w-screen">
        <BattleOrchestrator initialProject={project} audience={audience} onExit={() => setActive(false)} />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-100 p-8 font-mono text-gray-950">
      <h1 className="text-2xl font-bold">Phase 4 Battle UI</h1>
      <div className="flex w-full max-w-md flex-col gap-3 border border-gray-300 bg-white p-6 shadow-sm">
        <label htmlFor="audience">Audience</label>
        <select id="audience" value={audience} onChange={(event) => changeAudience(event.target.value as AudienceId)} className="border border-gray-400 p-2">
          {Object.values(Audiences).map((definition) => (
            <option key={definition.id} value={definition.id}>{definition.choiceLabel}</option>
          ))}
        </select>

        <label htmlFor="starting-project" className="mt-3">Starting project</label>
        <select id="starting-project" value={project} onChange={(event) => setProject(event.target.value as ProjectId)} className="border border-gray-400 p-2">
          {party.map((projectId) => (
            <option key={projectId} value={projectId}>{getProject(projectId)?.name ?? projectId}</option>
          ))}
        </select>

        <button type="button" onClick={() => setActive(true)} className="mt-4 bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800">
          Start battle
        </button>
      </div>
    </main>
  );
}
