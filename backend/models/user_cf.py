import pickle
import psycopg2
from typing import List, Dict


class UserCF:

    def __init__(self, db_config: Dict[str, str]):
        """
        Initialize UserCF recommender.
        Args:
            db_config: Database connection configuration dictionary
        """

        self.db_config = db_config
        self.user_similarity = {}

    def load_from_pkl(self, path: str):
        """
        Load user similarity from pickle file.
        Args:
            path: Path to pickle file
        """
        
        with open(path, 'rb') as f:
            self.user_similarity = pickle.load(f)

    def recall(self, user_id: int, user_purchased_items: List[int], top_k: int = 200) -> List[int]:
        """
        Recall candidate items based on similar users' purchases.
        Args:
            user_id: Target user ID
            user_purchased_items: List of item IDs target user has purchased
            top_k: Number of candidate items to recall
        Returns:
            List of recommended item IDs ranked by aggregated similarity score
        """

        if user_id not in self.user_similarity:
            return []

        # Load similar users' purchases from database
        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cursor:
                    similar_user_ids = [user_b for user_b, _, _ in self.user_similarity[user_id]]

                    cursor.execute("""
                    SELECT "ClientID", "ProductID", "PurchaseCount"
                    FROM user_item_interactions
                    WHERE "ClientID" = ANY(%s)
                    """, (similar_user_ids,))

                    interactions = cursor.fetchall()
        except Exception as e:
            print(f"Error loading similar users' purchases: {e}")
            return []

        # Aggregate similarity scores from similar users
        candidate_scores = {}
        user_sim_dict = {user_b: sim for user_b, sim, _ in self.user_similarity[user_id]}

        for similar_user, item_id, count in interactions:
            # Skip items user already purchased
            if item_id in user_purchased_items:
                continue

            # Accumulate similarity scores
            if item_id not in candidate_scores:
                candidate_scores[item_id] = 0
            candidate_scores[item_id] += user_sim_dict[similar_user]

        # Sort candidates by score
        candidates = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)
        return [item_id for item_id, score in candidates[:top_k]]
