from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
import socketio
import jwt
from passlib.context import CryptContext
import qrcode
from io import BytesIO
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'warkop_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'warkop-mamet-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ✅ PERBAIKAN: Socket.IO dengan CORS yang benar
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    logger=True,
    engineio_logger=True
)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up application...")
    
    # Create default admin if not exists
    try:
        admin = await db.admin_users.find_one({"username": "admin"}, {"_id": 0})
        if not admin:
            default_admin = AdminUser(
                username="admin",
                password_hash=pwd_context.hash("admin123")
            )
            doc = default_admin.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.admin_users.insert_one(doc)
            logger.info("Default admin user created: username=admin, password=admin123")
    except Exception as e:
        logger.error(f"Error creating admin: {e}")
    
    # Create sample menu items if empty
    try:
        count = await db.menu_items.count_documents({})
        if count == 0:
            sample_items = [
                MenuItemCreate(
                    name="Kopi Hitam",
                    category="drink",
                    price=10000,
                    image_url="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
                    description="Kopi hitam tradisional pilihan terbaik"
                ),
                MenuItemCreate(
                    name="Kopi Susu",
                    category="drink",
                    price=12000,
                    image_url="https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400",
                    description="Kopi susu creamy dan lezat"
                ),
                MenuItemCreate(
                    name="Es Teh Manis",
                    category="drink",
                    price=5000,
                    image_url="https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
                    description="Teh manis segar dengan es"
                ),
                MenuItemCreate(
                    name="Nasi Goreng",
                    category="food",
                    price=15000,
                    image_url="https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400",
                    description="Nasi goreng spesial dengan telur"
                ),
                MenuItemCreate(
                    name="Mie Goreng",
                    category="food",
                    price=13000,
                    image_url="https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400",
                    description="Mie goreng pedas gurih"
                ),
                MenuItemCreate(
                    name="Pisang Goreng",
                    category="food",
                    price=8000,
                    image_url="https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=400",
                    description="Pisang goreng crispy"
                )
            ]
            for item in sample_items:
                menu_item = MenuItem(**item.model_dump())
                doc = menu_item.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.menu_items.insert_one(doc)
            logger.info(f"{len(sample_items)} sample menu items created")
    except Exception as e:
        logger.error(f"Error creating menu items: {e}")
    
    yield
    
    logger.info("Shutting down application...")
    client.close()

# Create FastAPI app
app = FastAPI(lifespan=lifespan)

# ✅ PERBAIKAN: CORS middleware harus ditambahkan PERTAMA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create API router
api_router = APIRouter(prefix="/api")

# Models
class AdminUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    price: float
    image_url: str
    description: str
    available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    category: str
    price: float
    image_url: str
    description: str
    available: bool = True

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    available: Optional[bool] = None

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    table_number: Optional[str] = None
    items: List[OrderItem]
    total: float
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    customer_name: str
    table_number: Optional[str] = None
    items: List[OrderItem]
    total: float

class OrderStatusUpdate(BaseModel):
    status: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    username: str

