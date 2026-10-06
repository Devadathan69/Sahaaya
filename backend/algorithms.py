"""Explainable search, CSP, and rule-inference algorithms for Sahaaya."""

from __future__ import annotations

import heapq
import math
from collections import deque
from typing import Any

from .data import NODE_LAYOUT, ROAD_EDGES, RESOURCES, SCENARIOS, SEVERITY_POINTS

ZONE_CAPACITY = 2


def edge_key(a: str, b: str) -> str:
    return "|".join(sorted((a, b)))


def build_graph(blocked_roads: set[str]) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    graph = {node_id: [] for node_id in NODE_LAYOUT}
    roads = []
    for road in ROAD_EDGES:
        key = edge_key(road["a"], road["b"])
        blocked = key in blocked_roads
        roads.append({**road, "key": key, "blocked": blocked})
        if not blocked:
            graph[road["a"]].append({"node": road["b"], "cost": road["cost"]})
            graph[road["b"]].append({"node": road["a"], "cost": road["cost"]})
    return graph, roads


def heuristic(start: str, goal: str) -> float:
    a, b = NODE_LAYOUT[start], NODE_LAYOUT[goal]
    # This conservative scale stays below every road cost / geometric distance ratio.
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"]) * 0.055


def a_star(graph: dict[str, list[dict[str, Any]]], start: str, goal: str) -> dict[str, Any]:
    frontier: list[tuple[float, float, str]] = [(heuristic(start, goal), 0.0, start)]
    came_from: dict[str, str | None] = {start: None}
    best_cost = {start: 0.0}
    expanded = 0
    while frontier:
        _, cost_so_far, current = heapq.heappop(frontier)
        if cost_so_far > best_cost.get(current, math.inf):
            continue
        if current == goal:
            path = _reconstruct(came_from, goal)
            return {"path": path, "cost": cost_so_far, "hops": len(path) - 1, "expanded": expanded}
        expanded += 1
        for edge in graph[current]:
            next_cost = cost_so_far + edge["cost"]
            if next_cost < best_cost.get(edge["node"], math.inf):
                best_cost[edge["node"]] = next_cost
                came_from[edge["node"]] = current
                heapq.heappush(frontier, (next_cost + heuristic(edge["node"], goal), next_cost, edge["node"]))
    return {"path": [], "cost": math.inf, "hops": 0, "expanded": expanded}


def _reconstruct(came_from: dict[str, str | None], current: str) -> list[str]:
    path = [current]
    while came_from[current] is not None:
        current = came_from[current]  # type: ignore[assignment]
        path.append(current)
    return list(reversed(path))


def breadth_first_search(graph: dict[str, list[dict[str, Any]]], start: str, goal: str) -> dict[str, Any]:
    queue = deque([start])
    parent: dict[str, str | None] = {start: None}
    expanded = 0
    while queue:
        current = queue.popleft()
        if current == goal:
            path = _reconstruct(parent, goal)
            cost = sum(_edge_cost(graph, path[i - 1], path[i]) for i in range(1, len(path)))
            return {"path": path, "cost": cost, "hops": len(path) - 1, "expanded": expanded}
        expanded += 1
        for edge in graph[current]:
            if edge["node"] not in parent:
                parent[edge["node"]] = current
                queue.append(edge["node"])
    return {"path": [], "cost": math.inf, "hops": 0, "expanded": expanded}


def _edge_cost(graph: dict[str, list[dict[str, Any]]], start: str, end: str) -> float:
    return next(edge["cost"] for edge in graph[start] if edge["node"] == end)


