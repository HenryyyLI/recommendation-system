import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import numpy as np
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from models.two_tower_model import TwoTowerRecall
from models.item_cf import ItemCF
from models.user_cf import UserCF
from models.global_popular import GlobalPopular
from models.category_popular import CategoryPopular
from models.coarse_ranking import CoarseRanking
from models.mmoe import MMOE
from models.reranking import Reranking

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Recommendation System API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class RecommendationRequest(BaseModel):
    clientId: int
    page: int = 0
    pageSize: int = 10
    category: Optional[str] = None
    excludeProductIds: Optional[List[int]] = None


class RecommendationResponse(BaseModel):
    code: int
    data: Dict[str, Any]


class EventItem(BaseModel):
    eventType: str
    clientId: int
    productId: Optional[int] = None
    timestamp: str
    sessionId: str
    page: str
    position: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class EventBatchRequest(BaseModel):
    events: List[EventItem]


class EventBatchResponse(BaseModel):
    code: int
    data: Dict[str, int]


class TransactionItem(BaseModel):
    productId: int
    storeId: int
    quantity: int
    salesNetAmountEuro: float


class TransactionRequest(BaseModel):
    clientId: int
    items: List[TransactionItem]
    totalAmount: float
    paymentMethod: str
    stripePaymentIntentId: Optional[str] = None


class TransactionResponse(BaseModel):
    code: int
    data: Dict[str, Any]


class ClientInfoResponse(BaseModel):
    code: int
    data: Dict[str, Any]


class OrderResponse(BaseModel):
    code: int
    data: Dict[str, Any]


