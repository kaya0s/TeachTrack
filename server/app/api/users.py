
from typing import Any
from fastapi import APIRouter, Depends
from app.api import deps
from app.schemas.user import User

router = APIRouter()

@router.get("/me", response_model=User)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
