"""
CAPSTONE FastAPI Project

This is the initial setup for our CAPSTONE backend using FastAPI.
It includes a simple root endpoint as a starting point for further development.

Author: kaya0s
"""

from fastapi import FastAPI

# Initialize FastAPI app
app = FastAPI(
    title="CAPSTONE Backend",
    description="FastAPI backend setup for CAPSTONE project",
    version="0.1.0"
)

@app.get("/")
def read_root():
    """
    Root endpoint.

    Returns:
        dict: A welcome message confirming the API is running.
    """
    return {"message": "Hello, FastAPI!"}

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
