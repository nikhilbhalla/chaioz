from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    loyalty_points: int = 0
    loyalty_tier: str = "Bronze"
    created_at: str


# ---------- Menu ----------
class MenuItemAddon(BaseModel):
    name: str
    price: float = 0.0


class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    description: str = ""
    price: float
    category: str
    subcategory: Optional[str] = None
    image: Optional[str] = None
    calories: Optional[str] = None
    sizes: List[dict] = []          # [{name:'Regular',price_delta:0},{name:'Large',price_delta:1}]
    addons: List[MenuItemAddon] = []
    is_bestseller: bool = False
    is_vegan: bool = False
    is_available: bool = True
    sort_order: int = 0


# ---------- Cart / Orders ----------
class OrderLineItem(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    size: Optional[str] = None
    addons: List[str] = []
    notes: Optional[str] = None
    line_total: float


class CreateOrderRequest(BaseModel):
    items: List[OrderLineItem]
    pickup_time: str             # ISO string
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    notes: Optional[str] = None
    payment_method: Literal["square_mock", "pay_at_pickup"] = "square_mock"
    # Delivery option
    fulfillment: Literal["pickup", "delivery"] = "pickup"
    delivery_address: Optional[dict] = None    # {street_address: [..], city, state, zip_code, country}
    delivery_quote_id: Optional[str] = None
    delivery_fee: float = 0.0
    delivery_notes: Optional[str] = None


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    short_code: str = Field(default_factory=lambda: uuid.uuid4().hex[:6].upper())
    user_id: Optional[str] = None
    items: List[OrderLineItem]
    subtotal: float
    discount: float = 0.0
    delivery_fee: float = 0.0
    total: float
    pickup_time: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    notes: Optional[str] = None
    status: Literal["pending", "confirmed", "preparing", "ready", "completed", "cancelled"] = "confirmed"
    payment_method: str = "square_mock"
    payment_status: Literal["paid", "unpaid"] = "paid"
    fulfillment: str = "pickup"
    delivery_address: Optional[dict] = None
    delivery_status: Optional[str] = None
    uber_delivery_id: Optional[str] = None
    uber_tracking_url: Optional[str] = None
    created_at: str = Field(default_factory=_now)


# ---------- Retail Products ----------
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_id)
    name: str
    description: str
    price: float
    category: str        # "Chai Blends" | "Gift Boxes" | "Merch" | "Subscription"
    image: Optional[str] = None
    stock: int = 100
    is_subscription: bool = False
    sort_order: int = 0


class ProductOrderItem(BaseModel):
    product_id: str
    qty: int
