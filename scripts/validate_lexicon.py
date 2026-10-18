#!/usr/bin/env python3
"""Check curated vocabulary and provisional candidate layers before merging changes.

Uses only Python standard library. Run from repository root:
    python scripts/validate_lexicon.py
"""
from __future__ import annotations

import csv
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
TARGETS = {"A1": 1000, "A2": 1500, "B1": 3000, "B2": 2500}
MASTER_COLUMNS = (
    "id", "level", "unit", "spanish", "part_of_speech", "meaning_zh",
    "chunk", "example_es", "example_zh", "relation", "stage",
    "last_review", "next_review", "error_count",
)
CANDIDATE_COLUMNS = (
    "candidate_id", "provisional_band", "lemma", "source_pos", "source_rank",
    "frequency_count", "curated_meaning_zh", "curated_example_es",
    "linked_curated_id", "review_status", "source", "quality_note",
)
VALID_STATUS = {"pending_manual_review", "initial_curated_match", "curated_other_level"}
MAPS = (
    "00-A1-B2-词汇知识地图.md",
    "A1-生活核心语义图.md",
    "A2-租房交通与行政.md",
    "B1-表达观点与经历.md",
    "B2-论证与抽象语义.md",
    "词族-词根词缀关系图.md",
)

def read_rows(path: Path, columns: tuple[str, ...]) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if tuple(reader.fieldnames or ()) != columns:
            raise ValueError(f"{path}: wrong columns: {reader.fieldnames}")
        rows = list(reader)
    if not rows:
        raise ValueError(f"{path}: empty data")
    if any(None in row for row in rows):
        raise ValueError(f"{path}: broken CSV columns")
    return rows

def main() -> None:
    master = read_rows(ROOT / "data/vocabulary_master.csv", MASTER_COLUMNS)
    ids = [row["id"] for row in master]
    if len(ids) != len(set(ids)):
        raise ValueError("master has duplicate IDs")
    for row in master:
        if row["level"] not in TARGETS:
            raise ValueError(f"invalid level: {row['id']}")
        if not all(row[k].strip() for k in ["id", "spanish", "meaning_zh", "example_es"]):
            raise ValueError(f"missing teaching field: {row['id']}")
    known_ids = set(ids)
    by_level = Counter(row["level"] for row in master)

    wordset: set[str] = set()
    candidate_ids: set[str] = set()
    linked = 0
    for level, expected in TARGETS.items():
        path = ROOT / f"data/candidates/candidate-{level}.csv"
        rows = read_rows(path, CANDIDATE_COLUMNS)
        if len(rows) != expected:
            raise ValueError(f"{path}: expected {expected} rows, got {len(rows)}")
        for row in rows:
            word = row["lemma"].casefold().strip()
            if not word or word in wordset:
                raise ValueError(f"missing or duplicate candidate lemma: {word}")
            wordset.add(word)
            cid = row["candidate_id"]
            if cid in candidate_ids:
                raise ValueError(f"duplicate candidate ID: {cid}")
            candidate_ids.add(cid)
            if row["provisional_band"] != level:
                raise ValueError(f"wrong provisional bucket: {cid}")
            if row["review_status"] not in VALID_STATUS:
                raise ValueError(f"unexpected status: {cid}")
            if row["review_status"] in {"initial_curated_match", "curated_other_level"}:
                linked += 1
                if row["linked_curated_id"] not in known_ids:
                    raise ValueError(f"invalid curated link: {cid}")
            if not row["source"]:
                raise ValueError(f"missing source: {cid}")

    # All new expansion rows must include both bilingual examples and a contextual chunk.
    from glob import glob
    expansion_files = sorted(glob(str(ROOT / "data" / "expansions" / "2026-10-*.csv")))
    for expansion_file in expansion_files:
        with open(expansion_file, "r", encoding="utf-8-sig", newline="") as input_stream:
            expansion = csv.DictReader(input_stream)
            required = {"level", "unit", "spanish", "part_of_speech", "meaning_zh",
                        "chunk", "example_es", "example_zh"}
            if set(expansion.fieldnames or []) != required:
                raise ValueError(f"wrong expansion schema: {expansion_file}")
            for n, record in enumerate(expansion, 2):
                if not all(record.get(field, "").strip() for field in required):
                    raise ValueError(f"missing bilingual entry: {expansion_file}, row {n}")

    for filename in MAPS:
        path = ROOT / "mindmaps" / filename
        body = path.read_text(encoding="utf-8")
        if body.count("```mermaid") != 1 or body.count("```") != 2:
            raise ValueError(f"bad Mermaid fence: {filename}")

    if not (ROOT / "docs/8000词候选库-分级与版权说明.md").exists():
        raise ValueError("missing upstream attribution and source notes")
    family = read_rows(
        ROOT / "data/word_families.csv",
        ("base", "derived", "pattern", "derived_meaning_zh",
         "example_es", "suggested_level", "relation_type", "review_note"),
    )
    print("Validation OK")
    print("Curated teaching entries:", len(master), dict(sorted(by_level.items())))
    print("Provisional lemmas:", len(wordset))
    print("Candidate entries linked to curated master:", linked)
    print("Word-family examples:", len(family))
    print("Mermaid maps:", len(MAPS))

if __name__ == "__main__":
    main()
