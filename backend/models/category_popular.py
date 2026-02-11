import pickle
from typing import List


class CategoryPopular:

    def __init__(self):
        """
        Initialize category popularity recall.
        """

        self.category_items = {}

    def load_from_pkl(self, path: str):
        """
        Load popular items per category from pickle file.
        Args:
            path: Path to pickle file
        """
        
        with open(path, 'rb') as f:
            self.category_items = pickle.load(f)

    def recall(self, user_categories: List[str], top_k: int = 200) -> List[int]:
        """
        Recall popular items from user's preferred categories.
        Args:
            user_categories: List of user's preferred categories (e.g., top 3)
            top_k: Number of items to recall
        Returns:
            List of popular item IDs across user's categories
        """

        candidates = []
        items_per_category = top_k // len(user_categories) if user_categories else 0

        for category in user_categories:
            if category not in self.category_items:
                continue

            category_items = self.category_items[category][:items_per_category]
            candidates.extend([item_id for item_id, score in category_items])

        return candidates[:top_k]
