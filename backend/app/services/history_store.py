import os
import json
from typing import List, Dict, Optional
from app.models.schemas import PipelineExecutionResponse

class HistoryStoreService:
    """Manages experiment history storage and retrieval."""

    def __init__(self):
        self._history: Dict[str, PipelineExecutionResponse] = {}

    def save_execution(self, response: PipelineExecutionResponse):
        self._history[response.query_id] = response

    def get_execution(self, query_id: str) -> Optional[PipelineExecutionResponse]:
        return self._history.get(query_id)

    def list_history(self) -> List[PipelineExecutionResponse]:
        # Return sorted by timestamp descending
        items = list(self._history.values())
        items.sort(key=lambda x: x.timestamp, reverse=True)
        return items

history_store = HistoryStoreService()
