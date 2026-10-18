#!/usr/bin/env python3
"""Validate the static Spanish learning website without third-party packages."""
import json
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parent.parent
DOCS=ROOT/"docs"
class HTMLCheck(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=set()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if "id" in a:
            assert a["id"] not in self.ids,"Duplicate HTML ID"
            self.ids.add(a["id"])

def main():
    data=json.loads((DOCS/"assets/content.json").read_text(encoding="utf-8"))
    scenarios=data["scenarios"]
    assert len(scenarios)>=12
    assert sum(s["domain"]=="school" for s in scenarios)>=7
    assert len(data["colloquial"])>=20
    assert len(data["families"])>=12
    valid_domains={x["id"] for x in data["domains"]}
    ids=set()
    for s in scenarios:
        assert s["id"] not in ids, s["id"]
        ids.add(s["id"])
        assert s["domain"] in valid_domains and s["level"] in {"A1","A2","B1","B2"}
        assert len(s["vocab"])>=6 and len(s["dialogue"])>=4
        assert s["expressions"] and s["challenges"]
        assert all(x.get("es") and x.get("zh") for x in s["vocab"])
        assert all(x.get("es") and x.get("zh") for x in s["dialogue"])
        assert all(x.get("natural") and x.get("standard") and x.get("note") for x in s["expressions"])
        assert all(x.get("prompt") and x.get("answer") for x in s["challenges"])
    packs = [
        json.loads((DOCS / "assets" / name).read_text(encoding="utf-8"))
        for name in ("school-pathways.json", "health-booking.json", "health-consultation.json", "health-testing.json", "health-pharmacy-path.json", "health-family-emergency.json", "life-pathways.json")
    ]
    all_tracks = {}
    for pack in packs:
        assert pack["schema"] == 2
        for track in pack["tracks"]:
            assert track["id"] not in all_tracks, track["id"]
            assert track["domain"] in valid_domains
            all_tracks[track["id"]] = track
        for scene in pack["scenarios"]:
            assert scene["id"] not in ids, scene["id"]
            ids.add(scene["id"])
            assert scene["track"] in all_tracks, scene["id"]
            assert scene["domain"] == all_tracks[scene["track"]]["domain"]
            assert scene["level"] in {"A1", "A2", "B1", "B2"}
            assert scene["stage"] == {"A1": 1, "A2": 2, "B1": 3, "B2": 4}[scene["level"]]
            assert scene.get("goal") and scene["mission"]["transfer"]
            assert len(scene["vocab"]) >= 8, scene["id"]
            assert len(scene["dialogue"]) >= 7, scene["id"]
            assert len(scene["challenges"]) >= 3
            assert len(scene["expressions"]) >= 2
            assert all(x.get("es") and x.get("zh") for x in scene["vocab"])
            assert all(x.get("es") and x.get("zh") and x.get("speaker") for x in scene["dialogue"])
            assert all(x.get("standard") and x.get("natural") and x.get("note") for x in scene["expressions"])
            assert all(x.get("prompt") and x.get("answer") for x in scene["challenges"])
            decisions = scene["mission"]["decisions"]
            assert len(decisions) >= 2
            for decision in decisions:
                assert decision.get("situation") and decision.get("prompt") and decision.get("model")
                assert len(decision["choices"]) >= 2
                assert sum(bool(x.get("correct")) for x in decision["choices"]) == 1
                assert all(x.get("es") and x.get("feedback") for x in decision["choices"])
            scenarios.append(scene)
    assert len(all_tracks) == 12
    assert sum(s["domain"] == "school" for s in scenarios) >= 23
    assert len(scenarios) == 61
    assert sum(s["domain"] == "health" for s in scenarios) == 26
    assert sum(s.get("track", "").startswith("clinic-") for s in scenarios) == 20
    for track_id in all_tracks:
        bands={s["level"] for s in scenarios if s.get("track")==track_id}
        assert bands == {"A1", "A2", "B1", "B2"}, track_id
    # The new healthcare curriculum must include appointments, consultation, testing,
    # prescriptions and pediatric/emergency triage at every teaching stage.
    for track_name in ("clinic-booking", "clinic-consultation", "clinic-testing",
                       "clinic-pharmacy", "clinic-family-emergency"):
        lesson_set = [scene for scene in scenarios if scene.get("track") == track_name]
        assert len(lesson_set) == 4, track_name
        assert sum(len(scene["dialogue"]) for scene in lesson_set) >= 30
        assert all(len(scene["vocab"]) >= 10 for scene in lesson_set)
        assert all(len(scene["mission"]["decisions"]) >= 2 for scene in lesson_set)
        assert all(all(len(d["choices"]) >= 3 for d in scene["mission"]["decisions"]) for scene in lesson_set)

    assert len({x["es"].lower() for x in data["colloquial"]})==len(data["colloquial"])
    assert all(x.get("neutral") and x.get("use") and x.get("avoid") for x in data["colloquial"])
    for path in ["index.html","assets/content.json","assets/app.js","assets/pathways.js","assets/school-pathways.json","assets/life-pathways.json","assets/health-booking.json","assets/health-consultation.json","assets/health-testing.json","assets/health-pharmacy-path.json","assets/health-family-emergency.json","assets/audio.js","assets/styles.css","assets/favicon.svg"]:
        assert (DOCS/path).is_file(),path
    checker=HTMLCheck()
    checker.feed((DOCS/"index.html").read_text(encoding="utf-8"))
    assert {"view-scenarios","view-detail","view-vocabulary","view-colloquial","view-maps","view-review","nav","main"}.issubset(checker.ids)
    print("Validation OK:",len(scenarios),"scenes;",sum(s["domain"]=="school" for s in scenarios),
          "school;",len(all_tracks),"progressive paths;",
          sum(len(s.get("mission",{}).get("decisions",[])) for s in scenarios),"branch decisions")

if __name__=="__main__": main()
