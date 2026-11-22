# MongoDB backup and restore

This folder’s [`db-backup.sh`](./db-backup.sh) uses [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/) (MongoDB Database Tools). The app stores data in MongoDB **collections** (not SQL tables); `mongodump` exports those collections as BSON + metadata under a timestamped directory.

## Does the backup include everything?

| What you configure | What gets dumped |
|-------------------|------------------|
| Default (`./db-backup.sh`) | Every **database** your `DB_URL` user is allowed to read on that cluster (e.g. `booking`, `test`, any others). |
| `BACKUP_DATABASE=booking ./db-backup.sh` | Only the **`booking`** database, which matches [`server/src/db.ts`](../server/src/db.ts) (`client.db('booking')`). |

If `DB_URL` includes a database path (e.g. `...mongodb.net/booking?...`), MongoDB still authorizes per database; `mongodump` without `--db` continues to dump all databases the user can access unless you pass `BACKUP_DATABASE`.

Typical **booking** collections used by the app include: `appointments`, `booking-request`, `customers`, `holidays`, `invites`, `password_resets`, `resources`, `services`, `subdomain-config`, `tenant`, `user`. A successful dump always includes every collection **in the databases you dump**—there is no per-collection allowlist in the script.

## Is it safe?

- **For the database:** Yes. `mongodump` only **reads** data; it does not delete or update production documents.
- **For secrets:** The dump directory can contain **PII and business data**. Treat backups like credentials: restrict file permissions, do not commit them, encrypt if they leave a trusted machine.
- **For restore:** Restoring with `--drop` **deletes existing collections** before import. Use a disposable database or cluster when practicing.

## Requirements

- `mongodump` / `mongorestore` on your `PATH` (package **mongodb-database-tools**).
- Network access to the cluster (e.g. Atlas IP allowlist).
- A user with read permission for backup; for restore, write permission (and often a clean target or explicit `--drop`).

## Run a backup

From the repo root (or any directory):

```bash
cd db && ./db-backup.sh
```

App database only (recommended for many production snapshots):

```bash
cd db && BACKUP_DATABASE=booking ./db-backup.sh
```

Use another env file:

```bash
ENV_FILE=/path/to/.env ./db-backup.sh
```

Output layout:

```text
db/backup_YYYY-MM-DD_HH-MM-SS/
  booking/
    <collection>.bson
    <collection>.metadata.json
  ... other databases if you did not set BACKUP_DATABASE ...
```

## Restore

**Always test restore on a staging cluster or local MongoDB first.** Replace `BACKUP_DIR` with the path to one `backup_...` folder (the directory that **contains** `booking/`, `test/`, etc.).

### Restore everything in that dump

This can write **all** databases present in the dump to the **target** cluster. Pass the dump root (the folder that contains subfolders like `booking/`):

```bash
mongorestore --uri "$DB_URL" "$(pwd)/BACKUP_DIR"
```

Add `--drop` only if you intend to remove existing collections with the same names before import:

```bash
mongorestore --uri "$DB_URL" --drop "$(pwd)/BACKUP_DIR"
```

### Restore only the `booking` database

Useful when the dump contains multiple databases but you only want `booking`:

```bash
mongorestore --uri "$DB_URL" --nsInclude='booking.*' "$(pwd)/BACKUP_DIR"
```

With `--drop`, existing `booking` collections are dropped first; without it, documents are **merged** (may duplicate `_id` errors if you are not careful—read [mongorestore docs](https://www.mongodb.com/docs/database-tools/mongorestore/) for your version).

### After restore

Point `DB_URL` at the cluster you restored into and verify the app (`booking` DB) in staging before touching production.
