from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends

from src.schemas import SettingsCreate, SettingsUpdate, BaseAPIResponse
from src.services.user_settings_service import UserSettingsService
from src.auth import get_current_user
from src.utils.responses import respuesta_ok, respuesta_error

router = APIRouter(tags=["UserSettings"])
service = UserSettingsService()


@router.post("/settings/create", response_model=BaseAPIResponse)
def crear_settings(
    body: SettingsCreate,
    current_user=Depends(get_current_user),
):
    try:
        data = service.crear_settings(current_user["id"], body)
        return respuesta_ok("Configuración creada correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/settings/me", response_model=BaseAPIResponse)
def obtener_mis_settings(current_user=Depends(get_current_user)):
    try:
        data = service.obtener_settings(current_user["id"])
        return respuesta_ok("Configuración obtenida correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.put("/settings/update", response_model=BaseAPIResponse)
def actualizar_settings(
    body: SettingsUpdate,
    current_user=Depends(get_current_user),
):
    try:
        data = service.actualizar_settings(current_user["id"], body)
        return respuesta_ok("Configuración actualizada correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)

