---
name: migrate
description: Run Prisma database migrations and regenerate the Prisma client. Use after modifying SourceCode/backend/prisma/schema.prisma.
disable-model-invocation: true
---

Run the following from the repo root:

```
cd SourceCode/backend && npm run prisma:migrate && npm run prisma:generate
```

If `prisma:migrate` asks for a migration name, prompt the user for one before running.

After completing, confirm:
- Which migrations were applied
- That the Prisma client was regenerated successfully
