"""
The interface every risk model — mock or trained — must implement.

app.py depends on this interface, not on any concrete model, so swapping the
dummy model for a real one trained on the eventual dataset is a one-line
change (see get_model() in app.py). No disease-specific logic belongs here.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class RiskModel(ABC):
    @abstractmethod
    def predict_proba(self, features: dict[str, Any]) -> float:
        """Return a calibrated risk probability in [0, 1] for one assessment's features."""

    @abstractmethod
    def explain(self, features: dict[str, Any]) -> list[tuple[str, float]]:
        """Return (feature_name, impact) pairs behind the score, most important first."""

    def predict(self, features: dict[str, Any], threshold: float = 0.5) -> bool:
        """Binary decision built on predict_proba(). Override if a model needs
        a different rule (e.g. a learned threshold)."""
        return self.predict_proba(features) >= threshold
