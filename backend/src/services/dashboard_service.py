from datetime import datetime, date, timedelta
from typing import List, Dict

from pony.orm import db_session
from fastapi import HTTPException, status

from src.models import Usuario, UserSettings, Meal
from src.services.service_utils import (
    get_usuario_or_404,
    validate_date_range_and_get_bounds,
)


class DashboardService:

    @staticmethod
    def _get_settings_or_404(usuario: Usuario) -> UserSettings:
        settings = usuario.settings
        if settings is None:
            # Crear una configuración por defecto si no existe
            settings = UserSettings(
                user=usuario,
                metabolism_base=1770,
                protein_target=None,
                carbs_target=None,
                fat_target=None,
            )
        return settings

    @staticmethod
    def _get_day_bounds(fecha: date) -> tuple[datetime, datetime]:
        start = datetime.combine(fecha, datetime.min.time())
        end = datetime.combine(fecha, datetime.max.time())
        return start, end

    @staticmethod
    def _compute_macro_percentages(
        total_protein: float,
        total_carbs: float,
        total_fat: float,
    ) -> Dict[str, float]:
        calories_from_protein = total_protein * 4
        calories_from_carbs = total_carbs * 4
        calories_from_fat = total_fat * 9

        total_macro_calories = (
            calories_from_protein + calories_from_carbs + calories_from_fat
        )

        if total_macro_calories <= 0:
            return {
                "protein_percent": 0.0,
                "carbs_percent": 0.0,
                "fat_percent": 0.0,
            }

        protein_percent = (calories_from_protein / total_macro_calories) * 100
        carbs_percent = (calories_from_carbs / total_macro_calories) * 100
        fat_percent = (calories_from_fat / total_macro_calories) * 100

        return {
            "protein_percent": protein_percent,
            "carbs_percent": carbs_percent,
            "fat_percent": fat_percent,
        }

    @staticmethod
    def _serialize_day(
        fecha: date,
        metabolism_base: int,
        total_calories: float,
        total_protein: float,
        total_carbs: float,
        total_fat: float,
    ) -> Dict:
        balance = total_calories - metabolism_base
        macro_percentages = DashboardService._compute_macro_percentages(
            total_protein=total_protein,
            total_carbs=total_carbs,
            total_fat=total_fat,
        )

        return {
            "date": datetime.combine(fecha, datetime.min.time()),
            "total_calories": total_calories,
            "metabolism_base": metabolism_base,
            "balance": balance,
            "total_protein": total_protein,
            "total_carbs": total_carbs,
            "total_fat": total_fat,
            "macro_percentages": macro_percentages,
        }

    def obtener_dashboard_del_dia(self, user_id: int, fecha: date) -> Dict:
        with db_session:
            usuario = get_usuario_or_404(user_id)
            settings = self._get_settings_or_404(usuario)

            start, end = self._get_day_bounds(fecha)

            meals = [
                m
                for m in usuario.meals
                if m.consumed_at >= start and m.consumed_at <= end
            ]

            total_calories = sum(m.calories for m in meals)
            total_protein = sum(m.protein for m in meals)
            total_carbs = sum(m.carbs for m in meals)
            total_fat = sum(m.fat for m in meals)

            return self._serialize_day(
                fecha=fecha,
                metabolism_base=settings.metabolism_base,
                total_calories=total_calories,
                total_protein=total_protein,
                total_carbs=total_carbs,
                total_fat=total_fat,
            )

    def obtener_dashboard_rango(
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
            settings = self._get_settings_or_404(usuario)

            meals = [
                m
                for m in usuario.meals
                if m.consumed_at >= start_datetime
                and m.consumed_at <= end_datetime
            ]

            by_date: Dict[date, Dict[str, float]] = {}
            for meal in meals:
                meal_date = meal.consumed_at.date()
                if meal_date not in by_date:
                    by_date[meal_date] = {
                        "total_calories": 0.0,
                        "total_protein": 0.0,
                        "total_carbs": 0.0,
                        "total_fat": 0.0,
                    }
                day_totals = by_date[meal_date]
                day_totals["total_calories"] += meal.calories
                day_totals["total_protein"] += meal.protein
                day_totals["total_carbs"] += meal.carbs
                day_totals["total_fat"] += meal.fat

            results: List[Dict] = []
            current = fecha_inicio
            while current <= fecha_fin:
                totals = by_date.get(
                    current,
                    {
                        "total_calories": 0.0,
                        "total_protein": 0.0,
                        "total_carbs": 0.0,
                        "total_fat": 0.0,
                    },
                )
                day_data = self._serialize_day(
                    fecha=current,
                    metabolism_base=settings.metabolism_base,
                    total_calories=totals["total_calories"],
                    total_protein=totals["total_protein"],
                    total_carbs=totals["total_carbs"],
                    total_fat=totals["total_fat"],
                )
                results.append(day_data)
                current = current + timedelta(days=1)

            return results

