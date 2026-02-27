from datetime import date
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends

from src.schemas import MealCreate, BaseAPIResponse
from src.services.meal_service import MealService
from src.auth import get_current_user
from src.utils.responses import respuesta_ok, respuesta_error


router = APIRouter(tags=["Meals"])
service = MealService()


@router.post("/meals/create", response_model=BaseAPIResponse)
def crear_meal(
    body: MealCreate,
    current_user=Depends(get_current_user),
):
    try:
        data = service.crear_meal(body, current_user["id"])
        return respuesta_ok("Comida registrada correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/meals/range", response_model=BaseAPIResponse)
def obtener_meals_rango(
    start_date: date,
    end_date: date,
    current_user=Depends(get_current_user),
):
    try:
        items = service.listar_meals_rango(current_user["id"], start_date, end_date)
        return respuesta_ok(
            "Comidas obtenidas correctamente en el rango",
            {"items": items},
        )
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.delete("/meals/{meal_id}", response_model=BaseAPIResponse)
def eliminar_meal(
    meal_id: int,
    current_user=Depends(get_current_user),
):
    try:
        data = service.eliminar_meal(meal_id, current_user["id"])
        return respuesta_ok("Comida eliminada correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)
