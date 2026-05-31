Supabase + Prisma: DATABASE_URL (pooler) vs DIRECT_URL (direct)

Background

- Supabase provides a connection pooler endpoint (pgbouncer) and a direct Postgres endpoint.
- The pooler helps limit concurrent connections from serverless or multi-instance apps.

How Prisma uses these envs

- In `prisma/schema.prisma` the datasource often looks like this:

  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")

- `DATABASE_URL` is used by Prisma Client at runtime.
- `DIRECT_URL` is a fallback used by Prisma CLI commands (migrate, db push) when they need a direct database connection.

Recommendations

- Set `DATABASE_URL` to the Supabase pooler URL (the hostname contains `pooler`). This is ideal for runtime (web server) use.
- Set `DIRECT_URL` to the direct Postgres URL (non-pooler). Use the Supabase DB connection string from the dashboard ("Connection string (URI)").
- Do NOT commit these values to source control. Keep them in environment variables or your secrets manager.

Common pitfall

- If you accidentally set both `DATABASE_URL` and `DIRECT_URL` to the pooler URL, migrations or some Prisma operations may fail or be unreliable. The runtime will work but operations that need a direct connection (like certain transactional DDL) may need the direct URL.

Quick checks

- At server startup we log helpful warnings if either env is missing or both are identical.

Commands

- To run migrations using the direct URL explicitly:

  PRISMA_DATABASE_DIRECT_URL="<your direct url>" npx prisma migrate deploy

- Or ensure `DIRECT_URL` is set in your environment before running `prisma migrate`.

Further reading

- Prisma docs: https://www.prisma.io/docs
- Supabase: Connection pooler and connection limits
