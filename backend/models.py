from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone
import re
import uuid


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
# Rules (anti-spam):
#  - name: 2–60 chars, letters/spaces/'-'/'/dot only (allows international names)
#  - email: validated by EmailStr (no disposable-domain blocklist by design — too brittle)
#  - password: 8+ chars, must include at least one letter AND one digit
#  - phone (optional): AU mobile / landline E.164 or local 10-digit format
_NAME_RE = re.compile(r"^[A-Za-z\s'\-.\u00C0-\u024F\u0400-\u04FF]{2,60}$", re.UNICODE)
_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")
_AU_PHONE_RE = re.compile(r"^(?:\+?61|0)4\d{8}$|^(?:\+?61|0)[2378]\d{8}$")


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: Optional[str] = None

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        v = v.strip()
        if not _NAME_RE.match(v):
            raise ValueError("Name must be 2-60 chars (letters, spaces, hyphen or apostrophe)")
        return v

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError("Password must be 8+ chars and include at least one letter and one digit")
        return v

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        cleaned = re.sub(r"[\s\-()]", "", v)
        if not _AU_PHONE_RE.match(cleaned):
            raise ValueError("Phone must be a valid Australian number (e.g. 0412345678 or +61412345678)")
        return cleaned


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
    tags: List[str] = []            # admin-override tags; takes precedence over name-derived tags


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
