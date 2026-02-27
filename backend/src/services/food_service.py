from typing import List, Optional

import requests
from pony.orm import db_session, flush
from fastapi import HTTPException, status

from src.models import Usuario, Food
from src.schemas import FoodCreate, FoodUpdate
from src.services.service_utils import get_usuario_or_404


class FoodService:
    @staticmethod
    def _serialize(food: Food) -> dict:
        return {
            "id": food.id,
            "name": food.name,
            "calories_per_100g": food.calories_per_100g,
            "protein_per_100g": food.protein_per_100g,
            "carbs_per_100g": food.carbs_per_100g,
            "fat_per_100g": food.fat_per_100g,
            "barcode": food.barcode,
            "created_by_id": food.created_by.id if food.created_by is not None else None,
            "created_at": food.created_at,
        }

    def _get_usuario_or_404(self, user_id: int) -> Usuario:
        usuario = Usuario.get(id=user_id)
        if usuario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        return usuario

    def crear_food(self, food_data: FoodCreate, user_id: Optional[int]) -> dict:
        with db_session:
            if food_data.barcode:
                existente = Food.get(barcode=food_data.barcode)
                if existente is not None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El código de barras ya está registrado",
                    )

            created_by = None
            if user_id is not None:
                created_by = get_usuario_or_404(user_id)

            food = Food(
                name=food_data.name,
                calories_per_100g=food_data.calories_per_100g,
                protein_per_100g=food_data.protein_per_100g,
                carbs_per_100g=food_data.carbs_per_100g,
                fat_per_100g=food_data.fat_per_100g,
                barcode=food_data.barcode,
                created_by=created_by,
            )
            flush()

            return self._serialize(food)

    def obtener_food_por_id(self, food_id: int) -> dict:
        with db_session:
            food = Food.get(id=food_id)
            if food is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alimento no encontrado",
                )
            return self._serialize(food)

    def buscar_food_por_nombre(self, nombre: str, user_id: int) -> List[dict]:
        with db_session:
            nombre_norm = (nombre or "").strip().lower()
            foods = list(Food.select()[:])

            if nombre_norm:
                foods = [
                    f for f in foods
                    if nombre_norm in f.name.lower()
                ]
            return [self._serialize(f) for f in foods]

    def buscar_food_por_barcode(self, barcode: str) -> dict:
        with db_session:
            food = Food.get(barcode=barcode)
            if food is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alimento no encontrado para ese código de barras",
                )
            return self._serialize(food)

    def buscar_o_crear_por_barcode(self, barcode: str) -> dict:
        barcode = (barcode or "").strip()

        if not barcode.isdigit() or not (8 <= len(barcode) <= 20):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código de barras debe ser numérico y tener una longitud válida",
            )

        with db_session:
            food = Food.get(barcode=barcode)
            if food is not None:
                return self._serialize(food)

        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"

        try:
            response = requests.get(url, timeout=5)
        except requests.RequestException:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error al comunicarse con el servicio externo de alimentos",
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Respuesta inválida del servicio externo de alimentos",
            )

        try:
            payload = response.json()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo interpretar la respuesta del servicio externo de alimentos",
            )

        status_value = payload.get("status")
        if status_value != 1:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alimento no encontrado para ese código de barras en el servicio externo",
            )

        product = payload.get("product") or {}
        name = product.get("product_name")
        nutriments = product.get("nutriments") or {}

        energy_kcal_100g = nutriments.get("energy-kcal_100g")
        proteins_100g = nutriments.get("proteins_100g")
        carbs_100g = nutriments.get("carbohydrates_100g")
        fat_100g = nutriments.get("fat_100g")

        if not name or energy_kcal_100g is None or proteins_100g is None or carbs_100g is None or fat_100g is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Datos nutricionales incompletos en el servicio externo de alimentos",
            )

        try:
            calories = float(energy_kcal_100g)
            protein = float(proteins_100g)
            carbs = float(carbs_100g)
            fat = float(fat_100g)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Datos nutricionales inválidos en el servicio externo de alimentos",
            )

        with db_session:
            existing = Food.get(barcode=barcode)
            if existing is not None:
                return self._serialize(existing)

            food = Food(
                name=name,
                calories_per_100g=calories,
                protein_per_100g=protein,
                carbs_per_100g=carbs,
                fat_per_100g=fat,
                barcode=barcode,
                created_by=None,
            )
            flush()

            return self._serialize(food)

    def listar_foods(self, user_id: int) -> List[dict]:
        with db_session:
            foods = list(Food.select()[:])
            return [self._serialize(f) for f in foods]

    def actualizar_food(self, food_id: int, data: FoodUpdate, user_id: int) -> dict:
        with db_session:
            food = Food.get(id=food_id)
            if food is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alimento no encontrado",
                )

            # Permitir modificar:
            # - Alimentos creados por el propio usuario
            # - Alimentos sin creador (por ejemplo, importados de servicios externos)
            if food.created_by is not None and food.created_by.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo puedes modificar alimentos creados por ti",
                )

            if data.barcode is not None and data.barcode != food.barcode:
                existente = Food.get(barcode=data.barcode)
                if existente is not None and existente.id != food.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El código de barras ya está registrado",
                    )
                food.barcode = data.barcode

            if data.name is not None:
                food.name = data.name
            if data.calories_per_100g is not None:
                food.calories_per_100g = data.calories_per_100g
            if data.protein_per_100g is not None:
                food.protein_per_100g = data.protein_per_100g
            if data.carbs_per_100g is not None:
                food.carbs_per_100g = data.carbs_per_100g
            if data.fat_per_100g is not None:
                food.fat_per_100g = data.fat_per_100g

            flush()
            return self._serialize(food)

    def eliminar_food(self, food_id: int, user_id: int) -> dict:
        with db_session:
            food = Food.get(id=food_id)
            if food is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alimento no encontrado",
                )

            # Permitir eliminar:
            # - Alimentos creados por el propio usuario
            # - Alimentos sin creador (por ejemplo, importados de servicios externos)
            if food.created_by is not None and food.created_by.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo puedes eliminar alimentos creados por ti",
                )

            deleted_id = food.id
            food.delete()
            return {"id": deleted_id, "deleted": True}

