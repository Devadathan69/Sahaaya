# Sahaaya — Flood Response Lab

An explainable AI microproject that simulates how limited response resources could be allocated across a fictional flood-affected area. Sahaaya combines symbolic rules, constraint-based allocation, and graph search, then replans when a road closes.

> **Educational simulation only.** All places and incident values are synthetic. Its scores and constraints are simplified assumptions, not validated emergency procedures. Do not use Sahaaya to direct real-world response.

## Project one-liner

> Sahaaya is an explainable flood-response simulator that combines CSP-based resource allocation, A*/BFS route planning, and rule-based priorities to adapt plans when roads close.

## What you can explore

- **Three scenarios:** Balanced flood, Severe northern flood, and Medical surge.
- **Interactive network map:** See incident zones, roads, shelters, the field clinic, resource assignments, and routes.
- **Linked map and plan:** Select a zone to focus its assigned resources and routes, or select a resource to trace its route.
- **Two allocation strategies:** Compare the CSP optimizer with a greedy priority-first baseline.
- **Search comparisons:** Compare A* with BFS and heuristic-guided CSP search with plain backtracking.
- **Dynamic replanning:** Close and reopen a road to change the network and recalculate assignments and routes.
- **CSV export:** Download the currently selected allocation plan for a report or presentation.
- **Algorithm guide:** View the key ideas and course connections in the dashboard.

Sahaaya uses a local Python API and Next.js dashboard. **No AI model account or API key is required.** Reinforcement learning and simulated annealing are optional future extensions, not part of the current implementation.

## How the system works

```text
Scenario facts and road network
              ↓
Forward-chaining rules rank affected zones
              ↓
CSP assigns feasible response resources
              ↓
A* plans weighted routes (BFS provides a baseline)
              ↓
Road closure changes the environment → replan
```

### Algorithms and syllabus alignment

| Implemented method | Syllabus topic | How Sahaaya uses it |
| --- | --- | --- |
| Forward-chaining production rules | Knowledge representation and inference | Adds explainable priority points for severity, vulnerable residents, injuries, rising water, and exposed population. |
| CSP backtracking | Constraint satisfaction problems | Each resource is a variable; its domain contains reachable, compatible zones plus an idle option. |
| MRV and LCV | CSP heuristics | MRV chooses a resource with fewer legal choices; LCV orders assignments by how little they constrain the remaining domains. |
| Forward checking and branch-and-bound | CSP inference and search | Checks capacity as assignments are made and prunes branches that cannot improve the best plan. |
| Plain CSP backtracking | CSP performance comparison | Runs the same allocation problem without MRV, LCV, or branch-and-bound and compares explored states. |
| A* with a scaled straight-line heuristic | Informed search | Finds a minimum-cost route over the weighted road graph; the heuristic is kept below the edge costs. |
| Breadth-first search | Uninformed search | Finds a route with the fewest road segments and provides a comparison for cost and expanded nodes. |
| Event-driven replanning | Intelligent agents and planning | Rebuilds the reachable road graph and calculates a new plan after a closure or reopening. |

### Simplified agent model

- **Environment:** A small, discrete road network with five affected zones, shelters, a field clinic, and seven response resources.
- **State:** Scenario facts, resource locations, road availability, and current incident priorities.
- **Actions:** Assign an available resource to one compatible zone or leave it idle.
- **Goal:** Maximize an urgency-weighted assignment score while respecting resource eligibility, zone capacity, and route reachability.
- **Constraints:** A resource is assigned at most once; a zone accepts at most two resources; boats serve flooded zones; ambulances serve zones with reported injuries; assigned routes must exist.
- **Agent type:** Model-based and goal-directed. It uses its model of the current environment to search for a feasible, high-scoring plan.

Priorities are teaching scores, not a real-world risk formula. The greedy baseline uses the same resource rules and zone capacity, then fills the highest-priority zones first. These simplified policies are designed for algorithm comparison, not operational use.

## Run locally

### Requirements

- Node.js **20.9 or newer**
- Python **3.10 or newer**
- npm

Next.js currently documents Node.js 20.9 as its minimum version: [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation).

Run the Python API and Next.js dashboard in **two separate terminals** from the project root.

### 1. Install and start the Python API

**Windows PowerShell**

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

**macOS / Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

The API health check is at `http://127.0.0.1:8000/api/health`. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

### 2. Install and start the Next.js dashboard

In a second terminal, from the project root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. The dashboard sends simulation requests through its own `/api/simulate` route to the Python API.

### Configuration

The Python API address defaults to `http://127.0.0.1:8000`. To use a different address, copy `.env.example` to `.env.local` and set:

```env
SAHAAYA_API_URL=http://127.0.0.1:8000
```

Keep `.env.local` and other files containing local secrets out of Git. `.env.example` is safe to commit.

## Use the dashboard

1. Choose a scenario from **Active scenario**.
2. Review the prioritized zones and their contributing facts.
3. Compare **CSP agent** with **Priority-first** in the allocation panel.
4. Select a zone to focus its assignments, or select an assignment to highlight its route on the map.
5. Choose **Simulate road closure** to block the South junction–South fields road and trigger replanning. Reopen it to compare the restored network.
6. Review A*/BFS and CSP search comparisons in the Algorithm Workbench.
7. Choose **Export CSV** to download the allocation strategy currently shown in the plan tabs.

## API reference

The Next.js proxy exposes `POST /api/simulate` to the dashboard. The Python API also provides:

| Method and route | Purpose |
| --- | --- |
| `GET /api/health` | Check that the local Python service is running. |
| `GET /api/scenarios` | List the available simulation scenarios. |
| `POST /api/simulate` | Run a scenario with an optional list of blocked road IDs. |

Example request body:

```json
{
  "scenario_id": "balanced",
  "blocked_roads": ["d|j2"]
}
```

## Project structure

```text
src/app/                         Next.js App Router dashboard
src/app/page.tsx                 Dashboard UI and client interactions
src/app/globals.css              Responsive styling and visual system
src/app/api/simulate/route.ts    Next.js proxy to the Python API
backend/main.py                  FastAPI endpoints
backend/algorithms.py            Rules, CSP, A*, BFS, baseline, and metrics
backend/data.py                  Synthetic map, resource, and scenario data
requirements.txt                 Python API dependencies
package.json                     Next.js dependencies and scripts
```

## Optional extensions

Keep the current implementation as the core microproject. If you have extra time, these additions extend the syllabus coverage:

1. **Simulated annealing:** Compare a local-search allocator with CSP as the number of zones and resources grows.
2. **Q-learning:** Train a small discrete policy and compare its reward and coverage with the greedy and CSP agents. This is a more manageable first RL addition than PPO.
3. **CSP controls:** Toggle MRV, LCV, and forward checking individually to show their effect on explored states.
4. **Scenario controls:** Adjust water severity, injury reports, available resources, or shelter capacity.
5. **Evaluation report:** Export scenario inputs, performance metrics, route comparisons, and search counts along with assignments.
6. **Fairness analysis:** Show how different priority weights change which communities receive resources, and discuss those assumptions.
