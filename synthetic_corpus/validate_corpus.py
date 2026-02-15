#!/usr/bin/env python3
"""
Validates cross-references, timestamps, coverage, and persona balance
in a generated OrgPulse synthetic corpus.

Usage:
    python validate_corpus.py output/
"""

import json
import os
import sys
import glob
from datetime import datetime


def load_json(path: str):
    with open(path) as f:
        return json.load(f)


def validate(corpus_dir: str):
    errors: list[str] = []
    warnings: list[str] = []

    # ── Load all artifacts ──
    people_path = os.path.join(corpus_dir, "people.json")
    if not os.path.exists(people_path):
        errors.append("people.json not found")
        return errors, warnings
    people = load_json(people_path)
    person_ids = {p["id"] for p in people}

    # Decisions
    dec_path = os.path.join(corpus_dir, "decisions", "decisions.json")
    decisions = load_json(dec_path) if os.path.exists(dec_path) else []
    dec_ids = {d["id"] for d in decisions}

    # Beliefs
    bel_path = os.path.join(corpus_dir, "beliefs", "beliefs.json")
    beliefs = load_json(bel_path) if os.path.exists(bel_path) else []

    # Slack messages
    slack_dir = os.path.join(corpus_dir, "slack")
    messages: list[dict] = []
    if os.path.isdir(slack_dir):
        for fpath in sorted(glob.glob(os.path.join(slack_dir, "*.json"))):
            msgs = load_json(fpath)
            for msg in msgs:
                msg["_file"] = os.path.basename(fpath)
            messages.extend(msgs)
    msg_ids = {m["id"] for m in messages}

    # Docs
    docs_dir = os.path.join(corpus_dir, "docs")
    doc_ids: set[str] = set()
    doc_files: list[str] = []
    if os.path.isdir(docs_dir):
        for fpath in sorted(glob.glob(os.path.join(docs_dir, "*.md"))):
            doc_files.append(fpath)
            with open(fpath) as f:
                content = f.read()
            # Extract id from frontmatter
            for line in content.split("\n"):
                if line.startswith("id:"):
                    doc_ids.add(line.split(":", 1)[1].strip())
                    break

    # Meetings
    mtg_dir = os.path.join(corpus_dir, "meetings")
    mtg_files: list[str] = []
    if os.path.isdir(mtg_dir):
        mtg_files = sorted(glob.glob(os.path.join(mtg_dir, "*.txt")))

    all_known_ids = dec_ids | msg_ids | doc_ids

    # ── Check 1: Referenced IDs exist ──
    for msg in messages:
        refs = msg.get("references", {})
        for dec_ref in refs.get("decisions", []):
            if dec_ref not in dec_ids:
                errors.append(f"Message {msg['id']} references unknown decision {dec_ref}")
        for doc_ref in refs.get("docs", []):
            if doc_ref not in doc_ids:
                errors.append(f"Message {msg['id']} references unknown doc {doc_ref}")
        for msg_ref in refs.get("messages", []):
            if msg_ref not in msg_ids:
                errors.append(f"Message {msg['id']} references unknown message {msg_ref}")

    for dec in decisions:
        for fu in dec.get("follow_ups", []):
            if fu not in dec_ids and fu not in doc_ids:
                errors.append(f"Decision {dec['id']} follow_up references unknown ID {fu}")
        for ref in dec.get("references", []):
            if ref not in all_known_ids:
                errors.append(f"Decision {dec['id']} references unknown ID {ref}")

    for belief in beliefs:
        for ev in belief.get("evidence", []):
            ev_id = ev.get("id", "")
            if ev["type"] == "decision" and ev_id not in dec_ids:
                errors.append(f"Belief {belief['id']} references unknown decision {ev_id}")
            elif ev["type"] == "doc" and ev_id not in doc_ids:
                errors.append(f"Belief {belief['id']} references unknown doc {ev_id}")
            elif ev["type"] == "message" and ev_id not in msg_ids:
                # Messages might not all exist if days are limited
                warnings.append(f"Belief {belief['id']} references message {ev_id} (may be from a filtered day)")
            elif ev["type"] == "meeting":
                pass  # meetings don't have structured IDs in the same way

    # ── Check 2: Timestamps are monotonic per channel ──
    by_channel: dict[str, list] = {}
    for msg in messages:
        ch = msg.get("channel", "unknown")
        by_channel.setdefault(ch, []).append(msg)

    for ch, ch_msgs in by_channel.items():
        timestamps = [m.get("timestamp", "") for m in ch_msgs]
        for i in range(1, len(timestamps)):
            if timestamps[i] < timestamps[i - 1]:
                errors.append(
                    f"Non-monotonic timestamp in #{ch}: {ch_msgs[i-1]['id']} ({timestamps[i-1]}) > {ch_msgs[i]['id']} ({timestamps[i]})"
                )

    # ── Check 3: Topic coverage ──
    topic_keywords = {
        "mvp_scope": ["cut", "scope", "feature", "keep", "MVP"],
        "memory_design": ["chunk", "fact", "category", "memory_type", "hierarchy"],
        "retrieval_design": ["retrieval", "rerank", "pgvector", "citation", "threshold"],
        "graphrag": ["GraphRAG", "graph", "entity", "multi-hop"],
        "continual_learning": ["learning", "extract", "smarter"],
        "decision_rehearsal": ["rehearsal", "round 1", "round 2", "deliberat"],
        "hallucination_incident": ["hallucination", "wrong citation", "wrong-clone", "postmortem"],
        "onboarding": ["onboarding", "brief", "new hire"],
        "demo_script": ["demo script", "3 minutes", "hook", "acts"],
    }

    all_text = " ".join(m["text"] for m in messages)
    for doc_path in doc_files:
        with open(doc_path) as f:
            all_text += " " + f.read()
    for dec in decisions:
        all_text += " " + dec.get("rationale", "")
        all_text += " " + dec.get("title", "")

    topics_found = set()
    for topic, keywords in topic_keywords.items():
        if any(kw.lower() in all_text.lower() for kw in keywords):
            topics_found.add(topic)
    topics_missing = set(topic_keywords.keys()) - topics_found
    for t in topics_missing:
        errors.append(f"Required topic '{t}' not found in corpus text")

    # Topic must appear in MULTIPLE artifacts (not just one)
    for topic, keywords in topic_keywords.items():
        count = 0
        for m in messages:
            if any(kw.lower() in m["text"].lower() for kw in keywords):
                count += 1
        if count < 2:
            warnings.append(f"Topic '{topic}' appears in only {count} messages (want ≥2)")

    # ── Check 4: Per-person coverage ──
    msg_per_person: dict[str, int] = {}
    for m in messages:
        msg_per_person[m["author"]] = msg_per_person.get(m["author"], 0) + 1

    bel_per_person: dict[str, int] = {}
    for b in beliefs:
        bel_per_person[b["person"]] = bel_per_person.get(b["person"], 0) + 1

    for pid in person_ids:
        if msg_per_person.get(pid, 0) < 5:
            errors.append(f"Person '{pid}' has only {msg_per_person.get(pid, 0)} messages (want ≥5)")
        if bel_per_person.get(pid, 0) < 8:
            errors.append(f"Person '{pid}' has only {bel_per_person.get(pid, 0)} beliefs (want ≥8)")

    # ── Check 5: Author IDs valid ──
    for m in messages:
        if m["author"] not in person_ids:
            errors.append(f"Message {m['id']} has unknown author '{m['author']}'")
    for d in decisions:
        if d["proposer"] not in person_ids:
            errors.append(f"Decision {d['id']} has unknown proposer '{d['proposer']}'")
    for b in beliefs:
        if b["person"] not in person_ids:
            errors.append(f"Belief {b['id']} has unknown person '{b['person']}'")

    # ── Print summary ──
    print(f"\n{'=' * 60}")
    print(f"  VALIDATION RESULTS")
    print(f"{'=' * 60}")
    print(f"  Corpus:     {corpus_dir}/")
    print(f"  Messages:   {len(messages)}")
    print(f"  Docs:       {len(doc_files)}")
    print(f"  Meetings:   {len(mtg_files)}")
    print(f"  Decisions:  {len(decisions)}")
    print(f"  Beliefs:    {len(beliefs)}")
    print(f"  Msg/person: {json.dumps(msg_per_person, indent=None)}")
    print(f"  Bel/person: {json.dumps(bel_per_person, indent=None)}")
    print(f"  Topics:     {len(topics_found)}/{len(topic_keywords)} ({', '.join(sorted(topics_found))})")
    if topics_missing:
        print(f"  Missing:    {', '.join(sorted(topics_missing))}")
    print(f"  Errors:     {len(errors)}")
    print(f"  Warnings:   {len(warnings)}")

    if errors:
        print(f"\n  ERRORS:")
        for e in errors:
            print(f"    ✗ {e}")
    if warnings:
        print(f"\n  WARNINGS:")
        for w in warnings:
            print(f"    ⚠ {w}")
    if not errors:
        print(f"\n  ✓ CORPUS IS VALID")
    print(f"{'=' * 60}\n")

    return errors, warnings


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_corpus.py <corpus_dir>")
        sys.exit(1)
    errs, warns = validate(sys.argv[1])
    sys.exit(1 if errs else 0)