class RecommendationPipeline:

    def __init__(self, db_config: Dict[str, str]):
        """
        Initialize recommendation pipeline.
        Args:
            db_config: Database connection configuration dictionary
        """

        self.db_config = db_config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        self._load_models()
        self.item_embeddings, self.item_id_to_idx = self._load_item_embeddings()

    def _load_models(self):
        """Load all trained models."""

        print("Loading models...")

        # Load two-tower model
        two_tower_checkpoint = torch.load('two_tower_model.pth', map_location=self.device)
        self.two_tower = TwoTowerRecall(
            user_feature_dim=8,
            item_feature_dim=10,
            embedding_dim=64
        )
        self.two_tower.user_tower.load_state_dict(two_tower_checkpoint['user_tower'])
        self.two_tower.item_tower.load_state_dict(two_tower_checkpoint['item_tower'])
        self.two_tower.user_tower = self.two_tower.user_tower.to(self.device)
        self.two_tower.item_tower = self.two_tower.item_tower.to(self.device)

        # Load ItemCF model
        self.item_cf = ItemCF()
        self.item_cf.load_from_pkl('item_similarity.pkl')

        # Load UserCF model
        self.user_cf = UserCF(self.db_config)
        self.user_cf.load_from_pkl('user_similarity.pkl')

        # Load global popular model
        self.global_popular = GlobalPopular()
        self.global_popular.load_from_pkl('global_popular.pkl')

        # Load category popular model
        self.category_popular = CategoryPopular()
        self.category_popular.load_from_pkl('category_popular.pkl')

        # Load coarse ranking model
        coarse_checkpoint = torch.load('coarse_ranking_model.pth', map_location=self.device)
        self.coarse_ranker = CoarseRanking(
            feature_dim=coarse_checkpoint['feature_dim'],
            hidden_dim=64
        )
        self.coarse_ranker.model.load_state_dict(coarse_checkpoint['model'])
        self.coarse_ranker.model = self.coarse_ranker.model.to(self.device)

        # Load MMOE model
        mmoe_checkpoint = torch.load('mmoe_model.pth', map_location=self.device)
        self.fine_ranker = MMOE(
            input_dim=mmoe_checkpoint['feature_dim'],
            num_experts=4,
            hidden_dim=128
        )
        self.fine_ranker.load_state_dict(mmoe_checkpoint['model_state_dict'])
        self.fine_ranker = self.fine_ranker.to(self.device)

        # Load reranking model
        self.reranker = Reranking(self.db_config)
        self.reranker.load_stock_data()

        print("All models loaded successfully!")

    def _load_item_embeddings(self):
        """Load item embeddings from database."""

        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT "ProductID", "Embedding" FROM item_embeddings')
                    item_data = cursor.fetchall()

                    item_id_to_idx = {pid: i for i, (pid, _) in enumerate(item_data)}
                    item_embeddings = np.array([emb for _, emb in item_data])

                    print("Item embeddings loaded successfully!")
                    return item_embeddings, item_id_to_idx
        except Exception as e:
            print(f"Error loading item embeddings: {e}")
            return np.array([]), {}

    def _get_user_features(self, user_id: int) -> List[float]:
        """
        Get user features from database.
        Args:
            user_id: User ID
        Returns:
            List of user feature values
        """

        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                    SELECT "TotalPurchases", "TotalSpendEuro", "AvgOrderValue",
                           "DaysSinceLastPurchase", "PurchaseFrequency",
                           "UniqueProductsBought", "TotalQuantity", "Age"
                    FROM clients WHERE "ClientID" = %s
                    """, (user_id,))

                    result = cursor.fetchone()
                    return [0 if x is None else float(x) for x in result] if result else [0] * 8
        except Exception as e:
            print(f"Error loading user features: {e}")
            return [0] * 8

    def _get_item_features(self, item_ids: List[int]) -> torch.Tensor:
        """
        Get item features from database.
        Args:
            item_ids: List of item IDs
        Returns:
            Tensor of item features [num_items, item_feature_dim]
        """

        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                    SELECT "TotalSales", "TotalQuantitySold", "Sales7d", "Sales30d",
                           "AvgPrice", "TotalRevenue", "UniqueBuyers",
                           "AvgQuantityPerOrder", "TotalStockQuantity", "StockCountries"
                    FROM products WHERE "ProductID" = ANY(%s)
                    """, (item_ids,))

                    features = [[0 if x is None else float(x) for x in row] for row in cursor.fetchall()]
                    return torch.tensor(features, dtype=torch.float32)
        except Exception as e:
            print(f"Error loading item features: {e}")
            return torch.zeros(len(item_ids), 10)

    def _get_combined_features(self, user_id: int, item_ids: List[int]) -> torch.Tensor:
        """
        Get combined user-item features for ranking.
        Args:
            user_id: User ID
            item_ids: List of item IDs
        Returns:
            Combined feature tensor [num_items, user_feature_dim + item_feature_dim]
        """

        user_features = self._get_user_features(user_id)
        item_features = self._get_item_features(item_ids)

        user_tensor = torch.tensor([user_features] * len(item_ids), dtype=torch.float32)
        combined = torch.cat([user_tensor, item_features], dim=1)

        return combined.to(self.device)

    def recommend(self, user_id: int, top_k: int = 20, category: Optional[str] = None, 
                  exclude_ids: Optional[List[int]] = None) -> tuple:
        """
        Generate recommendations for user.
        Args:
            user_id: User ID
            top_k: Number of final recommendations
            category: Optional category filter
            exclude_ids: Optional list of product IDs to exclude
        Returns:
            Tuple of (recommended item IDs, recall sources)
        """

        print(f"\n{'='*50}")
        print(f"Generating recommendations for User {user_id}")
        print(f"{'='*50}\n")

        # Load user data from database
        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                    SELECT "ClientCountry", "TopCategory1", "TopCategory2", "TopCategory3"
                    FROM clients WHERE "ClientID" = %s
                    """, (user_id,))
                    result = cursor.fetchone()

                    if not result:
                        print("User not found!")
                        return [], []

                    user_country = result[0]
                    user_categories = [cat for cat in result[1:] if cat]

                    cursor.execute("""
                    SELECT "ProductID" FROM user_item_interactions WHERE "ClientID" = %s
                    """, (user_id,))
                    user_purchased = [row[0] for row in cursor.fetchall()]
        except Exception as e:
            print(f"Error loading user data: {e}")
            return [], []

        # Get user features for two-tower
        user_features = self._get_user_features(user_id)

        # Stage 1: Multi-channel recall
        print("Stage 1: Multi-channel Recall")
        print("-" * 50)

        candidates = set()
        recall_sources = []

        # Recall from two-tower model
        user_tensor = torch.FloatTensor([user_features]).to(self.device)
        user_embedding = self.two_tower.encode_users(user_tensor)[0]
        two_tower_idx = self.two_tower.recall(user_embedding, self.item_embeddings, top_k=500)
        two_tower_items = [list(self.item_id_to_idx.keys())[idx] for idx in two_tower_idx]
        if two_tower_items:
            candidates.update(two_tower_items)
            recall_sources.append("two_tower")
        print(f"TwoTower recalled: {len(two_tower_items)} candidates")

        # Recall from ItemCF model
        itemcf_items = self.item_cf.recall(user_purchased, top_k=300)
        if itemcf_items:
            candidates.update(itemcf_items)
            recall_sources.append("collaborative_filtering")
        print(f"ItemCF recalled: {len(itemcf_items)} candidates")

        # Recall from UserCF model
        usercf_items = self.user_cf.recall(user_id, user_purchased, top_k=200)
        if usercf_items:
            candidates.update(usercf_items)
            if "collaborative_filtering" not in recall_sources:
                recall_sources.append("collaborative_filtering")
        print(f"UserCF recalled: {len(usercf_items)} candidates")

        # Recall from global popular
        global_items = self.global_popular.recall(top_k=200)
        if global_items:
            candidates.update(global_items)
            recall_sources.append("popular")
        print(f"GlobalPopular recalled: {len(global_items)} candidates")

        # Recall from category popular
        category_items = self.category_popular.recall(user_categories, top_k=200)
        if category_items:
            candidates.update(category_items)
            if "popular" not in recall_sources:
                recall_sources.append("popular")
        print(f"CategoryPopular recalled: {len(category_items)} candidates")

        # Remove purchased items and excluded items
        candidates = list(candidates - set(user_purchased))
        if exclude_ids:
            candidates = [c for c in candidates if c not in exclude_ids]
        print(f"Total unique candidates: {len(candidates)}")

        if not candidates:
            return [], recall_sources

        # Stage 2: Coarse ranking
        print("\nStage 2: Coarse Ranking")
        print("-" * 50)

        candidate_features = self._get_combined_features(user_id, candidates)
        coarse_candidates = self.coarse_ranker.rank(candidates, candidate_features, top_k=500)
        print(f"Coarse ranking kept: {len(coarse_candidates)} candidates")

        # Stage 3: Fine ranking
        print("\nStage 3: Fine Ranking")
        print("-" * 50)

        fine_features = self._get_combined_features(user_id, coarse_candidates)
        purchase_probs, gmv_preds = self.fine_ranker.predict(fine_features)

        gmv_normalized = (gmv_preds - gmv_preds.min()) / (gmv_preds.max() - gmv_preds.min() + 1e-8)
        scores = 0.5 * purchase_probs + 0.5 * gmv_normalized

        ranked_indices = np.argsort(scores)[::-1][:100]
        fine_candidates = [coarse_candidates[i] for i in ranked_indices]
        fine_scores = [scores[i] for i in ranked_indices]
        print(f"Fine ranking kept: {len(fine_candidates)} candidates")

        # Stage 4: Reranking
        print("\nStage 4: Reranking")
        print("-" * 50)

        final_items = self.reranker.rerank(fine_candidates, fine_scores, user_country)[:top_k]
        print(f"Reranking kept: {len(final_items)} candidates")

        print(f"\n{'='*50}")
        print(f"Final recommendations: {final_items}")
        print(f"{'='*50}\n")

        return final_items, recall_sources


pipeline = None


def get_db_config():
    """Get database configuration from environment variables"""

    return {
        'host': os.getenv('DB_HOST'),
        'port': os.getenv('DB_PORT'),
        'dbname': os.getenv('DB_NAME'),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'sslmode': os.getenv('DB_SSLMODE', 'require')
    }


@app.on_event("startup")
async def startup_event():
    """Initialize pipeline on startup"""

    global pipeline
    
    db_config = get_db_config()
    
    logger.info("Initializing pipeline...")
    pipeline = RecommendationPipeline(db_config)
    logger.info("Pipeline initialized successfully!")


@app.get("/")
async def root():
    """Health check endpoint"""

    return {"status": "ok", "message": "Recommendation System API is running"}


@app.post("/api/v1/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get recommendations for user with pagination and filtering
    """

    try:
        if pipeline is None:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        start_time = datetime.now()
        
        # Get recommended product IDs
        page_size = request.pageSize
        total_needed = (request.page + 1) * page_size + 50
        
        recommended_ids, recall_sources = pipeline.recommend(
            user_id=request.clientId,
            top_k=total_needed,
            category=request.category,
            exclude_ids=request.excludeProductIds
        )
        
        if not recommended_ids:
            return RecommendationResponse(
                code=200,
                data={
                    "products": [],
                    "hasMore": False,
                    "page": request.page,
                    "totalCount": 0,
                    "recallSources": recall_sources
                }
            )
        
        # Fetch product details from database
        db_config = get_db_config()
        with psycopg2.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                category_filter = ""
                params = [recommended_ids]
                if request.category:
                    category_filter = ' AND "Category" = %s'
                    params.append(request.category)
                
                cursor.execute(f"""
                SELECT 
                    p."ProductID", p."Category", p."FamilyLevel1", p."FamilyLevel2", 
                    p."Universe", p."AvgPrice", p."AvgUnitPrice", p."TotalSales",
                    p."TotalQuantitySold", p."Sales7d", p."Sales30d", p."TotalRevenue",
                    p."UniqueBuyers", p."TotalStockQuantity", p."StockCountries",
                    p."FirstSaleDate", p."LastSaleDate",
                    ARRAY_AGG(DISTINCT t."StoreID") as "StoreIDs",
                    ARRAY_AGG(DISTINCT s."StoreCountry") as "StoreCountries"
                FROM products p
                LEFT JOIN transactions t ON p."ProductID" = t."ProductID"
                LEFT JOIN stores s ON t."StoreID" = s."StoreID"
                WHERE p."ProductID" = ANY(%s){category_filter}
                GROUP BY p."ProductID"
                """, params)
                
                products_data = cursor.fetchall()
        
        # Create product ID to data mapping
        import random
        product_map = {}
        for row in products_data:
            store_countries = [c for c in row[18] if c] if row[18] else []
            # Use row[0] as key (int) for lookup, but convert to string in response
            product_map[row[0]] = {
                "ProductID": str(row[0]),  # Convert to string for BigInt safety
                "Category": row[1],
                "FamilyLevel1": row[2],
                "FamilyLevel2": row[3],
                "Universe": row[4],
                "AvgPrice": float(row[5]) if row[5] else 0.0,
                "AvgUnitPrice": float(row[6]) if row[6] else 0.0,
                "TotalSales": row[7] or 0,
                "TotalQuantitySold": row[8] or 0,
                "Sales7d": row[9] or 0,
                "Sales30d": row[10] or 0,
                "TotalRevenue": float(row[11]) if row[11] else 0.0,
                "UniqueBuyers": row[12] or 0,
                "TotalStockQuantity": row[13] or 0,
                "StockCountries": row[14] or 0,
                "StoreIDs": [str(s) for s in row[17] if s] if row[17] else [],  # Convert to strings
                "Rating": round(random.uniform(0, 5), 1),
                "ImageURL": f"https://picsum.photos/seed/p-{row[0]}/400/500",
                "StoreCountry": store_countries[0] if store_countries else None,
                "FirstSaleDate": row[15].isoformat() if row[15] else None,
                "LastSaleDate": row[16].isoformat() if row[16] else None
            }
        
        # Sort products by recommendation order and apply pagination
        sorted_products = []
        for pid in recommended_ids:
            if pid in product_map:
                sorted_products.append(product_map[pid])
        
        # Pagination
        start_idx = request.page * page_size
        end_idx = start_idx + page_size
        paginated_products = sorted_products[start_idx:end_idx]
        has_more = end_idx < len(sorted_products)
        
        return RecommendationResponse(
            code=200,
            data={
                "products": paginated_products,
                "hasMore": has_more,
                "page": request.page,
                "totalCount": len(sorted_products),
                "recallSources": recall_sources
            }
        )
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/events/batch", response_model=EventBatchResponse)
async def batch_events(request: EventBatchRequest):
    """
    Batch upload user events
    """

    try:
        db_config = get_db_config()
        accepted = 0
        failed = 0
        
        with psycopg2.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                for event in request.events:
                    try:
                        cursor.execute("""
                        INSERT INTO user_events 
                        ("ClientID", "EventType", "ProductID", "Timestamp", 
                         "SessionID", "Page", "Position", "Metadata")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            event.clientId,
                            event.eventType,
                            event.productId,
                            datetime.fromisoformat(event.timestamp.replace('Z', '+00:00')),
                            event.sessionId,
                            event.page,
                            event.position,
                            psycopg2.extras.Json(event.metadata) if event.metadata else None
                        ))
                        accepted += 1
                    except Exception as e:
                        logger.error(f"Error inserting event: {e}")
                        failed += 1
                
                conn.commit()
        
        return EventBatchResponse(
            code=200,
            data={
                "accepted": accepted,
                "failed": failed
            }
        )
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/transactions", response_model=TransactionResponse)
async def create_transaction(request: TransactionRequest):
    """
    Create transaction records after payment
    """

    try:
        import hashlib
        db_config = get_db_config()
        transaction_ids = []
        
        # Generate OrderID based on ClientID and current date
        current_date = datetime.now()
        date_str = current_date.strftime('%Y%m%d')
        hash_input = f"{request.clientId}-{date_str}"
        order_id = int(hashlib.md5(hash_input.encode()).hexdigest()[:16], 16) % 9223372036854775807
        
        with psycopg2.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                for item in request.items:
                    cursor.execute("""
                    INSERT INTO transactions 
                    ("ClientID", "ProductID", "StoreID", "Quantity", 
                     "SalesNetAmountEuro", "SaleTransactionDate", "OrderID")
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING "TransactionID"
                    """, (
                        request.clientId,
                        item.productId,
                        item.storeId,
                        item.quantity,
                        item.salesNetAmountEuro,
                        current_date,
                        order_id
                    ))
                    transaction_id = cursor.fetchone()[0]
                    transaction_ids.append(transaction_id)
                
                conn.commit()
        
        return TransactionResponse(
            code=200,
            data={
                "transactionIds": [str(tid) for tid in transaction_ids],  # Convert to string
                "orderId": str(order_id),  # Convert to string for BigInt safety
                "status": "PAID",
                "createdAt": current_date.isoformat()
            }
        )
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/clients/random")
async def get_random_clients(limit: int = Query(default=10, ge=1, le=50)):
    """
    Get random client list for login page carousel
    """

    try:
        db_config = get_db_config()
        
        with psycopg2.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT 
                    "ClientID", "ClientSegment", "ClientCountry", "ClientGender", "Age",
                    "TotalPurchases", "TotalSpendEuro", "AvgOrderValue",
                    "FirstPurchaseDate", "LastPurchaseDate",
                    "TopCategory1", "TopCategory2", "TopCategory3"
                FROM clients
                ORDER BY RANDOM()
                LIMIT %s
                """, (limit,))
                
                results = cursor.fetchall()
                
                clients = []
                for row in results:
                    clients.append({
                        "ClientID": str(row[0]),  # Convert to string for BigInt safety
                        "ClientSegment": row[1],
                        "ClientCountry": row[2],
                        "ClientGender": row[3],
                        "Age": row[4],
                        "TotalPurchases": row[5],
                        "TotalSpendEuro": float(row[6]) if row[6] else 0.0,
                        "AvgOrderValue": float(row[7]) if row[7] else 0.0,
                        "FirstPurchaseDate": row[8].isoformat() if row[8] else None,
                        "LastPurchaseDate": row[9].isoformat() if row[9] else None,
                        "TopCategory1": row[10],
                        "TopCategory2": row[11],
                        "TopCategory3": row[12]
                    })
                
                return JSONResponse(content={
                    "code": 200,
                    "data": clients
                })
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/clients/{clientId}", response_model=ClientInfoResponse)
async def get_client_info(clientId: int):
    """
    Get client information
    """

    try:
        db_config = get_db_config()
        
        with psycopg2.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT 
                    "ClientID", "ClientSegment", "ClientCountry", "ClientGender", "Age",
                    "TotalPurchases", "TotalSpendEuro", "AvgOrderValue",
                    "FirstPurchaseDate", "LastPurchaseDate", "DaysSinceLastPurchase",
                    "PurchaseFrequency", "TopCategory1", "TopCategory2", "TopCategory3",
                    "TopUniverse", "UniqueProductsBought", "TotalQuantity"
                FROM clients
                WHERE "ClientID" = %s
                """, (clientId,))
                
                result = cursor.fetchone()
                
                if not result:
                    raise HTTPException(status_code=404, detail="Client not found")
                
                return ClientInfoResponse(
                    code=200,
                    data={
                        "ClientID": str(result[0]),  # Convert to string for BigInt safety
                        "ClientSegment": result[1],
                        "ClientCountry": result[2],
                        "ClientGender": result[3],
                        "Age": result[4],
                        "TotalPurchases": result[5],
                        "TotalSpendEuro": float(result[6]) if result[6] else 0.0,
                        "AvgOrderValue": float(result[7]) if result[7] else 0.0,
                        "FirstPurchaseDate": result[8].isoformat() if result[8] else None,
                        "LastPurchaseDate": result[9].isoformat() if result[9] else None,
                        "DaysSinceLastPurchase": result[10],
                        "PurchaseFrequency": float(result[11]) if result[11] else 0.0,
                        "TopCategory1": result[12],
                        "TopCategory2": result[13],
                        "TopCategory3": result[14],
                        "TopUniverse": result[15],
                        "UniqueProductsBought": result[16],
                        "TotalQuantity": result[17]
                    }
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/orders", response_model=OrderResponse)
async def get_orders(clientId: int, page: int = 0, pageSize: int = 20):
    """
    Get order list for client
    """

    try:
        import random
        db_config = get_db_config()
        order_statuses = ["CREATED", "PENDING_PAYMENT", "PAID", "READY_TO_SHIP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]
        
        with psycopg2.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT 
                    t."OrderID",
                    CONCAT('Client ', t."ClientID") as "ClientName",
                    MIN(t."SaleTransactionDate") as "OrderDate",
                    SUM(t."SalesNetAmountEuro") as "TotalAmount",
                    COUNT(*) as "ItemCount"
                FROM transactions t
                WHERE t."ClientID" = %s
                GROUP BY t."OrderID", t."ClientID"
                ORDER BY MIN(t."SaleTransactionDate") DESC
                LIMIT %s OFFSET %s
                """, (clientId, pageSize, page * pageSize))
                
                orders_data = cursor.fetchall()
                
                cursor.execute("""
                SELECT COUNT(DISTINCT "OrderID")
                FROM transactions
                WHERE "ClientID" = %s
                """, (clientId,))
                
                total_count = cursor.fetchone()[0]
        
        orders = []
        for row in orders_data:
            orders.append({
                "orderId": str(row[0]),  # Convert to string for BigInt safety
                "clientName": row[1],
                "orderDate": row[2].isoformat() if row[2] else None,
                "totalAmount": float(row[3]) if row[3] else 0.0,
                "status": random.choice(order_statuses),
                "itemCount": row[4]
            })
        
        has_more = (page + 1) * pageSize < total_count
        
        return OrderResponse(
            code=200,
            data={
                "orders": orders,
                "hasMore": has_more,
                "page": page
            }
        )
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/orders/{orderId}", response_model=OrderResponse)
async def get_order_detail(orderId: int, clientId: Optional[int] = None):
    """
    Get order detail including items
    """

    try:
        import random
        db_config = get_db_config()
        order_statuses = ["CREATED", "PENDING_PAYMENT", "PAID", "READY_TO_SHIP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"]
        
        with psycopg2.connect(**db_config) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                SELECT 
                    t."OrderID",
                    t."ClientID",
                    CONCAT('Client ', t."ClientID") as "ClientName",
                    MIN(t."SaleTransactionDate") as "OrderDate",
                    SUM(t."SalesNetAmountEuro") as "TotalAmount",
                    t."ProductID",
                    p."FamilyLevel1",
                    p."FamilyLevel2",
                    p."Category",
                    t."StoreID",
                    CONCAT('Store ', t."StoreID") as "StoreName",
                    t."Quantity",
                    t."SalesNetAmountEuro" / t."Quantity" as "UnitPrice"
                FROM transactions t
                LEFT JOIN products p ON t."ProductID" = p."ProductID"
                WHERE t."OrderID" = %s
                GROUP BY t."OrderID", t."ClientID", t."ProductID", 
                         p."FamilyLevel1", p."FamilyLevel2", p."Category", 
                         t."StoreID", t."Quantity", t."SalesNetAmountEuro"
                """, (orderId,))
                
                order_data = cursor.fetchall()
                
                if not order_data:
                    raise HTTPException(status_code=404, detail="Order not found")
        
        items = []
        order_info = None
        
        for row in order_data:
            if order_info is None:
                # Verify client ID if provided (authorization check)
                if clientId and row[1] != clientId:
                    raise HTTPException(status_code=403, detail="Access denied")
                
                order_info = {
                    "orderId": str(row[0]),  # Convert to string for BigInt safety
                    "clientId": str(row[1]),  # Convert to string for BigInt safety
                    "clientName": row[2],
                    "orderDate": row[3].isoformat() if row[3] else None,
                    "totalAmount": 0.0,
                    "status": random.choice(order_statuses)
                }
            
            order_info["totalAmount"] += float(row[4]) if row[4] else 0.0
            
            # Generate product name from FamilyLevel1 + FamilyLevel2
            product_name = f"{row[6]} {row[7]}" if row[6] and row[7] else (row[6] or row[7] or "Unknown Product")
            
            items.append({
                "productId": str(row[5]),  # Convert to string for BigInt safety
                "productName": product_name,
                "productImage": f"https://picsum.photos/seed/p-{row[5]}/400/500",
                "category": row[8],
                "storeId": str(row[9]),  # Convert to string for BigInt safety
                "storeName": row[10],
                "quantity": row[11],
                "unitPrice": float(row[12]) if row[12] else 0.0
            })
        
        return OrderResponse(
            code=200,
            data={
                **order_info,
                "items": items
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == '__main__':
    import uvicorn
    
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '8000'))
    
    uvicorn.run(app, host=host, port=port)