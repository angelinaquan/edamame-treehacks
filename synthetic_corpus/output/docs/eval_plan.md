---
id: doc-eval
title: "Edamame — Evaluation Plan"
author: angelina
created: 2026-02-07
updated: 2026-02-12
status: final
references: {"decisions": ["dec-004", "dec-010", "dec-012", "dec-013"]}
---

# Edamame — Evaluation Plan

**Status:** Final | **Owner:** Angelina Quan | **Last updated:** Day 10

## Principle
If we can't measure it, it doesn't count. Every feature needs quantitative eval.

## Metrics

### 1. Retrieval Quality
- **Precision@5:** fraction of top-5 results that are relevant (target: >0.9)
- **Clone isolation:** fraction of queries with 0 wrong-clone citations (target: 1.0)
- **Latency:** end-to-end query time (target: <3s warm, <4s cold)

### 2. Fact Extraction
- **Recall:** fraction of key information captured from test messages (target: >0.7)
- **Precision:** fraction of extracted facts that are actually correct (target: >0.85)
- **Relevance filter accuracy:** true positive rate on info-density classification

### 3. Citation Accuracy
- **Attribution correctness:** does [N] point to the right source? (target: 1.0)
- **Source snippet relevance:** is the cited text actually supporting the claim?

### 4. CEO Insights
- **Stance accuracy:** does the clone's stance match ground truth? (target: >0.8)
- **Theme coherence:** are extracted themes meaningful and non-redundant?

## Test Set
- 50 test queries across 4 clones (12-13 per clone)
- 10 CEO insight scenarios with known ground-truth stances
- 20 fact extraction test messages with labeled key information

## Results (as of Day 10, post-incident fix)

| Metric                  | Value  | Target | Status |
|-------------------------|--------|--------|--------|
| Precision@5             | 0.94   | >0.9   | ✅     |
| Clone isolation         | 1.0    | 1.0    | ✅     |
| Retrieval latency (warm)| 1.8s   | <3s    | ✅     |
| Fact extraction recall  | 0.73   | >0.7   | ✅     |
| Citation accuracy       | 1.0    | 1.0    | ✅     |
| Wrong-clone citations   | 0/50   | 0      | ✅     |