def infer_priorities(zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = []
    for source in zones:
        zone = dict(source)
        score = SEVERITY_POINTS[zone["severity"]]
        reasons = [f"{zone['severity'].title()} flood risk"]
        if zone["vulnerable"] >= 70:
            score += 15
            reasons.append("Many vulnerable residents")
        elif zone["vulnerable"] >= 40:
            score += 9
            reasons.append("Vulnerable residents present")
        if zone["injuries"] >= 50:
            score += 17
            reasons.append("Medical surge")
        elif zone["injuries"] >= 25:
            score += 11
            reasons.append("High injury count")
        elif zone["injuries"] >= 15:
            score += 6
            reasons.append("Injuries reported")
        if zone["rising"]:
            score += 10
            reasons.append("Water level rising")
        if zone["population"] >= 500:
            score += 6
            reasons.append("Large population exposed")
        zone["priority"] = min(score, 100)
        zone["reasons"] = reasons
        ranked.append(zone)
    return sorted(ranked, key=lambda zone: zone["priority"], reverse=True)


def _compatible(resource: dict[str, Any], zone: dict[str, Any]) -> bool:
    if resource["type"] == "boat":
        return zone["flooded"]
    if resource["type"] == "ambulance":
        return zone["injuries"] > 0
    return True


def _value(resource: dict[str, Any], zone: dict[str, Any], route_cost: float) -> float:
    fit = 1.14 if resource["type"] == "boat" and zone["severity"] == "critical" else 1.04 if resource["type"] == "boat" else 1.22 if resource["type"] == "ambulance" and zone["injuries"] >= 40 else 1.04 if resource["type"] == "ambulance" else 1.0
    return max(0.0, zone["priority"] * fit - route_cost * 0.72)


def solve_csp(resources: list[dict[str, Any]], zones: list[dict[str, Any]], graph: dict[str, list[dict[str, Any]]], use_heuristics: bool = True) -> dict[str, Any]:
    """Maximize assignment value; optionally compare plain backtracking to MRV/LCV."""
    zone_by_id = {zone["id"]: zone for zone in zones}
    resource_by_id = {resource["id"]: resource for resource in resources}
    routes: dict[tuple[str, str], dict[str, Any]] = {}
    domains: dict[str, list[dict[str, Any]]] = {}
    for resource in resources:
        values = []
        for zone in zones:
            if not _compatible(resource, zone):
                continue
            route = a_star(graph, resource["start"], zone["node"])
            if route["path"]:
                routes[(resource["id"], zone["id"])] = route
                values.append({"zone_id": zone["id"], "value": _value(resource, zone, route["cost"])})
        values.append({"zone_id": None, "value": 0.0})
        domains[resource["id"]] = values

    occupancy = {zone["id"]: 0 for zone in zones}
    chosen: dict[str, dict[str, Any]] = {}
    best: dict[str, dict[str, Any]] = {}
    best_score = -1.0
    states = 0
    bound_prunes = 0
    forward_prunes = 0

    def legal_domain(resource_id: str) -> list[dict[str, Any]]:
        return [choice for choice in domains[resource_id] if choice["zone_id"] is None or occupancy[choice["zone_id"]] < ZONE_CAPACITY]

    def search(unassigned: list[str], score: float) -> None:
        nonlocal best_score, best, states, bound_prunes, forward_prunes
        states += 1
        if not unassigned:
            if score > best_score:
                best_score, best = score, dict(chosen)
            return

        available = {resource_id: legal_domain(resource_id) for resource_id in unassigned}
        if use_heuristics:
            upper_bound = score + sum(max(choice["value"] for choice in values) for values in available.values())
            if upper_bound <= best_score:
                bound_prunes += 1
                return

        # MRV selects the unassigned resource with the fewest remaining choices.
        variable = min(unassigned, key=lambda resource_id: (len(available[resource_id]), resource_id)) if use_heuristics else unassigned[0]
        others = [resource_id for resource_id in unassigned if resource_id != variable]

        def lcv_key(choice: dict[str, Any]) -> tuple[int, float]:
            zone_id = choice["zone_id"]
            eliminated = 0 if zone_id is None or occupancy[zone_id] + 1 < ZONE_CAPACITY else sum(
                1 for other_id in others if any(option["zone_id"] == zone_id for option in legal_domain(other_id))
            )
            return eliminated, -choice["value"]

        # LCV first reduces how many choices this assignment removes for others.
        ordered_choices = sorted(available[variable], key=lcv_key) if use_heuristics else available[variable]
        for choice in ordered_choices:
            zone_id = choice["zone_id"]
            if zone_id is not None and occupancy[zone_id] >= ZONE_CAPACITY:
                continue
            chosen[variable] = choice
            if zone_id is not None:
                occupancy[zone_id] += 1

            next_unassigned = [resource_id for resource_id in unassigned if resource_id != variable]
            next_domains = {resource_id: legal_domain(resource_id) for resource_id in next_unassigned}
            # Forward checking detects domain wipeouts and counts choices removed by a full zone.
            wiped_out = any(not values for values in next_domains.values())
            if wiped_out:
                forward_prunes += 1
            else:
                before = sum(len(available[resource_id]) for resource_id in next_unassigned)
                after = sum(len(values) for values in next_domains.values())
                forward_prunes += int(after < before)
                search(next_unassigned, score + choice["value"])

            if zone_id is not None:
                occupancy[zone_id] -= 1
            del chosen[variable]

    search([resource["id"] for resource in resources], 0.0)
    assignments = []
    for resource_id, choice in best.items():
        zone_id = choice["zone_id"]
        if zone_id is None:
            continue
        resource, zone = resource_by_id[resource_id], zone_by_id[zone_id]
        assignments.append(_assignment(resource, zone, routes[(resource_id, zone_id)], choice["value"]))
    assignments.sort(key=lambda item: (-item["priority"], item["resource_label"]))
    return {"assignments": assignments, "score": best_score, "states": states, "bound_prunes": bound_prunes,
            "forward_prunes": forward_prunes, "zone_capacity": ZONE_CAPACITY}


def greedy_priority_baseline(resources: list[dict[str, Any]], zones: list[dict[str, Any]], graph: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Greedy comparison: fill the highest-priority zone first with its best available unit."""
    remaining = {resource["id"] for resource in resources}
    by_id = {resource["id"]: resource for resource in resources}
    assignments = []
    score = 0.0
    for zone in zones:
        assigned_here = 0
        while assigned_here < ZONE_CAPACITY:
            candidates = []
            for resource_id in remaining:
                resource = by_id[resource_id]
                if not _compatible(resource, zone):
                    continue
                route = a_star(graph, resource["start"], zone["node"])
                if route["path"]:
                    candidates.append((
                        _value(resource, zone, route["cost"]), resource_id, resource, route
                    ))
            if not candidates:
                break
            value, resource_id, resource, route = max(candidates, key=lambda item: (item[0], item[1]))
            remaining.remove(resource_id)
            assignments.append(_assignment(resource, zone, route, value))
            score += value
            assigned_here += 1
    return {"assignments": assignments, "score": score}


def _assignment(resource: dict[str, Any], zone: dict[str, Any], route: dict[str, Any], value: float) -> dict[str, Any]:
    return {
        "resource_id": resource["id"], "resource_label": resource["label"], "resource_type": resource["type"],
        "resource_start": resource["start"], "zone_id": zone["id"], "zone_name": zone["name"],
        "zone_node": zone["node"], "priority": zone["priority"], "route": route["path"],
        "route_cost": route["cost"], "route_hops": route["hops"], "route_expanded": route["expanded"],
        "value": value,
    }


def simulate(scenario_id: str, blocked_roads: list[str] | None = None) -> dict[str, Any]:
    if scenario_id not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_id}")
    blocked = set(blocked_roads or [])
    known_edges = {"|".join(sorted((road["a"], road["b"]))) for road in ROAD_EDGES}
    if not blocked.issubset(known_edges):
        raise ValueError("One or more blocked road identifiers are not part of this map.")

    graph, roads = build_graph(blocked)
    scenario = SCENARIOS[scenario_id]
    zones = infer_priorities(scenario["zones"])
    resources = [dict(resource) for resource in RESOURCES]
    plan = solve_csp(resources, zones, graph)
    plain_csp = solve_csp(resources, zones, graph, use_heuristics=False)
    baseline = greedy_priority_baseline(resources, zones, graph)

    route_rows = []
    total_astar_nodes = 0
    total_bfs_nodes = 0
    bfs_cost_total = 0.0
    for assignment in plan["assignments"]:
        bfs = breadth_first_search(graph, assignment["resource_start"], assignment["zone_node"])
        total_astar_nodes += assignment["route_expanded"]
        total_bfs_nodes += bfs["expanded"]
        bfs_cost_total += bfs["cost"]
        route_rows.append({
            "assignment_id": assignment["resource_id"], "resource_label": assignment["resource_label"],
            "zone_name": assignment["zone_name"], "astar_cost": assignment["route_cost"],
            "astar_hops": assignment["route_hops"], "astar_expanded": assignment["route_expanded"],
            "bfs_cost": bfs["cost"], "bfs_hops": bfs["hops"], "bfs_expanded": bfs["expanded"],
        })

    served_zone_ids = {item["zone_id"] for item in plan["assignments"]}
    baseline_zone_ids = {item["zone_id"] for item in baseline["assignments"]}
    priority_total = sum(zone["priority"] for zone in zones)
    served_priority = sum(zone["priority"] for zone in zones if zone["id"] in served_zone_ids)
    baseline_priority = sum(zone["priority"] for zone in zones if zone["id"] in baseline_zone_ids)
    zone_counts = {zone["id"]: sum(item["zone_id"] == zone["id"] for item in plan["assignments"]) for zone in zones}
    zones = [{**zone, "assigned_count": zone_counts[zone["id"]]} for zone in zones]

    return {
        "scenario_id": scenario_id, "scenario_label": scenario["label"], "scenario_description": scenario["description"],
        "blocked_roads": sorted(blocked), "nodes": NODE_LAYOUT, "roads": roads, "zones": zones, "resources": resources,
        "assignments": plan["assignments"], "baseline_assignments": baseline["assignments"],
        "metrics": {
            "assigned_count": len(plan["assignments"]), "total_resources": len(resources),
            "coverage_percent": round(served_priority / priority_total * 100) if priority_total else 0,
            "baseline_coverage_percent": round(baseline_priority / priority_total * 100) if priority_total else 0,
            "route_cost": round(sum(item["route_cost"] for item in plan["assignments"]), 1),
            "baseline_score": round(baseline["score"], 1), "csp_score": round(plan["score"], 1),
            "states": plan["states"], "plain_csp_states": plain_csp["states"],
            "bound_prunes": plan["bound_prunes"], "forward_prunes": plan["forward_prunes"],
            "closure_count": len(blocked),
        },
        "algorithm_trace": {
            "rules_fired": sum(len(zone["reasons"]) for zone in zones), "route_rows": route_rows,
            "astar_expanded": total_astar_nodes, "bfs_expanded": total_bfs_nodes,
            "astar_cost": round(sum(row["astar_cost"] for row in route_rows), 1),
            "bfs_cost": round(bfs_cost_total, 1), "astar_routes_no_more_costly": sum(row["astar_cost"] <= row["bfs_cost"] for row in route_rows),
        },
    }
