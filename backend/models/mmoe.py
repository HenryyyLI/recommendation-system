import torch
import torch.nn as nn
from typing import Tuple
import numpy as np

class Expert(nn.Module):

    def __init__(self, input_dim: int, hidden_dim: int = 128):
        """
        Initialize expert network.

        Args:
            input_dim: Input feature dimension
            hidden_dim: Hidden layer dimension
        """

        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class Gate(nn.Module):

    def __init__(self, input_dim: int, num_experts: int):
        """
        Initialize gate network.
        Args:
            input_dim: Input feature dimension
            num_experts: Number of experts
        """

        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, num_experts),
            nn.Softmax(dim=1)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class Tower(nn.Module):

    def __init__(self, input_dim: int, task_type: str = 'binary'):
        """
        Initialize tower network.
        Args:
            input_dim: Input dimension from experts
            task_type: Task type ('binary' or 'regression')
        """

        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid() if task_type == 'binary' else nn.Identity()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class MMOE(nn.Module):

    def __init__(self, input_dim: int, num_experts: int = 4, hidden_dim: int = 128):
        """
        Initialize MMOE model.
        Args:
            input_dim: Input feature dimension
            num_experts: Number of expert networks
            hidden_dim: Hidden dimension for experts
        """

        super().__init__()

        self.experts = nn.ModuleList([Expert(input_dim, hidden_dim) for _ in range(num_experts)])
        self.gate_purchase = Gate(input_dim, num_experts)
        self.gate_gmv = Gate(input_dim, num_experts)
        self.tower_purchase = Tower(hidden_dim, 'binary')
        self.tower_gmv = Tower(hidden_dim, 'regression')

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass through MMOE.
        Args:
            x: Input features [batch_size, input_dim]
        Returns:
            Tuple of (purchase_prob, gmv_pred) [batch_size, 1] each
        """

        expert_outputs = torch.stack([expert(x) for expert in self.experts], dim=1)

        gate_weights_purchase = self.gate_purchase(x).unsqueeze(2)
        purchase_input = (expert_outputs * gate_weights_purchase).sum(dim=1)
        purchase_prob = self.tower_purchase(purchase_input)

        gate_weights_gmv = self.gate_gmv(x).unsqueeze(2)
        gmv_input = (expert_outputs * gate_weights_gmv).sum(dim=1)
        gmv_pred = self.tower_gmv(gmv_input)

        return purchase_prob, gmv_pred

    def predict(self, features: torch.Tensor) -> Tuple[np.ndarray, np.ndarray]:
        """
        Predict scores for candidates.
        Args:
            features: Input features [num_candidates, input_dim]
        Returns:
            Tuple of (purchase_probs, gmv_preds) [num_candidates] each
        """

        self.eval()
        with torch.no_grad():
            purchase_prob, gmv_pred = self.forward(features)
        return purchase_prob.squeeze().cpu().numpy(), gmv_pred.squeeze().cpu().numpy()
