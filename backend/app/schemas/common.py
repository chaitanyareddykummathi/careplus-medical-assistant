from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class WorkerHealthResponse(BaseModel):
    status: str
    service: str
    workers_available: int
    broker_connected: bool
