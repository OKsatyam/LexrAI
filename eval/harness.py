"""
LexrAI Eval Harness

Run: python eval/harness.py --phase 1

Phase 1: Hit@k, MRR, naive vs code-aware chunking comparison.
Assumes repos are already ingested (Chroma collections exist).
Gold set lives in eval/gold_set/*.json
Results written to eval/results/phase{N}_results.json
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.ingestion.chunker import chunk_documents, chunk_documents_naive
from app.ingestion.indexer import get_embeddings, get_vectorstore, index_documents
from app.ingestion.loader import load_repo


GOLD_DIR = Path(__file__).parent / "gold_set"
RESULTS_DIR = Path(__file__).parent / "results"
K_VALUES = [1, 3, 5]


def load_gold_sets() -> list[dict]:
    sets = []
    for f in GOLD_DIR.glob("*.json"):
        sets.append(json.loads(f.read_text()))
    return sets


def compute_hit_at_k(retrieved_files: list[str], relevant: list[str], k: int) -> float:
    top_k = retrieved_files[:k]
    return 1.0 if any(r in top_k for r in relevant) else 0.0


def compute_mrr(retrieved_files: list[str], relevant: list[str]) -> float:
    for rank, f in enumerate(retrieved_files, start=1):
        if f in relevant:
            return 1.0 / rank
    return 0.0


def run_retrieval_eval(repo_id: str, pairs: list[dict], collection_suffix: str = "") -> dict:
    collection = f"repo_{repo_id}{collection_suffix}"
    store = get_vectorstore(repo_id) if not collection_suffix else __import__(
        "langchain_chroma", fromlist=["Chroma"]
    ).Chroma(
        collection_name=collection,
        embedding_function=get_embeddings(),
        persist_directory=str(
            Path(__file__).parent.parent / "backend" / "storage" / "chroma"
        ),
    )
    retriever = store.as_retriever(search_kwargs={"k": max(K_VALUES)})

    hit_scores = {k: [] for k in K_VALUES}
    mrr_scores = []

    for pair in pairs:
        docs = retriever.invoke(pair["question"])
        retrieved_files = [d.metadata.get("source", "") for d in docs]
        relevant = pair["relevant_files"]

        for k in K_VALUES:
            hit_scores[k].append(compute_hit_at_k(retrieved_files, relevant, k))
        mrr_scores.append(compute_mrr(retrieved_files, relevant))

    return {
        **{f"hit@{k}": round(sum(v) / len(v), 4) for k, v in hit_scores.items()},
        "mrr": round(sum(mrr_scores) / len(mrr_scores), 4),
    }


def run_phase_1():
    gold_sets = load_gold_sets()
    if not gold_sets:
        print("No gold sets found in eval/gold_set/. Add *.json files first.")
        return

    all_results = []
    for gs in gold_sets:
        repo_id = gs["repo_id"]
        pairs = gs["pairs"]
        print(f"\nEvaluating repo: {repo_id} ({len(pairs)} pairs)")

        print("  Running code-aware retrieval...")
        code_aware = run_retrieval_eval(repo_id, pairs)

        print("  Building naive index...")
        docs = load_repo.__wrapped__(repo_id, gs.get("github_url", "")) if hasattr(
            load_repo, "__wrapped__"
        ) else []
        if docs:
            naive_chunks = chunk_documents_naive(docs)
            index_documents(repo_id + "_naive", naive_chunks)
            naive = run_retrieval_eval(repo_id, pairs, collection_suffix="_naive")
        else:
            naive = {"note": "skipped — repo docs not available for naive baseline"}

        result = {
            "repo_id": repo_id,
            "n_pairs": len(pairs),
            "code_aware": code_aware,
            "naive": naive,
        }
        all_results.append(result)
        print(f"  code-aware: {code_aware}")
        print(f"  naive:      {naive}")

    RESULTS_DIR.mkdir(exist_ok=True)
    out = RESULTS_DIR / "phase1_results.json"
    out.write_text(json.dumps(all_results, indent=2))
    print(f"\nResults saved to {out}")


def main():
    parser = argparse.ArgumentParser(description="LexrAI Eval Harness")
    parser.add_argument("--phase", type=int, required=True, choices=[1, 2, 3])
    args = parser.parse_args()

    if args.phase == 1:
        run_phase_1()
    else:
        print(f"Phase {args.phase} harness not yet implemented.")


if __name__ == "__main__":
    main()
