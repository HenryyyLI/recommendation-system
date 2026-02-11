import pickle
from typing import List


class GlobalPopular:

    def __init__(self):
        """
        Initialize global popularity recall.
        """

        self.popular_items = []

    def load_from_pkl(self, path: str):
        """
        Load popular items from pickle file.
        Args:
            path: Path to pickle file
        """
        
        with open(path, 'rb') as f:
            self.popular_items = pickle.load(f)

    def recall(self, top_k: int = 200) -> List[int]:
        """
        Recall top-K popular items.
        Args:
            top_k: Number of items to recall
        Returns:
            List of popular item IDs
        """

        return [item_id for item_id, score in self.popular_items[:top_k]]
