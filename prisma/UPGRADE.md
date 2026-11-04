# Safe V3 Bootstrap

Back up the database before deployment. Apply the checked-in migrations with
`npx prisma migrate deploy`, then run `npm run db:bootstrap`. `npm run db:seed`
uses the same non-destructive entry point. Do not use beta-reset, migrate reset,
or db push with data-loss flags to upgrade an existing database.

Bootstrap takes a transaction-scoped PostgreSQL advisory lock before checking
for existing users, characters, series, or prediction markets. Fresh demo data
is created only when none of those records exist. Existing databases receive
additive V3 topics, event translations, missing draft prediction templates, and
a treasury only if none exists. No account, wallet, position, trade, published
content, market rule, source, reserve, or existing treasury balance is reset.
The upgrade does not manufacture demo posts, follows, or reactions for users.
Repeated bootstrap runs leave existing prediction markets entirely unchanged.

Sample markets are DRAFT, carry zero reserved liability, and require source and
baseline review before an administrator opens them. Expired drafts cannot be
opened. Old OPEN records past their deadline are exposed as LOCKED and reject
trading; bootstrap deliberately does not rewrite their rules or historical data.

If Prisma reports an existing schema without migration history, stop and compare
the database schema against the migration history before creating a baseline.
Do not blindly mark migrations as applied or reset the database. Resolve treasury
reconciliation failures separately from bootstrap using verified ledger and
market records; bootstrap never repairs them by overwriting balances.

Integration tests require a disposable database selected through
`TEST_DATABASE_URL`, with a database name containing a standalone `test` segment.
Do not run them against the connection in `.env`.
