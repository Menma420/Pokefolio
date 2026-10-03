/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-layer-isolation',
      comment: 'domain MUST NOT import anything from other layers',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/(content|core|game|ui|runtime|app)' }
    },
    {
      name: 'content-layer-isolation',
      comment: 'content MUST NOT import from core, game, ui, or runtime',
      severity: 'error',
      from: { path: '^src/content' },
      to: { path: '^src/(core|game|ui|runtime|app)' }
    },
    {
      name: 'core-layer-isolation',
      comment: 'core MUST NOT import from content data, Phaser, React, or DOM UI',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '(^src/(content|game|ui|runtime|app)|phaser|react)' }
    },
    {
      name: 'game-layer-isolation',
      comment: 'game may import core/domain and GameBridge types only; it MUST NOT import UI, content, app, or other runtime implementations',
      severity: 'error',
      from: { path: '^src/game' },
      to: { path: '(^src/(content|ui|app)|^src/runtime/(?!gameBridge(?:/|$))|react)' }
    },
    {
      name: 'ui-layer-isolation',
      comment: 'ui MUST NOT import from Phaser or game layer',
      severity: 'error',
      from: { path: '^src/ui' },
      to: { path: '(^src/game|phaser)' }
    },
    {
      name: 'runtime-layer-isolation',
      comment: 'runtime MUST NOT import from Phaser or React UI components',
      severity: 'error',
      from: { path: '^src/runtime' },
      to: { path: '(^src/(game|ui)|phaser)' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    }
  }
};
