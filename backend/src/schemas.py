from pydantic import BaseModel
from datetime import datetime
from typing import Any, Optional


# ======================
# USUARIO
# ======================


class BaseAPIResponse(BaseModel):
    message: str
    success: bool
    data: Any | None


class UsuarioCreate(BaseModel):
    user: str
    password: str


class UsuarioLogin(BaseModel):
    user: str
    password: str


class UsuarioResponse(BaseModel):
    id: int
    user: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ======================
# USER SETTINGS
# ======================


class SettingsCreate(BaseModel):
    metabolism_base: int
    protein_target: Optional[int] = None
    carbs_target: Optional[int] = None
    fat_target: Optional[int] = None


class SettingsUpdate(BaseModel):
    metabolism_base: Optional[int] = None
    protein_target: Optional[int] = None
    carbs_target: Optional[int] = None
    fat_target: Optional[int] = None


class SettingsResponse(BaseModel):
    id: int
    user_id: int
    metabolism_base: int
    protein_target: Optional[int]
    carbs_target: Optional[int]
    fat_target: Optional[int]
    updated_at: datetime


class SettingsUpdateResponse(BaseModel):
    id: int
    user_id: int
    metabolism_base: int
    protein_target: Optional[int]
    carbs_target: Optional[int]
    fat_target: Optional[int]
    updated_at: datetime


# ======================
# FOOD
# ======================


class FoodCreate(BaseModel):
    name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    barcode: Optional[str] = None


class FoodUpdate(BaseModel):
    name: Optional[str] = None
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    barcode: Optional[str] = None


class FoodResponse(BaseModel):
    id: int
    name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    barcode: Optional[str]
    created_by_id: Optional[int]
    created_at: datetime


class FoodBarcodeResponse(BaseModel):
    id: int
    name: str
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    barcode: Optional[str]
    created_by_id: Optional[int]
    created_at: datetime


class FoodListResponse(BaseModel):
    items: list[FoodResponse]


class FoodDeleteResponse(BaseModel):
    id: int
    deleted: bool


# ======================
# DASHBOARD
# ======================


class DashboardResponse(BaseModel):
    date: datetime
    total_calories: float
    metabolism_base: int
    balance: float
    total_protein: float
    total_carbs: float
    total_fat: float
    macro_percentages: dict


class DashboardRangeItem(BaseModel):
    date: datetime
    total_calories: float
    metabolism_base: int
    balance: float
    total_protein: float
    total_carbs: float
    total_fat: float
    macro_percentages: dict


class DashboardRangeResponse(BaseModel):
    items: list[DashboardRangeItem]


# ======================
# MEALS
# ======================


class MealCreate(BaseModel):
    food_id: int
    quantity_grams: float


class MealResponse(BaseModel):
    id: int
    user_id: int
    food_id: int
    quantity_grams: float
    calories: float
    protein: float
    carbs: float
    fat: float
    consumed_at: datetime


class MealsRangeResponse(BaseModel):
    items: list[MealResponse]

