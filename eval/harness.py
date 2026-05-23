"""
LexrAI Eval Harness — same harness every phase, produces v1→v2→v3 improvement curve.

Phase 1: Hit@k, MRR, naive vs code-aware chunking comparison
Phase 2: + Understand rubric, Improve precision/recall
Phase 3: + single-shot vs agentic comparison

Run: python eval/harness.py --phase 1
"""

# TODO Phase 1: implement eval harness
# Sections to build:
#   1. load gold_set Q&A pairs
#   2. for each question: retrieve top-k chunks, check if answer file in results
#   3. compute Hit@k and MRR
#   4. run naive chunking baseline, compare against code-aware
#   5. write results to eval/results/phase{N}_results.json


def main():
    raise NotImplementedError("Eval harness — implement in Phase 1")


if __name__ == "__main__":
    main()
