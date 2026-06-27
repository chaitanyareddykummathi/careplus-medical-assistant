import logging
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppException(Exception):
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Any | None = None,
    ) -> None:
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details
        super().__init__(message)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                'success': False,
                'message': exc.message,
                'errors': [
                    {
                        'field': None,
                        'message': exc.message,
                        'code': exc.error_code,
                    }
                ],
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                'success': False,
                'message': 'Request payload is invalid.',
                'errors': [
                    {
                        'field': '.'.join(str(part) for part in error.get('loc', [])),
                        'message': error.get('msg', 'Invalid value.'),
                    }
                    for error in exc.errors()
                ],
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                'success': False,
                'message': str(exc.detail),
                'errors': [
                    {
                        'field': None,
                        'message': str(exc.detail),
                    }
                ],
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception('Unhandled server exception', exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                'message': 'An unexpected error occurred.',
                'errors': [
                    {
                        'field': None,
                        'message': 'An unexpected error occurred.',
                    }
                ],
            },
        )
