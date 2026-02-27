from typing import Any, Dict, Optional

from fastapi.responses import JSONResponse


def respuesta_ok(message: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {"message": message, "success": True, "data": data}


def respuesta_error(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"message": message, "success": False, "data": None},
    )

