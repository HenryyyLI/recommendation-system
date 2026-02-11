from typing import List, Dict
import psycopg2

class Reranking:

    def __init__(self, db_config: Dict[str, str]):
        """
        Initialize reranking module.

        Args:
            db_config: Database connection configuration
        """

        self.db_config = db_config
        self.product_stocks = {}
        self.country_stocks = {}

    def load_stock_data(self):
        """
        Load stock information from database.
        """

        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    # Load total stock per product
                    cursor.execute("""
                    SELECT "ProductID", "TotalStockQuantity"
                    FROM products
                    WHERE "TotalStockQuantity" > 0
                    """)
                    self.product_stocks = {product_id: stock for product_id, stock in cursor.fetchall()}

                    # Load country-specific stock
                    cursor.execute("""
                    SELECT "ProductID", "StoreCountry", "Quantity"
                    FROM stocks
                    WHERE "Quantity" > 0
                    """)
                    for product_id, country, quantity in cursor.fetchall():
                        if product_id not in self.country_stocks:
                            self.country_stocks[product_id] = {}
                        self.country_stocks[product_id][country] = quantity

                    print("Stock data loaded successfully!")
        except Exception as e:
            print(f"Error loading stock data: {e}")

    def rerank(self, candidate_ids: List[int], scores: List[float],
               user_country: str, stock_weight: float = 0.3,
               country_weight: float = 0.4) -> List[int]:
        """
        Rerank candidates based on stock availability and country preference.
        Args:
            candidate_ids: List of candidate item IDs
            scores: Original ranking scores for each candidate
            user_country: User's country code
            stock_weight: Weight for total stock quantity
            country_weight: Weight for country-specific stock
        Returns:
            Reranked list of item IDs
        """

        reranked_items = []

        for idx, item_id in enumerate(candidate_ids):
            original_score = scores[idx]

            # Stock boost
            stock_boost = 0.0
            if item_id in self.product_stocks:
                total_stock = self.product_stocks[item_id]
                stock_boost = min(total_stock / 100.0, 1.0) * stock_weight

            # Country stock boost
            country_boost = 0.0
            if item_id in self.country_stocks and user_country in self.country_stocks[item_id]:
                country_stock = self.country_stocks[item_id][user_country]
                country_boost = min(country_stock / 50.0, 1.0) * country_weight

            # Combined score
            final_score = original_score + stock_boost + country_boost

            reranked_items.append((item_id, final_score))

        # Sort by final score descending
        reranked_items.sort(key=lambda x: x[1], reverse=True)

        return [item_id for item_id, score in reranked_items]