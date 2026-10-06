# Sahaaya — Flood Response Lab

Sahaaya is an educational AI microproject for a fictional flood-response network. **The algorithms run in Python; the interactive dashboard is built with Next.js, TypeScript, and React.** A small Next.js route proxies requests to the FastAPI service, so the browser only talks to the dashboard server.

> **Educational simulation only.** Locations and incident data are synthetic. The simplified priorities and constraints are not validated emergency procedures; do not use this prototype for real-world response.

## Run locally

You need Node.js 20.9 or newer and Python 3.10 or newer. Next.js's current installation guide lists Node.js 20.9 as its minimum requirement: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

### 1. Start the Python API

From the project root, in PowerShell:

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

The API health endpoint is `http://127.0.0.1:8000/api/health`; interactive API documentation is at `http://127.0.0.1:8000/docs`.

### 2. Start the Next.js dashboard

In a second terminal at the project root:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The dashboard uses `SAHAAYA_API_URL` for the Python service, defaulting to `http://127.0.0.1:8000`. Copy `.env.example` to `.env.local` if you need a different API address.

## What the dashboard includes

- Three synthetic scenarios: balanced flood, severe northern flood, and medical surge.
- An interactive response-network map with assignments, routes, shelters, clinic, and road closure state.
- An allocation view that switches between the CSP plan and a greedy priority-first baseline.
- Click a zone to focus its assignments and routes, or click a unit to trace its path on the map.
- Zone priorities with the facts that fired each rule.
- A* versus BFS route cost and expanded-node comparisons.
- Plain backtracking versus MRV/LCV CSP search-state comparison.
- A south-road closure control that recomputes the environment, assignments, and routes.
- A one-click CSV export of the active scenario's CSP response plan.
- Responsive layout for desktop and narrow screens, plus an in-app course-algorithm guide.

## Implemented algorithms and course mapping

| Algorithm | Syllabus connection | Demonstration |
| --- | --- | --- |
| Forward-chaining production rules | Knowledge representation and inference | Severity, vulnerable residents, injuries, rising water, and population facts produce transparent zone priorities. |
| CSP backtracking | Constraint satisfaction | Each resource variable chooses a reachable, compatible zone or idle; each zone has two assignment slots. |
| MRV and LCV | CSP heuristics | The optimized solver selects the variable with the fewest remaining choices and orders choices by how little they constrain others. |
| Forward checking and branch-and-bound | CSP inference / search efficiency | The solver respects zone capacity as choices are made and prunes branches that cannot beat the best current score. |
| Plain backtracking comparison | CSP performance evaluation | The dashboard compares explored states for the same CSP without MRV, LCV, or branch-and-bound. |
| A* with scaled straight-line heuristic | Informed search | Finds a low-cost path over weighted roads; the heuristic is conservative relative to edge costs. |
| Breadth-first search | Uninformed search | Provides an edge-count-optimal baseline; the dashboard compares path cost and expanded nodes. |
| Event-driven replanning | Intelligent agents and planning | A changed road graph triggers a new plan from the updated state. |

### Simplified model

- **State:** scenario facts, road graph, blocked roads, resource positions, and current assignments.
- **Actions:** assign each resource to one eligible zone or leave it idle.
- **Objective:** maximize an urgency-weighted response score, with a modest route-cost penalty.
- **Hard constraints:** boats serve flooded zones; ambulances serve zones with injury reports; each resource is used at most once; each zone has at most two resources; routes must exist in the current graph.
- **Agent description:** a model-based, goal-directed agent that uses a symbolic environment model and searches for a high-value feasible plan.

The priority score is a teaching device. It does not represent an approved real-world risk formula. The comparison baseline is a greedy policy that fills the highest-priority zones first using the same eligibility and capacity constraints.

## Good extensions if you have time

Keep these as optional course extensions so the working microproject remains easy to present:

1. **Simulated annealing** — compare a local-search allocator with CSP on larger resource/zone maps.
2. **Q-learning** — define a small discrete state/action environment and compare rewards with the greedy baseline. PPO is a larger stretch goal.
3. **CSP strategy controls** — let the presenter enable or disable MRV, LCV, and forward checking separately and compare search counts.
4. **Scenario controls** — adjust shelter capacity, flood intensity, injuries, and available resources.
5. **Evaluation export** — download a CSV or report with scenario inputs, allocations, route comparisons, and search counts.
6. **Explainability and fairness checks** — show who receives help under different weights and discuss how the chosen assumptions affect outcomes.

## Project structure

```text
src/app/                 Next.js App Router dashboard
src/app/api/simulate/    Next.js proxy route to Python
backend/data.py          Synthetic maps, resources, and incident scenarios
backend/algorithms.py    Rules, CSP, A*, BFS, baseline, and simulation assembly
backend/main.py          FastAPI endpoints
```
