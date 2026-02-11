import pickle
from typing import List, Dict


class ItemCF:

    def __init__(self):
        """
        Initialize ItemCF recommender.
        """

        self.item_similarity = {}

    def load_from_pkl(self, path: str):
        """
        Load item similarity from pickle file.
        Args:
            path: Path to pickle file
        """
        
        with open(path, 'rb') as f:
            self.item_similarity = pickle.load(f)

    def recall(self, user_purchased_items: List[int], top_k: int = 300) -> List[int]:
        """
        Recall candidate items based on user purchase history.
        Args:
            user_purchased_items: List of product IDs user has purchased
            top_k: Number of candidate items to recall
        Returns:
            List of recommended product IDs ranked by aggregated similarity score
        """

        # Aggregate similarity scores from purchased items
        candidate_scores = {}

        for item_id in user_purchased_items:
            if item_id not in self.item_similarity:
                continue

            for similar_item, similarity in self.item_similarity[item_id]:
                # Skip items user already purchased
                if similar_item in user_purchased_items:
                    continue

                # Accumulate similarity scores
                if similar_item not in candidate_scores:
                    candidate_scores[similar_item] = 0
                candidate_scores[similar_item] += similarity

        # Sort candidates by score
        candidates = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)
        return [item_id for item_id, score in candidates[:top_k]]