# Utility functions
def create_jwt_token(username: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": username,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    username = verify_jwt_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    user = await db.admin_users.find_one({"username": username}, {"_id": 0})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return username

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_order_room(sid, data):
    order_id = data.get('order_id')
    if order_id:
        await sio.enter_room(sid, f"order_{order_id}")
        logger.info(f"Client {sid} joined room order_{order_id}")

@sio.event
async def join_admin_room(sid):
    await sio.enter_room(sid, "admin")
    logger.info(f"Admin {sid} joined admin room")

# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    try:
        user = await db.admin_users.find_one({"username": request.username}, {"_id": 0})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        if not pwd_context.verify(request.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        token = create_jwt_token(request.username)
        return LoginResponse(token=token, username=request.username)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/verify")
async def verify_token(username: str = Depends(get_current_user)):
    return {"valid": True, "username": username}

# Menu Routes
@api_router.get("/menu", response_model=List[MenuItem])
async def get_menu():
    try:
        items = await db.menu_items.find({"available": True}, {"_id": 0}).to_list(1000)
        for item in items:
            if isinstance(item['created_at'], str):
                item['created_at'] = datetime.fromisoformat(item['created_at'])
        return items
    except Exception as e:
        logger.error(f"Error fetching menu: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/menu/all", response_model=List[MenuItem])
async def get_all_menu(username: str = Depends(get_current_user)):
    try:
        items = await db.menu_items.find({}, {"_id": 0}).to_list(1000)
        for item in items:
            if isinstance(item['created_at'], str):
                item['created_at'] = datetime.fromisoformat(item['created_at'])
        return items
    except Exception as e:
        logger.error(f"Error fetching all menu: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, username: str = Depends(get_current_user)):
    try:
        menu_item = MenuItem(**item.model_dump())
        doc = menu_item.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.menu_items.insert_one(doc)
        return menu_item
    except Exception as e:
        logger.error(f"Error creating menu item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item: MenuItemUpdate, username: str = Depends(get_current_user)):
    try:
        existing = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Menu item not found")
        
        update_data = {k: v for k, v in item.model_dump().items() if v is not None}
        if update_data:
            await db.menu_items.update_one({"id": item_id}, {"$set": update_data})
        
        updated = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
        if isinstance(updated['created_at'], str):
            updated['created_at'] = datetime.fromisoformat(updated['created_at'])
        return MenuItem(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating menu item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, username: str = Depends(get_current_user)):
    try:
        result = await db.menu_items.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Menu item not found")
        return {"message": "Menu item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting menu item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Order Routes
@api_router.post("/orders", response_model=Order)
async def create_order(order_request: OrderCreate):
    try:
        logger.info(f"Creating order: {order_request}")
        order = Order(**order_request.model_dump())
        doc = order.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        # Insert dengan _id yang akan di-exclude
        result = await db.orders.insert_one(doc)
        logger.info(f"Order created successfully: {order.id}")
        
        # ✅ PERBAIKAN: Fetch kembali tanpa _id untuk Socket.IO
        clean_doc = await db.orders.find_one({"id": order.id}, {"_id": 0})
        
        # Emit to admin room
        try:
            await sio.emit('new_order', clean_doc, room='admin')
        except Exception as e:
            logger.error(f"Error emitting socket event: {e}")
        
        return order
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    try:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order['updated_at'], str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        
        return Order(**order)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders", response_model=List[Order])
async def get_orders(username: str = Depends(get_current_user)):
    try:
        orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        for order in orders:
            if isinstance(order['created_at'], str):
                order['created_at'] = datetime.fromisoformat(order['created_at'])
            if isinstance(order['updated_at'], str):
                order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        return orders
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, username: str = Depends(get_current_user)):
    try:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        updated_at = datetime.now(timezone.utc).isoformat()
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": status_update.status, "updated_at": updated_at}}
        )
        
        # ✅ PERBAIKAN: Gunakan dict biasa, bukan ObjectId
        update_data = {
            "order_id": order_id,
            "status": status_update.status,
            "updated_at": updated_at
        }
        
        # Emit to specific order room and admin room
        try:
            await sio.emit('order_status_updated', update_data, room=f"order_{order_id}")
            await sio.emit('order_updated', update_data, room='admin')
        except Exception as e:
            logger.error(f"Error emitting socket event: {e}")
        
        updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if isinstance(updated_order['created_at'], str):
            updated_order['created_at'] = datetime.fromisoformat(updated_order['created_at'])
        if isinstance(updated_order['updated_at'], str):
            updated_order['updated_at'] = datetime.fromisoformat(updated_order['updated_at'])
        
        return Order(**updated_order)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Analytics Routes
@api_router.get("/analytics/daily")
async def get_daily_analytics(username: str = Depends(get_current_user)):
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        orders = await db.orders.find({
            "created_at": {"$gte": today_start.isoformat()},
            "status": {"$ne": "cancelled"}
        }, {"_id": 0}).to_list(1000)
        
        total_orders = len(orders)
        total_revenue = sum(order['total'] for order in orders)
        
        return {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "date": today_start.isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# QR Code Generation
@api_router.get("/qrcode")
async def generate_qr_code():
    try:
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(frontend_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return {"qr_code": f"data:image/png;base64,{img_str}"}
    except Exception as e:
        logger.error(f"Error generating QR code: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

# ✅ Wrap with Socket.IO - MUST BE LAST
socket_app = socketio.ASGIApp(
    sio, 
    other_asgi_app=app,
    socketio_path='socket.io'
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        socket_app,  # ✅ Run socket_app, bukan app
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )