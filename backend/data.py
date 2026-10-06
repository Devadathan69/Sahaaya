"""Synthetic flood-response world data for the Sahaaya classroom project."""

NODE_LAYOUT = {
    "base": {"x": 18, "y": 50, "label": "Response base", "kind": "base"},
    "j1": {"x": 62, "y": 27, "label": "North junction", "kind": "junction"},
    "j2": {"x": 62, "y": 75, "label": "South junction", "kind": "junction"},
    "j3": {"x": 114, "y": 50, "label": "Central junction", "kind": "junction"},
    "a": {"x": 97, "y": 12, "label": "Northbank", "kind": "zone"},
    "b": {"x": 158, "y": 16, "label": "Riverside", "kind": "zone"},
    "c": {"x": 161, "y": 48, "label": "Market ward", "kind": "zone"},
    "d": {"x": 106, "y": 82, "label": "South fields", "kind": "zone"},
    "e": {"x": 174, "y": 81, "label": "East colony", "kind": "zone"},
    "shelter1": {"x": 198, "y": 27, "label": "Shelter 1", "kind": "shelter"},
    "shelter2": {"x": 194, "y": 92, "label": "Shelter 2", "kind": "shelter"},
    "hospital": {"x": 139, "y": 69, "label": "Field clinic", "kind": "hospital"},
}

ROAD_EDGES = [
    {"a": "base", "b": "j1", "cost": 12}, {"a": "base", "b": "j2", "cost": 14},
    {"a": "j1", "b": "j3", "cost": 14}, {"a": "j2", "b": "j3", "cost": 15},
    {"a": "j1", "b": "a", "cost": 9}, {"a": "a", "b": "b", "cost": 13},
    {"a": "b", "b": "j3", "cost": 13}, {"a": "j3", "b": "c", "cost": 10},
    {"a": "j2", "b": "c", "cost": 20}, {"a": "j2", "b": "d", "cost": 9},
    {"a": "d", "b": "e", "cost": 15}, {"a": "e", "b": "shelter2", "cost": 8},
    {"a": "b", "b": "shelter1", "cost": 9}, {"a": "j3", "b": "hospital", "cost": 9},
    {"a": "c", "b": "hospital", "cost": 8}, {"a": "c", "b": "e", "cost": 22},
]

RESOURCES = [
    {"id": "boat-1", "type": "boat", "label": "Rescue boat 1", "icon": "boat", "start": "base"},
    {"id": "boat-2", "type": "boat", "label": "Rescue boat 2", "icon": "boat", "start": "j2"},
    {"id": "team-1", "type": "team", "label": "Rescue team 1", "icon": "team", "start": "base"},
    {"id": "team-2", "type": "team", "label": "Rescue team 2", "icon": "team", "start": "j1"},
    {"id": "team-3", "type": "team", "label": "Rescue team 3", "icon": "team", "start": "j2"},
    {"id": "ambulance-1", "type": "ambulance", "label": "Ambulance 1", "icon": "ambulance", "start": "base"},
    {"id": "ambulance-2", "type": "ambulance", "label": "Ambulance 2", "icon": "ambulance", "start": "j3"},
]

SCENARIOS = {
    "balanced": {
        "label": "Balanced flood",
        "description": "A shifting flood with pressure across the full response area.",
        "zones": [
            {"id": "a", "name": "Northbank", "node": "a", "severity": "critical", "population": 420, "vulnerable": 90, "injuries": 26, "rising": True, "flooded": True},
            {"id": "b", "name": "Riverside", "node": "b", "severity": "high", "population": 260, "vulnerable": 45, "injuries": 17, "rising": False, "flooded": True},
            {"id": "c", "name": "Market ward", "node": "c", "severity": "moderate", "population": 510, "vulnerable": 60, "injuries": 12, "rising": False, "flooded": True},
            {"id": "d", "name": "South fields", "node": "d", "severity": "high", "population": 340, "vulnerable": 76, "injuries": 20, "rising": True, "flooded": False},
            {"id": "e", "name": "East colony", "node": "e", "severity": "critical", "population": 290, "vulnerable": 82, "injuries": 34, "rising": True, "flooded": True},
        ],
    },
    "north": {
        "label": "Severe northern flood",
        "description": "Rapidly rising water places northern neighborhoods at greatest risk.",
        "zones": [
            {"id": "a", "name": "Northbank", "node": "a", "severity": "critical", "population": 650, "vulnerable": 145, "injuries": 46, "rising": True, "flooded": True},
            {"id": "b", "name": "Riverside", "node": "b", "severity": "critical", "population": 460, "vulnerable": 112, "injuries": 37, "rising": True, "flooded": True},
            {"id": "c", "name": "Market ward", "node": "c", "severity": "high", "population": 510, "vulnerable": 60, "injuries": 19, "rising": False, "flooded": True},
            {"id": "d", "name": "South fields", "node": "d", "severity": "moderate", "population": 340, "vulnerable": 76, "injuries": 11, "rising": False, "flooded": False},
            {"id": "e", "name": "East colony", "node": "e", "severity": "moderate", "population": 290, "vulnerable": 82, "injuries": 13, "rising": False, "flooded": True},
        ],
    },
    "medical": {
        "label": "Medical surge",
        "description": "Injury reports shift the balance toward ambulance deployment.",
        "zones": [
            {"id": "a", "name": "Northbank", "node": "a", "severity": "high", "population": 420, "vulnerable": 90, "injuries": 64, "rising": False, "flooded": True},
            {"id": "b", "name": "Riverside", "node": "b", "severity": "moderate", "population": 260, "vulnerable": 45, "injuries": 58, "rising": False, "flooded": True},
            {"id": "c", "name": "Market ward", "node": "c", "severity": "high", "population": 510, "vulnerable": 60, "injuries": 71, "rising": False, "flooded": True},
            {"id": "d", "name": "South fields", "node": "d", "severity": "moderate", "population": 340, "vulnerable": 76, "injuries": 55, "rising": False, "flooded": False},
            {"id": "e", "name": "East colony", "node": "e", "severity": "high", "population": 290, "vulnerable": 82, "injuries": 83, "rising": True, "flooded": True},
        ],
    },
}

SEVERITY_POINTS = {"low": 12, "moderate": 26, "high": 42, "critical": 55}
