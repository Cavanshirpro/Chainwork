# Chainwork releases

The release process follows the LeoMiniGames model. CI checks every pull request and push to `main`. The maintainer builds a versioned candidate manually, validates it separately, then explicitly publishes it.

## Release candidate

1. Set the version in `package.json`, update [release/release.json](release/release.json), and add the matching file in `release/notes/`.
2. Push the candidate to `main` and wait for **Chainwork CI** to pass for that commit.
3. Run **Build Release Artifacts** from `main`. The workflow uploads `release-assets` and a separate `release-manifest` tied to the source SHA.
4. Run **Publish Release** from `main` in `validate` mode. Optionally supply a `build_run_id` or leave it blank to select the latest successful build for the same SHA.
5. Run **Publish Release** again in `publish` mode with the validated build run ID. An authorized account in [release/authorized_publishers.json](release/authorized_publishers.json) must start publication. Configure required reviewers on the GitHub `release` environment if a separate approval is required.

If `main` advances, build and validate a new candidate. If publication is interrupted after creating a draft, the same candidate can be retried. A draft with different provenance or an existing tag on a different commit blocks publication.

## Release files

| File | Contents |
| --- | --- |
| `Chainwork-v<version>-Web.zip` | Static production build with the license and README |
| `Chainwork-v<version>-Source.zip` | Tracked files from the exact release commit |
| `SHA256SUMS.txt` | SHA-256 checksums for the ZIPs |

```sh
sha256sum -c SHA256SUMS.txt
```

CI type-checks, runs the existing game-rule tests, and builds on Ubuntu, Windows, and macOS. The release build repeats those checks on Ubuntu and verifies the ZIP contents. Browser and device testing are outside the automated release checks.

## v0.1.0

[Release notes](release/notes/v0.1.0.md)
