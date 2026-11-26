"""Validate and publish a source-bound Chainwork release with GitHub CLI."""

import argparse
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from release import metadata, notes_path, verify


def gh(*args):
    return subprocess.check_output(["gh", *args], text=True)


def api(path, *args):
    return json.loads(gh("api", f"repos/{os.environ['GITHUB_REPOSITORY']}/{path}", *args))


def pages(path, *args):
    return api(path, "--paginate", "--slurp", *args)


def require_current_main(sha):
    if os.environ["GITHUB_REF"] != "refs/heads/main":
        raise ValueError("Run Publish Release from main")
    if api("branches/main")["commit"]["sha"] != sha:
        raise ValueError("main has advanced. Build and validate the new commit.")


def successful_runs(workflow, sha, events):
    for page in pages(
        f"actions/workflows/{workflow}/runs", "-X", "GET",
        "-f", "branch=main", "-f", f"head_sha={sha}", "-f", "status=success",
    ):
        for run in page["workflow_runs"]:
            if run["event"] in events and run["head_sha"] == sha:
                yield run


def candidate_run(sha, requested):
    if next(successful_runs("ci.yml", sha, {"push", "workflow_dispatch"}), None) is None:
        raise ValueError("No successful Chainwork CI run for the current main commit")
    if not requested:
        run = next(successful_runs("build-artifacts.yml", sha, {"workflow_dispatch"}), None)
        if run is None:
            raise ValueError("Run Build Release Artifacts successfully for this commit")
        return str(run["id"])
    if not re.fullmatch(r"[1-9][0-9]*", requested):
        raise ValueError("build_run_id must be a numeric GitHub Actions run ID")
    run = api(f"actions/runs/{requested}")
    expected = {
        "path": ".github/workflows/build-artifacts.yml",
        "head_branch": "main",
        "head_sha": sha,
        "event": "workflow_dispatch",
        "conclusion": "success",
    }
    if any(run[field] != value for field, value in expected.items()):
        raise ValueError("Requested run is not a successful build of the current main commit")
    return requested


def tag_commit(tag):
    ref = f"refs/tags/{tag}"
    matches = api(f"git/matching-refs/tags/{tag}")
    for match in matches:
        if match["ref"] == ref:
            obj = match["object"]
            while obj["type"] == "tag":
                obj = api(f"git/tags/{obj['sha']}")["object"]
            return obj["sha"]
    return None


def find_release(tag):
    matches = [item for page in pages("releases?per_page=100") for item in page if item["tag_name"] == tag]
    if len(matches) > 1:
        raise ValueError(f"Multiple GitHub releases reference {tag}")
    return matches[0] if matches else None


def provenance(sha, run_id):
    return f"<!-- chainwork-release source={sha} build={run_id} -->"


def require_available_release(tag, sha, run_id):
    existing = find_release(tag)
    if existing and (
        not existing["draft"]
        or existing["target_commitish"] != sha
        or provenance(sha, run_id) not in (existing["body"] or "")
    ):
        raise ValueError(f"GitHub already has a release or unrelated draft for {tag}")
    if tag_commit(tag) not in (None, sha):
        raise ValueError(f"The tag {tag} points to a different commit")
    return existing


def require_publisher():
    allowed = json.loads(Path("release/authorized_publishers.json").read_text(encoding="utf-8"))["publishers"]
    allowed = {actor.casefold() for actor in allowed}
    for key in ("GITHUB_ACTOR", "GITHUB_TRIGGERING_ACTOR"):
        if os.environ[key].casefold() not in allowed:
            raise ValueError(f"{os.environ[key]} is not authorized to publish Chainwork")


def released_assets(release_id):
    return {item["name"]: item for page in pages(f"releases/{release_id}/assets?per_page=100") for item in page}


def verify_remote_asset(remote, expected):
    if (remote["state"], remote["size"], remote["digest"]) != (
        "uploaded", expected["size"], f"sha256:{expected['sha256']}"
    ):
        raise ValueError(f"GitHub asset {expected['name']} does not match the candidate manifest")


def publish(release, manifest, sha, run_id, assets, draft, notes_file):
    tag = release["tag"]
    if draft is None:
        repo = os.environ["GITHUB_REPOSITORY"]
        server = os.environ["GITHUB_SERVER_URL"]
        notes = notes_path(release).read_text(encoding="utf-8").rstrip()
        notes_file.write_text(
            f"{notes}\n\n[Build evidence]({server}/{repo}/actions/runs/{run_id})"
            f" · [Source commit]({server}/{repo}/commit/{sha})\n\n{provenance(sha, run_id)}\n",
            encoding="utf-8",
        )
        options = ["--prerelease"] if release["prerelease"] else []
        gh("release", "create", tag, "--draft", "--target", sha,
           "--title", release["title"], "--notes-file", str(notes_file), *options)
        draft = require_available_release(tag, sha, run_id)
        if draft is None:
            raise ValueError("GitHub did not return the newly created draft")

    release_id = draft["id"]
    expected = {item["name"]: item for item in manifest["assets"]}
    remote_assets = released_assets(release_id)
    if set(remote_assets) - set(expected):
        raise ValueError("Draft contains unexpected release files")
    for name, item in expected.items():
        remote = remote_assets.get(name)
        if remote and remote["state"] == "starter":
            gh("api", "-X", "DELETE", f"repos/{os.environ['GITHUB_REPOSITORY']}/releases/assets/{remote['id']}")
            remote = None
        if remote:
            verify_remote_asset(remote, item)
        else:
            gh("release", "upload", tag, str(assets / name))

    remote_assets = released_assets(release_id)
    if set(remote_assets) != set(expected):
        raise ValueError("GitHub draft does not contain the exact release asset set")
    for name, item in expected.items():
        verify_remote_asset(remote_assets[name], item)
    require_current_main(sha)
    draft = require_available_release(tag, sha, run_id)
    if draft is None or draft["id"] != release_id:
        raise ValueError("The release draft changed during publication")
    result = api(f"releases/{release_id}", "-X", "PATCH", "-F", "draft=false")
    if result["draft"] or tag_commit(tag) != sha:
        raise ValueError("GitHub release or tag did not reach the expected state")
    print(result["html_url"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("validate", "publish"))
    parser.add_argument("--build-run-id", default="")
    args = parser.parse_args()

    sha = os.environ["GITHUB_SHA"]
    if args.mode == "publish":
        require_publisher()
    require_current_main(sha)
    release = metadata()
    run_id = candidate_run(sha, args.build_run_id)
    draft = require_available_release(release["tag"], sha, run_id)
    with tempfile.TemporaryDirectory() as folder:
        output = Path(folder)
        assets = output / "assets"
        manifest_dir = output / "manifest"
        gh("run", "download", run_id, "--name", "release-assets", "--dir", str(assets))
        gh("run", "download", run_id, "--name", "release-manifest", "--dir", str(manifest_dir))
        manifest = verify(assets, manifest_dir / "manifest.json", sha)
        print(f"Validated {release['tag']} from build {run_id} at {sha}")
        if args.mode == "publish":
            publish(release, manifest, sha, run_id, assets, draft, output / "notes.md")
    if args.mode == "validate":
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
            print(f"build_run_id={run_id}", file=output)


if __name__ == "__main__":
    main()
