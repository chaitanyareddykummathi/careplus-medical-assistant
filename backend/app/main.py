from fastapi import FastAPI, Request

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.observability import traced_span
from app.db.init_db import init_db
from app.middleware.rate_limit import RateLimitMiddleware
from fastapi.middleware.cors import CORSMiddleware

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

from app.api.routes.chat import router as chat_router

register_exception_handlers(app)
app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(chat_router, prefix="/api")


@app.middleware('http')
async def tracing_middleware(request: Request, call_next):
    with traced_span(
        'http.request',
        {
            'http.method': request.method,
            'http.route': request.url.path,
        },
    ) as span:
        response = await call_next(request)
        if span is not None:
            span.set_attribute('http.status_code', response.status_code)
        return response


@app.on_event('startup')
def on_startup() -> None:
    init_db()


@app.get('/')
def root() -> dict[str, str]:
    return {'message': f"{settings.app_name} API is running"}
