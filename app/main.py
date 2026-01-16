from fastapi import FastAPI
from app.api import auth, users, classroom, session
from app.core.config import settings
from app.db.database import Base, engine

# Create the database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI backend setup for CAPSTONE project",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(classroom.router, prefix=f"{settings.API_V1_STR}/classroom", tags=["classroom"])
app.include_router(session.router, prefix=f"{settings.API_V1_STR}/sessions", tags=["sessions"])

@app.get("/")
def read_root():
    """
    Root endpoint.

    Returns:
        dict: A welcome message confirming the API is running.
    """
    return {"message": "Hello, FastAPI! Auth is ready."}

@app.get("/intro")
def project_intro():
    """
    CAPSTONE introduction endpoint.

    Returns:
        dict: Basic information about the CAPSTONE project and API.
    """
    return {
        "project": "CAPSTONE",
        "description": "This API is the starting point for the CAPSTONE object detection project using FastAPI and Python 3.10",
        "status": "Setup complete"
    }
