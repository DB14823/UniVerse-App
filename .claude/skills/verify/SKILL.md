---
name: verify
description: Run lint and TypeScript type checks across the entire monorepo (frontend + backend). Use after making changes to catch issues before committing.
---

Run the following checks in order and report any errors found:

1. **Frontend lint** (from repo root):
   ```
   cd SourceCode/frontend && npm run lint
   ```

2. **Frontend typecheck** (from repo root):
   ```
   cd SourceCode/frontend && npx tsc --noEmit
   ```

3. **Backend typecheck** (from repo root):
   ```
   cd SourceCode/backend && npx tsc --noEmit
   ```

Report all errors clearly. If everything passes, confirm that lint and typechecks are clean.
