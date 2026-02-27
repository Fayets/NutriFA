from datetime import date
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends

from src.schemas import BaseAPIResponse
from src.services.dashboard_service import DashboardService
from src.auth import get_current_user
from src.utils.responses import respuesta_ok, respuesta_error


router = APIRouter(tags=["Dashboard"])
service = DashboardService()


@router.get("/dashboard/today", response_model=BaseAPIResponse)
def obtener_dashboard_hoy(
    current_user=Depends(get_current_user),
):
    try:
        today = date.today()
        data = service.obtener_dashboard_del_dia(current_user["id"], today)
        return respuesta_ok("Dashboard del día obtenido correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/dashboard/range", response_model=BaseAPIResponse)
def obtener_dashboard_rango(
    start_date: date,
    end_date: date,
    current_user=Depends(get_current_user),
):
    try:
        data = service.obtener_dashboard_rango(
            current_user["id"],
            start_date,
            end_date,
        )
        return respuesta_ok(
            "Dashboard del rango obtenido correctamente",
            {"items": data},
        )
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)

