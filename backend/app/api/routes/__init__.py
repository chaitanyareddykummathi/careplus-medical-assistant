from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.appointments import router as appointments_router
from app.api.routes.health import router as health_router
from app.api.routes.hospitals import router as hospitals_router
from app.api.routes.metrics import router as metrics_router
from app.api.routes.nlp import router as nlp_router
from app.api.routes.user_health_profile import router as user_health_profile_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(hospitals_router)
api_router.include_router(appointments_router)
api_router.include_router(nlp_router)
api_router.include_router(user_health_profile_router)
api_router.include_router(metrics_router)
