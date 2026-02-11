import torch
import torch.nn as nn
from typing import List
import numpy as np

class CoarseRanking:

    def __init__(self, feature_dim: int, hidden_dim: int = 64):
        """
        Initialize coarse ranking model.
        Args:
            feature_dim: Input feature dimension
            hidden_dim: Hidden layer dimension
        """

        self.model = nn.Sequential(
            nn.Linear(feature_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def predict(self, features: torch.Tensor) -> np.ndarray:
        """
        Predict scores for candidates.
        Args:
            features: Input features [num_candidates, feature_dim]
        Returns:
            Predicted scores [num_candidates]
        """

        self.model.eval()
        with torch.no_grad():
            scores = self.model(features).squeeze()
        return scores.cpu().numpy()

    def rank(self, candidate_ids: List[int], features: torch.Tensor, top_k: int = 500) -> List[int]:
        """
        Rank candidates and return top-K.
        Args:
            candidate_ids: List of candidate item IDs
            features: Features for all candidates [num_candidates, feature_dim]
            top_k: Number of items to keep
        Returns:
            Top-K candidate IDs after coarse ranking
        """
        scores = self.predict(features)

        # Sort by score descending
        ranked_indices = np.argsort(scores)[::-1][:top_k]

        return [candidate_ids[i] for i in ranked_indices]
