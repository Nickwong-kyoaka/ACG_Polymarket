# ACG Support Exchange+ V2 Media Source Report

The manifest contains exactly 24 character records. It does not contain third-party image bytes or approved direct third-party media URLs.

## Exported shape

- Catalog: `CatalogSeriesV2[]` and `CatalogCharacterV2[]`, with independent English and Traditional Chinese names, summaries, prompts, tags, comfort styles, market defaults, and authoritative source metadata.
- Manifest: `MediaSourceManifest { schemaVersion, catalogVersion, generatedAt, entries: MediaManifestEntry[] }`.
- Source entry: character slug, creator/official account, original page, optional direct/local media, source kind, permission evidence/status, license, retrieval time, S3 key, SFW state, publication/ad eligibility, and unresolved/AI provenance fields.

## Current resolution state

- Akari Hoshino, Ren Tsukishiro, and Mira Kagetsu use pre-existing local files. They remain `UNVERIFIED` and non-ad-eligible because their historical AI model, version, prompt, and generation timestamps were not preserved.
- All 21 non-original characters have a public official SFW character or series page, but no explicit reuse permission or approved direct image URL was found. They remain reference-only, `UNVERIFIED`, non-publishable, and non-ad-eligible.
- The importer defaults to dry-run. It performs no remote request and no S3 write unless an operator explicitly supplies `--probe` or `--upload` after resolving the manifest record.

## Authoritative and candidate pages

| Character | Official source/candidate page |
| --- | --- |
| Yatogami Tohka | https://date-a-live5th-anime.com/character/tohka.php |
| Tokisaki Kurumi | https://date-a-live5th-anime.com/character/kurumi.php |
| Itsuka Kotori | https://date-a-live5th-anime.com/character/kotori.php |
| Tobiichi Origami | https://date-a-live5th-anime.com/character/origami.php |
| Yoshino | https://date-a-live5th-anime.com/character/yoshino.php |
| Rudeus Greyrat | https://mushokutensei.jp/character/ |
| Sylphiette | https://mushokutensei.jp/character/ |
| Roxy Migurdia | https://mushokutensei.jp/character/ |
| Sasaki | https://magazine.jp.square-enix.com/biggangan/introduction/yanisuu/ |
| Yamada / Tayama | https://magazine.jp.square-enix.com/biggangan/introduction/yanisuu/ |
| Yani Neko | https://yanineko-anime.com/ |
| Miyu Suzuki | https://sh-anime.shochiku.co.jp/seihantai_anime/en/character/suzuki |
| Yusuke Tani | https://sh-anime.shochiku.co.jp/seihantai_anime/en/character/%E8%B0%B7 |
| Motoko Kusanagi | https://www.theghostintheshell-anime.jp/en/character/motoko-kusanagi/ |
| Frieren | https://frieren-anime.jp/character/chara_group1/1-1/ |
| Fern | https://frieren-anime.jp/character/chara_group1/1-5/ |
| Hitori Gotoh | https://bocchi.rocks/tv/character/hitori.html |
| Nijika Ijichi | https://bocchi.rocks/tv/character/nijika.html |
| Ruby Hoshino | https://ichigoproduction.com/Season3/chara/ruby.html |
| Kana Arima | https://ichigoproduction.com/Season3/chara/kana.html |
| MEM-cho | https://ichigoproduction.com/Season3/chara/memcho.html |
