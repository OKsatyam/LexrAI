import time
from dataclasses import asdict
from pathlib import Path
from typing import TypedDict

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import END, StateGraph

from app.analysis.tools import Finding, run_bandit, run_radon, run_ruff
from app.core.config import settings
from app.core.llm import get_llm
from app.pillars.improve import generate_improve

_DECIDE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a code quality analysis agent. Select the next static analysis tool "
        "to run, or declare analysis complete. Respond with valid JSON only.",
    ),
    (
        "human",
        "Tools available: {tools_available}\n"
        "Tools already run: {tools_run}\n"
        "Findings so far: {n_findings} issues found\n\n"
        "Which tool should run next? Or respond 'done' if analysis is complete.\n\n"
        'Respond with JSON only: {{"next_tool": "<tool_name_or_done>"}}',
    ),
])

_decide_chain = _DECIDE_PROMPT | get_llm() | JsonOutputParser()

_ALL_TOOLS = ["ruff", "bandit", "radon"]


class AgentState(TypedDict):
    repo_id: str
    repo_path: str
    findings: list[dict]
    tools_run: list[str]
    iterations: int
    done: bool
    next_tool: str
    final_findings: list[dict]


def decide_node(state: AgentState) -> dict:
    time.sleep(2)  # rate-limit guard: 2s between LLM calls
    tools_available = [t for t in _ALL_TOOLS if t not in state["tools_run"]]
    result = _decide_chain.invoke({
        "tools_available": tools_available or ["none"],
        "tools_run": state["tools_run"],
        "n_findings": len(state["findings"]),
    })
    next_tool = result.get("next_tool", "done")
    done = next_tool == "done" or next_tool not in tools_available
    return {
        "next_tool": next_tool if not done else "done",
        "done": done,
        "iterations": state["iterations"] + 1,
    }


def _tool_result(state: AgentState, findings: list[Finding], tool_name: str) -> dict:
    return {
        "findings": state["findings"] + [asdict(f) for f in findings],
        "tools_run": state["tools_run"] + [tool_name],
    }


def ruff_node(state: AgentState) -> dict:
    return _tool_result(state, run_ruff(Path(state["repo_path"])), "ruff")


def bandit_node(state: AgentState) -> dict:
    return _tool_result(state, run_bandit(Path(state["repo_path"])), "bandit")


def radon_node(state: AgentState) -> dict:
    return _tool_result(state, run_radon(Path(state["repo_path"])), "radon")


def explain_node(state: AgentState) -> dict:
    findings_obj = [Finding(**f) for f in state["findings"][:20]]
    explained = generate_improve(findings_obj)
    return {"final_findings": explained}


def _route_from_decide(state: AgentState) -> str:
    if state["done"] or state["iterations"] >= settings.improve_max_iterations:
        return "explain"
    tool = state["next_tool"]
    return tool if tool in _ALL_TOOLS else "explain"


def _build_graph() -> StateGraph:
    builder = StateGraph(AgentState)
    builder.add_node("decide", decide_node)
    builder.add_node("ruff", ruff_node)
    builder.add_node("bandit", bandit_node)
    builder.add_node("radon", radon_node)
    builder.add_node("explain", explain_node)
    builder.set_entry_point("decide")
    builder.add_conditional_edges(
        "decide",
        _route_from_decide,
        {"ruff": "ruff", "bandit": "bandit", "radon": "radon", "explain": "explain"},
    )
    for tool in _ALL_TOOLS:
        builder.add_edge(tool, "decide")
    builder.add_edge("explain", END)
    return builder.compile()


_graph = _build_graph()


def run_improve_agent(repo_id: str) -> list[dict]:
    repo_path = str(settings.repos_dir / repo_id)
    initial: AgentState = {
        "repo_id": repo_id,
        "repo_path": repo_path,
        "findings": [],
        "tools_run": [],
        "iterations": 0,
        "done": False,
        "next_tool": "",
        "final_findings": [],
    }
    final_state = _graph.invoke(initial)
    return final_state["final_findings"]
