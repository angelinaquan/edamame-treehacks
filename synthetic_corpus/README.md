# Edamame Synthetic Corpus

Deterministic synthetic dataset for training and evaluating 4 AI digital twin clones. Simulates 12 days of a TreeHacks hackathon team building an AI-native memory layer.

## Quick Start

```bash
# Generate corpus (deterministic, seed=42, 12 days)
python generate_corpus.py --out output --seed 42 --days 12

# Validate cross-references, coverage, and consistency
python validate_corpus.py output/
```

## Team

| Person | Role | School | Voice |
|--------|------|--------|-------|
| James Liu | Strategy & Demo Narrative | Stanford | Bold, impatient, narrative-driven. "Judges will eat this up." |
| Angelina Quan | Engineering Lead | MIT | Precise, principled, correctness-first. "Let me push back —" |
| Videet Mehta | Systems & Infrastructure | MIT | Pragmatic, time-boxed, performance-obsessed. "What's the fallback?" |
| Ella Lan | Product & UX | Stanford | User-centric, story-driven, clarity-first. "But what does the judge see?" |

## Output Structure

```
output/
  people.json                           # Persona cards with tells + biases
  slack/
    2026-02-03_general.json             # Slack messages by date + channel
    2026-02-03_build.json
    ...
  docs/
    architecture.md                     # System architecture (Angelina)
    schema.md                           # Database schema (Angelina + Ella)
    retrieval.md                        # Retrieval pipeline (Videet)
    demo_script.md                      # Demo script (Ella)
    eval_plan.md                        # Evaluation metrics (Angelina)
    postmortem.md                       # Wrong-citation incident (Angelina)
  meetings/
    2026-02-03_kickoff_sync.txt         # Speaker-tagged transcripts
    ...
  decisions/
    decisions.json                      # 16 decisions with dissent + rationale
  beliefs/
    beliefs.json                        # 12+ beliefs per person with evidence
```

## Cross-References

All artifacts are interconnected:
- Slack messages reference decision IDs (`dec-001`) and doc IDs (`doc-arch`)
- Docs reference decisions in their body text and frontmatter
- Decisions reference follow-up decisions and docs
- Beliefs cite evidence from messages, decisions, and docs
- The postmortem references specific chunk/fact IDs from the incident

## Topics Covered

1. **MVP scoping** — what to cut vs keep (5 features, not 8)
2. **Memory layer design** — document → chunk → fact → category hierarchy
3. **Retrieval design** — pgvector + reranker pipeline, threshold tuning
4. **GraphRAG debate** — argued, decided against (plain RAG for MVP)
5. **Continual learning** — async fact extraction from chat
6. **Decision rehearsal** — two-round simulation with stance diffs
7. **Hallucination incident** — wrong-clone citation bug + postmortem
8. **Onboarding packets** — auto-generated first-week docs
9. **Demo script planning** — narrative arc, timing, backup plans

## Validation

The validator checks:
- All referenced IDs exist (messages → decisions → docs)
- Timestamps are monotonic per Slack channel
- Each required topic appears in multiple artifacts
- Each person has sufficient messages and beliefs for persona learning
- All author/proposer IDs map to known people
