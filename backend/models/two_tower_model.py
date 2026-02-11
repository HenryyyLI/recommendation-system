import numpy as np
import torch
import torch.nn as nn
from typing import List

class TwoTowerRecall:

    def __init__(self, user_feature_dim: int, item_feature_dim: int, embedding_dim: int = 64):
        """
        Initialize two-tower model.
        Args:
            user_feature_dim: Dimension of user features
            item_feature_dim: Dimension of item features
            embedding_dim: Output embedding dimension (default: 64)
        """

        self.embedding_dim = embedding_dim
        self.user_tower = self._build_tower(user_feature_dim, embedding_dim)
        self.item_tower = self._build_tower(item_feature_dim, embedding_dim)

    def _build_tower(self, input_dim: int, output_dim: int) -> nn.Module:
        """
        Build tower network.
        Args:
            input_dim: Input feature dimension
            output_dim: Output embedding dimension
        Returns:
            Neural network tower
        """

        return nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Linear(128, output_dim)
        )

    def encode_users(self, user_features: torch.Tensor) -> np.ndarray:
        """
        Encode users into embeddings.
        Args:
            user_features: User features [num_users, user_feature_dim]
        Returns:
            User embeddings [num_users, embedding_dim]
        """

        self.user_tower.eval()
        with torch.no_grad():
            user_emb = self.user_tower(user_features)
            user_emb = torch.nn.functional.normalize(user_emb, p=2, dim=1)
        return user_emb.cpu().numpy()

    def recall(self, user_embedding: np.ndarray, item_embeddings: np.ndarray, top_k: int = 500) -> List[int]:
        """
        Recall top-K items for user.
        Args:
            user_embedding: User embedding vector [embedding_dim]
            item_embeddings: All item embeddings [num_items, embedding_dim]
            top_k: Number of items to recall
        Returns:
            List of top-K item indices
        """

        similarities = np.dot(item_embeddings, user_embedding)
        top_k_indices = np.argsort(similarities)[-top_k:][::-1]
        return top_k_indices.tolist()