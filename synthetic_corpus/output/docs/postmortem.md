---
id: doc-postmortem
title: "Postmortem — Wrong Citation Incident"
author: angelina
created: 2026-02-11
updated: 2026-02-11
status: final
references: {"decisions": ["dec-010", "dec-012", "dec-013"]}
---

# Postmortem: Wrong Citation Incident

**Date:** Day 9 | **Severity:** Critical | **Author:** Angelina Quan

## Summary
Marcus's clone cited a Slack message from Sarah Kim as its own knowledge.
The clone presented another person's opinion as if it were Marcus's.

## Timeline
- Day 4: Videet adds WHERE clone_id to `searchChunks()`. Does NOT add it to `searchFacts()`.
- Day 8: Angelina runs eval suite. Discovers 3/50 queries return wrong-clone facts.
- Day 8: Bug filed. Root cause identified within 1 hour.
- Day 9: Fix deployed. Threshold raised. Eval re-run: 0 violations.

## Root Cause
Two retrieval paths in the codebase:
1. `searchChunks(cloneId, query)` — had WHERE clone_id filter ✅
2. `searchFacts(query)` — did NOT have clone_id filter ❌

The `searchFacts` function was added later and the clone_id filter was
not ported from `searchChunks`. Classic copy-paste omission.

## Specific Example
- **Query:** "What do you think about the auth module?" (to Marcus's clone)
- **Retrieved fact:** "The auth module needs a complete rewrite" (fact-0847)
- **Actual source:** Sarah Kim's Slack message in #build, Day 6 (msg-089)
- **Problem:** Marcus has never commented on the auth module.

## Fixes (ref: dec-013)
1. Added `WHERE clone_id = $1` to `searchFacts()`
2. Raised reranker confidence threshold from 0.4 to 0.7
3. Added post-retrieval assertion: all returned memories must match clone_id
4. Added automated test: 50-query clone isolation suite

## Lessons
- Test retrieval isolation early, not after building the whole UI
- Every query path needs the same filters — don't assume code was ported
- The reranker threshold is a critical safety parameter, not a tuning knob
- "Works in testing" ≠ "works correctly" — measure correctness explicitly
