from fastapi import APIRouter, Depends, Response

from app.api.deps.auth import require_roles
from app.core.observability import export_metrics
from app.models.user import User

router = APIRouter(prefix='/metrics', tags=['Observability'])


@router.get('', response_class=Response)
def metrics(_: User = Depends(require_roles('admin'))) -> Response:
    payload, content_type = export_metrics()
    return Response(content=payload, media_type=content_type)
