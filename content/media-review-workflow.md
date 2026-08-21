# Local media review inbox

`npm run media:collect-review` builds a local `review-media/` folder from the official source pages recorded in `content/media-sources.json`, explicit outfit URLs in `content/media-expansion-sources.json`, and Openverse search results when available. It keeps up to three distinct automatically discovered official-page candidates per source by default so outfit, expression, and alternate-era visuals can be reviewed together; use `--per-source=1..6` to adjust the limit.

The collector:

- accepts HTTPS sources only and rejects private or reserved network targets;
- limits redirects, response sizes, and image MIME types;
- normalizes candidates to WebP with metadata removed;
- records the source page, direct media URL, creator, license signal, retrieval time, checksum, and review state;
- marks every candidate `PENDING`, `UNREVIEWED`, `UNVERIFIED`, and `adEligible: false`;
- never copies review files into `public/`, uploads them to S3, or publishes a database asset.

Open `review-media/index.html` to inspect the contact sheet. Approve or reject each candidate locally, then use **Export decisions** to save a JSON decision file. An approval is an editorial choice only: publishing still requires source, permission, SFW, and workflow review in `/admin/assets`.

When the site owner has explicitly approved the whole reviewed batch, run `npm run media:approve-review`. The command records the decision in `content/approved-media.json` and keeps browser decisions in the ignored review folder. It does not claim a copyright license, mark the media ad-eligible, or commit image bytes.

`npm run media:sync-approved` idempotently publishes only entries marked `PUBLISH_UNVERIFIED`. It never republishes an asset that has been rejected, pulled, or received a takedown request. Entries marked `REVIEW_ONLY` remain evidence of the review decision without being attached to a character.

The whole `review-media/` directory is ignored by Git so third-party image bytes and local approval decisions do not enter repository history.
