# SurplusLink AI — project instructions

## Active stack

The active implementation is the unified Python stack in `backend/` (FastAPI + SQLAlchemy/Alembic). It is the single authority for REST, WebSockets, AI extraction, matching, volunteer pickups, QR handover, and impact reporting. The React client lives in `E:\SurplusLinkAI\frontend` and targets `http://127.0.0.1:8000` locally.

Use `backend/README.md` for setup, demo accounts, endpoint contracts, tests, and Render deployment. Use `backend/render.yaml` as the Render Blueprint. The old Serverpod/Dart and Flask services are legacy and should not be extended; archive or remove them only after the FastAPI replacement is verified.

The backend test command is:

```powershell
cd E:\SurplusLinkAI\backend
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -q
```

Realtime events use an in-process `EventHub`, so deploy **one** backend web instance. Multiple workers would not share WebSocket subscribers.

## Legacy Serverpod package (reference only)

Reference snapshots of the Builders Theory Dart matcher, SurplusLink AI v2 Flask extractor, and the attached volunteer QR Flask files live in `reference/`. They are read-only provenance; do not run or extend them. The full legacy Serverpod package remains outside this folder under `E:\Backend\surplus_link_ai_server`; do not use it for new feature work.

Build for multiple users, use Serverpod's built-in authentication, which is already set up in `lib/server.dart`.

The server runs under the Serverpod runner, a background process per server package. The user attaches to it with `serverpod start`. There is no need to check if the server is running: make the changes and call the `serverpod` MCP tools as needed. If the server is not running, an informative error message will be received from the MCP server. Then call `tail_runner_logs` to learn whether it is still starting or why it stopped. If nothing is running, start it with `serverpod runner start` in `surplus_link_ai_server`, which returns once the server is up and leaves it running for the user to attach to. If it fails, fix the cause it reports (a build error, a port held by another process, Docker) instead of retrying; only a `serverpod runner start` your shell killed on a timeout is run again, since the runner keeps starting. Leave the runner running, and run `serverpod runner stop` only when asked.

While running, the runner watches for file changes to run incremental code generation and hot reload the running server. `serverpod runner status` prints its state and the server addresses, which are not always the configured ports when another Serverpod runner on the machine holds them.

Calling `serverpod generate` directly is not needed, but might be useful to troubleshoot when an incremental generation fails.

ALWAYS use the MCP server instead of the command line for the tasks below. The `serverpod runner` commands are the exception: they manage the stack itself. Use the MCP server to:

- `create_migration` and `apply_migrations` for database (after you change data models).
- `create_repair_migration` if the database has drifted out of sync with the migrations.
- `tail_server_logs` to read logs from the server.
- `tail_runner_logs` to read the output of the runner itself (code generation, compilation, Docker, raw server output). The only tool that also works while the server is starting or after it stopped.
- `hot_reload` / `hot_restart` to reload or restart the server. Use `hot_restart` for changes that hot reload cannot apply, such as changes to `main()`.

NEVER edit generated code. The server's `lib/src/generated/` directory and the whole `surplus_link_ai_client` package are rewritten by the code generator. Change the `.spy.yaml` models, the endpoints, or `lib/server.dart` instead.

Migrations are a narrow exception: the `migration.sql` of a generated migration MAY be edited by hand when the generated SQL would lose data — to add a data transformation, or to reach a destructive change through non-destructive steps. Never touch the other files in the migration directory, and keep the schema the SQL ends up with identical to `definition.sql` — new databases are created from that file and never run `migration.sql`.

Only when the MCP is not available or `serverpod runner start` cannot bring the server up, fall back to the CLI in the server package:

- `serverpod generate` to regenerate the client and the generated server code.
- `serverpod create-migration` after changing a model with a `table` (add `--force` for destructive changes). It only writes the migration; the runner applies pending migrations when it boots the server.

Tests need no Docker. `config/test.yaml` sets `database.dataPath`, so Serverpod starts and manages the test database (an embedded PostgreSQL) itself, and the project's `docker-compose.yaml` is not used for it. Just run `dart test` in the server package.

### Legacy checklist

Checklist after doing changes to the legacy Serverpod package, in this order:

- `dart analyze` (CLI)
- `dart format` (CLI)
- `create_migration` and `apply_migrations` (MCP - only if necessary)
- Do `serverpod` MCP `hot_restart` if required (hot reload is done automatically)
- Run tests, if applicable (`dart test` in the server package)
- Check `serverpod` MCP `tail_server_logs` for any issues.
