"""FastAPI endpoints used by the Next.js dashboard."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .algorithms import simulate
from .data import SCENARIOS

app = FastAPI(title="Sahaaya Simulation API", version="1.0.0")


class SimulationRequest(BaseModel):
    scenario_id: str = Field(default="balanced", pattern="^(balanced|north|medical)$")
    blocked_roads: list[str] = Field(default_factory=list)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "sahaaya-python-api"}


@app.get("/api/scenarios")
def scenarios() -> list[dict[str, str]]:
    return [{"id": key, "label": value["label"], "description": value["description"]} for key, value in SCENARIOS.items()]


@app.post("/api/simulate")
def run_simulation(request: SimulationRequest) -> dict:
    try:
        return simulate(request.scenario_id, request.blocked_roads)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
