# TeachTrack (Capstone Project)

A FastAPI-based backend for a Classroom Behavior Detection System. This system manages teachers, classrooms, sessions, and tracks student engagement using machine learning data.

## 🛠️ Tech Stack
- **Framework:** FastAPI
- **Database:** MySQL (via SQLAlchemy)
- **Authentication:** OAuth2 with Password Flow (JWT)
- **Configuration:** Pydantic Settings + Dotenv

## ⚠️ Model Status
**The YOLOv8 model (`best.pt`) is currently untrained.**
- The system expects a trained model at `ml_engine/weights/best.pt`.
- You will need to train a YOLOv8 model on a classroom dataset and place the weights file in that directory for the detection script to work.

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- MySQL Server running locally or remotely

### 2. Installation

**Using Conda (Recommended)**

1. Create the environment using the provided YML file:
   ```bash
   conda env create -f environment.yml
   ```
2. Activate the environment:
   ```bash
   conda activate capstone
   ```
3. Install the specific project dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Configuration (.env)

This project uses environment variables for configuration. 
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your details:
   ```ini
   SECRET_KEY=your_secure_secret_key
   SQLALCHEMY_DATABASE_URL=mysql+pymysql://user:password@localhost/capstone_db
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

### 4. Database Setup
Make sure your MySQL server is running and create the database:
```sql
CREATE DATABASE capstone_db;
```
The application will automatically create tables on startup.

### 5. Running the Server

Start the live server with hot-reload enabled:
```bash
uvicorn app.main:app --reload
```

## 📚 API Documentation
Once the server is running, you can explore the API using the interactive documentation:

- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

