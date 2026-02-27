from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends

from src.schemas import FoodCreate, FoodUpdate, BaseAPIResponse
from src.services.food_service import FoodService
from src.auth import get_current_user
from src.utils.responses import respuesta_ok, respuesta_error


router = APIRouter(tags=["Food"])
service = FoodService()


@router.post("/foods/create", response_model=BaseAPIResponse)
def crear_food(
    body: FoodCreate,
    current_user=Depends(get_current_user),
):
    try:
        data = service.crear_food(body, current_user["id"])
        return respuesta_ok("Alimento creado correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/foods/all", response_model=BaseAPIResponse)
def listar_foods(
    current_user=Depends(get_current_user),
):
    try:
        data = service.listar_foods(current_user["id"])
        return respuesta_ok("Alimentos obtenidos correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/foods/search", response_model=BaseAPIResponse)
def buscar_foods_por_nombre(
    name: str,
    current_user=Depends(get_current_user),
):
    try:
        data = service.buscar_food_por_nombre(name, current_user["id"])
        return respuesta_ok("Alimentos encontrados correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/foods/{food_id}", response_model=BaseAPIResponse)
def obtener_food(
    food_id: int,
    current_user=Depends(get_current_user),
):
    try:
        data = service.obtener_food_por_id(food_id)
        return respuesta_ok("Alimento obtenido correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.get("/foods/barcode/{barcode}", response_model=BaseAPIResponse)
def obtener_food_por_barcode(
    barcode: str,
    current_user=Depends(get_current_user),
):
    try:
        data = service.buscar_o_crear_por_barcode(barcode)
        return respuesta_ok("Alimento obtenido correctamente por código de barras", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.put("/foods/{food_id}", response_model=BaseAPIResponse)
def actualizar_food(
    food_id: int,
    body: FoodUpdate,
    current_user=Depends(get_current_user),
):
    try:
        data = service.actualizar_food(food_id, body, current_user["id"])
        return respuesta_ok("Alimento actualizado correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)


@router.delete("/foods/{food_id}", response_model=BaseAPIResponse)
def eliminar_food(
    food_id: int,
    current_user=Depends(get_current_user),
):
    try:
        data = service.eliminar_food(food_id, current_user["id"])
        return respuesta_ok("Alimento eliminado correctamente", data)
    except HTTPException as e:
        return respuesta_error(e.detail, e.status_code)

