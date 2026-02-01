# TeachTrack (Capstone Project)

TeachTrack is a **Classroom Behavior Detection System** designed to help educators monitor student engagement and behavior in real-time using machine learning.

## 📁 Project Structure

This repository is organized into the following main directories:

- **[`client/`](./client)**: A Flutter-based mobile/web application providing a user interface for teachers to monitor sessions and view engagement metrics.
- **[`server/`](./server)**: A FastAPI-based backend that manages the database, user authentication, and processes real-time engagement data.
- **[`ml_engine/`](./server/ml_engine)**: (Inside server) Contains the YOLOv8-based logic for classroom behavior detection.
- **[`notebooks/`](./notebooks)**: Jupyter notebooks used for data analysis, experimentation, and model training.
- **[`docker/`](./docker)**: Docker configuration files for containerized deployment.


## 🛠️ Tech Stack

- **Frontend:** Flutter (Dart)
- **Backend:** FastAPI (Python)
- **ML Model:** YOLOv8
- **Database:** MySQL
- **Containerization:** Docker

---

*This project is part of a Capstone Project.*
