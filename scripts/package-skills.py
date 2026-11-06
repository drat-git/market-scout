"""Package the public skill download from an explicit, reproducible allowlist."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
NAMES = ("research-market", "screen-providers", "compare-markets", "write-market-brief")
DOCS = ("CLI.md", "SOP.md", "CASE-CONFIG.md", "WALKTHROUGH.md", "SKILL-AUDIT.md", "ATTRIBUTION.md", "THIRD_PARTY_NOTICES.md", "METHODOLOGY.md", "SERVER.md")
EXAMPLES = ("cases/pediatric-therapy.json", "cases/commercial-hvac.json", "examples/pediatric-therapy/research.json", "examples/pediatric-therapy/decisions.json", "examples/commercial-hvac/research.json", "examples/commercial-hvac/decisions.json", "examples/commercial-hvac/SOURCES.md")


def build():
    entries = {}
    for name in NAMES:
        folder = ROOT / "skills" / name
        for file in sorted(folder.rglob("*")):
            if file.is_file() and not file.is_symlink() and file.suffix in (".md", ".yaml") and not any(part.startswith(".") for part in file.relative_to(folder).parts):
                entries[file.relative_to(ROOT).as_posix()] = file.read_bytes()
        if f"skills/{name}/SKILL.md" not in entries:
            raise ValueError(f"Missing skill: {name}")
    for name in DOCS:
        entries[f"docs/{name}"] = (ROOT / "docs" / name).read_bytes()
    for name in EXAMPLES:
        entries[name] = (ROOT / name).read_bytes()
    entries["START_HERE.md"] = b"""# Market Scout skills

This bundle contains four skills and their operating guide. It requires the
[Market Scout repository](https://github.com/drat-git/market-scout), Node 22+, and npm dependencies; it is not a standalone
application and does not contain the CLI. Example configurations and research
inputs are included; the commercial-HVAC input is clearly labeled fictional.

Start with [installation and commands](docs/CLI.md), then the
[offline walkthrough](docs/WALKTHROUGH.md) or [research SOP](docs/SOP.md).
Copy complete skill folders, including references and agents metadata, into the
project-scoped skills directory described in the installation guide.

The default CLI makes no AI API calls. Your assistant collects sources and writes
analysis using its available tools. Configure your industry, markets, criteria,
and comparison groups with docs/CASE-CONFIG.md. Austin/San Antonio pediatric
therapy is one example configuration. The public dashboard stays separate.

Generated from the repository's canonical skills by npm run package:skills.
Source-code links in the guides resolve in the required repository checkout.
"""
    target = ROOT / "public" / "market-scout-skills.zip"
    with ZipFile(target, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(entries.items()):
            info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        assert set(archive.namelist()) == set(entries)
        assert all(archive.read(name) == data for name, data in entries.items())
    print(f"Packaged and verified {len(entries)} files: {target.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
