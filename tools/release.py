"""Package and verify the exact Chainwork release candidate."""

import argparse
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZIP_DEFLATED, ZipFile


def metadata():
    release = json.loads(Path("release/release.json").read_text(encoding="utf-8"))
    package = json.loads(Path("package.json").read_text(encoding="utf-8"))
    version = release["version"]
    if not re.fullmatch(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", version):
        raise ValueError(f"Invalid release version: {version}")
    if package["version"] != version or release["tag"] != f"v{version}":
        raise ValueError("package.json version, release version and tag must match")
    if not release["title"].strip() or type(release["prerelease"]) is not bool:
        raise ValueError("Release title and prerelease flag are required")
    if not notes_path(release).read_text(encoding="utf-8").strip():
        raise ValueError("Release notes are empty")
    return release


def notes_path(release):
    return Path("release/notes") / f"{release['tag']}.md"


def archive_names(release):
    return [f"Chainwork-{release['tag']}-{kind}.zip" for kind in ("Web", "Source")]


def file_record(path):
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return {"name": path.name, "size": path.stat().st_size, "sha256": digest}


def checksum_text(assets, names):
    return "".join(f"{file_record(assets / name)['sha256']}  {name}\n" for name in names)


class Entrypoints(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.styles = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("type") == "module" and attrs.get("src"):
            self.scripts.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet" and attrs.get("href"):
            self.styles.append(attrs["href"])


def verify_archives(assets, names, tag, sha):
    web, source = names
    with ZipFile(assets / web) as archive:
        if archive.testzip() is not None:
            raise ValueError("Web ZIP contains a damaged file")
        html = Entrypoints()
        html.feed(archive.read("index.html").decode("utf-8"))
        for urls in (html.scripts, html.styles):
            local = [urlsplit(url).path.lstrip("/") for url in urls if not urlsplit(url).netloc]
            if not local or any(not archive.read(path) for path in local):
                raise ValueError("Web ZIP is missing an entrypoint")
        archive.getinfo("LICENSE")
        archive.getinfo("README.md")
    with ZipFile(assets / source) as archive:
        if archive.testzip() is not None or archive.comment.decode("ascii") != sha:
            raise ValueError("Source ZIP is damaged or does not match the candidate commit")
        for name in ("LICENSE", "README.md", "package.json", "bun.lock"):
            archive.getinfo(f"Chainwork-{tag}/{name}")


def build(assets, manifest_file, sha):
    release = metadata()
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    if sha != head:
        raise ValueError("The release SHA must match the checked-out commit")
    assets.mkdir(parents=True, exist_ok=True)
    names = archive_names(release)
    with ZipFile(assets / names[0], "w", ZIP_DEFLATED) as archive:
        for path in sorted(Path("dist").rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to("dist").as_posix())
        for name in ("LICENSE", "README.md"):
            archive.write(name)
    subprocess.run(
        ["git", "archive", "--format=zip", f"--prefix=Chainwork-{release['tag']}/",
         "-o", str(assets / names[1]), sha],
        check=True,
    )
    verify_archives(assets, names, release["tag"], sha)
    (assets / "SHA256SUMS.txt").write_text(checksum_text(assets, names), encoding="utf-8")
    manifest = {
        "version": release["version"],
        "tag": release["tag"],
        "source_sha": sha,
        "assets": [file_record(assets / name) for name in [*names, "SHA256SUMS.txt"]],
    }
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    manifest_file.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def verify(assets, manifest_file, sha):
    release = metadata()
    names = archive_names(release)
    allowed = [*names, "SHA256SUMS.txt"]
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    actual = {
        "version": release["version"],
        "tag": release["tag"],
        "source_sha": sha,
        "assets": [file_record(assets / name) for name in allowed],
    }
    if set(allowed) != {path.name for path in assets.iterdir()} or manifest != actual:
        raise ValueError("Release manifest and downloaded assets do not match the expected candidate")
    if (assets / "SHA256SUMS.txt").read_text(encoding="utf-8") != checksum_text(assets, names):
        raise ValueError("The ZIP checksums do not match SHA256SUMS.txt")
    verify_archives(assets, names, release["tag"], sha)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("metadata", "build", "verify"))
    parser.add_argument("--assets", type=Path, default=Path("out/release-assets"))
    parser.add_argument("--manifest", type=Path, default=Path("out/release-manifest/manifest.json"))
    parser.add_argument("--sha")
    args = parser.parse_args()
    if args.command == "metadata":
        print(json.dumps(metadata(), indent=2))
    else:
        if not args.sha:
            parser.error("--sha is required for build and verify")
        operation = build if args.command == "build" else verify
        operation(args.assets, args.manifest, args.sha)
