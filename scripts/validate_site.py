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
    assert len({x["es"].lower() for x in data["colloquial"]})==len(data["colloquial"])
    assert all(x.get("neutral") and x.get("use") and x.get("avoid") for x in data["colloquial"])
    for path in ["index.html","assets/content.json","assets/app.js","assets/styles.css","assets/favicon.svg"]:
        assert (DOCS/path).is_file(),path
    checker=HTMLCheck()
    checker.feed((DOCS/"index.html").read_text(encoding="utf-8"))
    assert {"view-scenarios","view-detail","view-vocabulary","view-colloquial","view-maps","view-review","nav","main"}.issubset(checker.ids)
    print("Validation OK:",len(scenarios),"scenes;",sum(s["domain"]=="school" for s in scenarios),"school;",len(data["colloquial"]),"colloquial;",len(data["families"]),"families")

if __name__=="__main__": main()
