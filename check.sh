#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22.23.3
pnpm install --frozen-lockfile > install.log 2>&1
echo "==== LINT ===="
pnpm run lint
echo "==== TSC ===="
pnpm tsc --noEmit
echo "==== TEST ===="
pnpm run test
echo "==== BUILD ===="
pnpm run build

echo "==== BOUNDARY ===="
echo 'export const foo = 1;' > src/content/projects/placeholder/stub.ts
echo 'import { foo } from "../content/projects/placeholder/stub"; console.log(foo);' > src/core/violation.ts
pnpm run lint && echo "FAILED: Built succeeded despite violation" || echo "SUCCESS: Violation caught"
rm src/core/violation.ts src/content/projects/placeholder/stub.ts
