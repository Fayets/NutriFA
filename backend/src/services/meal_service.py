from datetime import datetime, date
from typing import List, Dict

from pony.orm import db_session, flush
from fastapi import HTTPException, status

from src.models import Usuario, Food, Meal
from src.schemas import MealCreate
from src.services.service_utils import get_usuario_or_404, validate_date_range_and_get_bounds


class MealService:

    @staticmethod
    def _get_food_or_404(food_id: int) -> Food:
        food = Food.get(id=food_id)
        if food is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alimento no encontrado",
            )
        return food

    @staticmethod
    def _serialize(meal: Meal) -> Dict:
        return {
            "id": meal.id,
            "user_id": meal.user.id,
            "food_id": meal.food.id,
            "quantity_grams": meal.quantity_grams,
            "calories": meal.calories,
            "protein": meal.protein,
            "carbs": meal.carbs,
            "fat": meal.fat,
            "consumed_at": meal.consumed_at,
        }

    def crear_meal(self, data: MealCreate, user_id: int) -> Dict:
        with db_session:
            usuario = get_usuario_or_404(user_id)
            food = self._get_food_or_404(data.food_id)

            factor = data.quantity_grams / 100.0

            calories = food.calories_per_100g * factor
            protein = food.protein_per_100g * factor
            carbs = food.carbs_per_100g * factor
            fat = food.fat_per_100g * factor

            meal = Meal(
                user=usuario,
                food=food,
                quantity_grams=data.quantity_grams,
                calories=calories,
                protein=protein,
                carbs=carbs,
                fat=fat,
            )
            flush()

            return self._serialize(meal)

    def listar_meals_rango(
        self,
        user_id: int,
        fecha_inicio: date,
        fecha_fin: date,
    ) -> List[Dict]:
        start_datetime, end_datetime = validate_date_range_and_get_bounds(
            fecha_inicio,
            fecha_fin,
        )

        with db_session:
            usuario = get_usuario_or_404(user_id)

            meals = [
                m
                for m in usuario.meals
                if m.consumed_at >= start_datetime and m.consumed_at <= end_datetime
            ]

            return [self._serialize(m) for m in meals]

    def eliminar_meal(self, meal_id: int, user_id: int) -> Dict:
        with db_session:
            usuario = get_usuario_or_404(user_id)
            meal = Meal.get(id=meal_id, user=usuario)
            if meal is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Comida no encontrada",
                )

            data = self._serialize(meal)
            meal.delete()
            return data

