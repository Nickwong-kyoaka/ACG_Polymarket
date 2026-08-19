# Local media review inbox

`npm run media:collect-review` builds a local `review-media/` folder from the official source pages already recorded in `content/media-sources.json` and from Openverse search results when available.

The collector:

- accepts HTTPS sources only and rejects private or reserved network targets;
- limits redirects, response sizes, and image MIME types;
- normalizes candidates to WebP with metadata removed;
- records the source page, direct media URL, creator, license signal, retrieval time, checksum, and review state;
- marks every candidate `PENDING`, `UNREVIEWED`, `UNVERIFIED`, and `adEligible: false`;
- never copies review files into `public/`, uploads them to S3, or publishes a database asset.

Open `review-media/index.html` to inspect the contact sheet. Approve or reject each candidate locally, then use **Export decisions** to save a JSON decision file. An approval is an editorial choice only: publishing still requires source, permission, SFW, and workflow review in `/admin/assets`.

The whole `review-media/` directory is ignored by Git so third-party image bytes and local approval decisions do not enter repository history.
