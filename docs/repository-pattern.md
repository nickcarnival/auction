# Repository pattern migration

This document describes how to move MongoDB access behind **repository** modules so services and routes stay free of raw driver calls, and persisted data is validated at the boundary with **Zod**.

## Goals

- **Single place per aggregate** for collection names, queries, and mapping DB documents ↔ domain types.
- **Parse on read (and on write where useful)** so bad rows or schema drift fail in one layer, not deep in business logic.
- **Easier testing**: mock `UserRepo` instead of `getDb()` or MongoDB.
- **Incremental adoption**: new code uses repos; existing `*-service.ts` files can migrate one entity or one method at a time.

## What belongs in a repository

| In scope | Out of scope |
|----------|----------------|
| `getDb()`, `collection()`, `findOne`, `find`, `insertOne`, `updateOne`, `deleteOne`, `aggregate` for **one primary collection** (or clearly named secondary reads) | HTTP, `req`/`res`, `ApiError`, Stripe, email |
| Mapping `_id` ↔ string, normalizing dates, defaulting missing fields before parse | Business rules (“can this user delete this user?”) — that stays in **services** |
| `schema.parse()` / `safeParse()` on documents **as they leave or enter** the DB boundary | UI concerns |

Cross-collection updates (e.g. delete user + related invites) can live in a **service** that orchestrates **multiple repository** methods, or in a repository method if you explicitly name it (e.g. `deleteUserAndInvites`) and document transactional expectations.

## Layout (suggested)

Place repositories next to the domain they serve:

```text
server/src/repositories/
  user-repository.ts
  tenant-repository.ts
  appointment-repository.ts
  ...
```

Optional: `server/src/repositories/mongo/user-repository.ts` if you split by adapter later. Start flat until it hurts.

Naming: **`UserRepository`** as the module’s main export, or a namespace-style **`export const UserRepo = { ... }`** if you prefer static functions with no class.

## Pattern: read with Zod

1. Define (or reuse) a Zod schema for the **stored shape** — often in `@shared/schemas` or next to the repo if server-only.
2. After `findOne` / `find`, map the document (e.g. `_id` to hex string) if your schema expects strings.
3. **`schema.parse(doc)`** for methods that must succeed if the row exists; use **`safeParse`** if “not found or invalid” is a normal outcome, and branch in the service.

Example shape (illustrative only):

```typescript
import { getDb } from '@/db';
import { ObjectId } from 'mongodb';
import { userDocumentSchema, type UserDocument } from '@shared/schemas/user-document-schema';

const COLLECTION = 'user';

export async function getUserById(id: string): Promise<UserDocument | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  const normalized = { ...doc, _id: doc._id.toHexString() };
  const parsed = userDocumentSchema.safeParse(normalized);
  if (!parsed.success) {
    console.error('[UserRepository] invalid user document', id, parsed.error.flatten());
    return null; // or throw a dedicated CorruptDocumentError — pick one convention
  }
  return parsed.data;
}
```

Use **`z.infer<typeof userDocumentSchema>`** (or an exported `type UserDocument`) as the return type so callers do not depend on Mongo types.

## Pattern: writes

- Validate input with a **write** schema (partial or full) before `insertOne` / `updateOne`.
- Repositories return **counts**, **inserted id**, or the **parsed** document after a read-back — avoid returning raw `UpdateResult` everywhere unless the service truly only needs `modifiedCount`.

## Relationship to `*-service.ts`

Current code often mixes `getDb()` and business rules in the same file. Target state:

- **Repository**: Mongo + Zod + trivial mapping.
- **Service**: orchestration, authorization assumptions (caller already checked), calls `UserRepo.*`, other repos, external APIs.
- **Routes**: HTTP, `requireAppRole`, call services.

During migration, a service can call **both** legacy `getDb` code and new repo methods until the file is fully ported.

## Migration order (practical)

1. **Introduce Zod document schemas** for one entity (even before a repo), and use them only in new code paths if needed.
2. **Add `user-repository.ts`** (or your first entity) with the most-used reads/writes lifted from `user-service.ts`.
3. **Replace** `getDb` usage in that service with repo calls; run tests.
4. Repeat for **tenant**, **appointment**, **customer**, etc.
5. **Routes** should not import repositories directly unless you keep a very thin route — prefer services as today.

## Testing

- **Unit tests**: inject or mock `UserRepository` functions (e.g. `vi.mock('@/repositories/user-repository')`).
- **Integration tests**: real `getDb()` against a test DB or in-memory Mongo, calling repository methods and asserting Zod-shaped results.

## Exceptions and edge cases

- **Heavy aggregations**: still live in a repository method, but name it clearly (`aggregateMonthlyStats`).
- **Transactions**: `startSession()` / `withTransaction` can wrap multiple repo methods; keep session in the service or a small `unit-of-work` helper, not scattered in routes.
- **Performance**: parsing every document on large lists has a cost; if needed, parse in batches or use `.safeParse` only on writes and a lighter read path once documents are trusted (document that tradeoff).

## Checklist for each new repository method

- [ ] Collection name and indexes assumptions documented in one line if non-obvious.
- [ ] No `any`; return types are `z.infer` or explicit interfaces.
- [ ] Read path uses `parse` / `safeParse` consistently with project choice for corrupt rows.
- [ ] ObjectId validation before queries that use user-supplied ids.
- [ ] Callers updated (services only, ideally).

## Related

- DB entry: `server/src/db.ts` (`getDb()` → database `booking`).
- Stricter-than-`user` API routes: `server/src/api/route-role-inventory.ts`.
