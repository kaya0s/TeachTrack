# TeachTrack

TeachTrack is a Classroom Behavior Detection System designed to help educators monitor student engagement and behavior in real-time. By leveraging machine learning and computer vision, it provides actionable insights through engagement scores, real-time alerts, and comprehensive session summaries.

## Repository Structure

This is a multi-workspace repository organized as follows:

- **[admin/](./admin)**: A Next.js-based administration portal for managing colleges, majors, subjects, teachers, and system-wide monitoring.
- **[client/](./client)**: A Flutter mobile and web application used by teachers to conduct sessions, monitor real-time engagement, and review past session metrics.
- **[server/](./server)**: The core FastAPI backend providing RESTful APIs for authentication, classroom management, and real-time data processing.
- **[server/ml_engine/](./server/ml_engine)**: The machine learning component containing the YOLOv8-based detection logic and pre-trained weights for behavior analysis.
- **[docs-site/](./docs-site)**: A dedicated documentation site built with Next.js for project guidelines, setup instructions, and operational manuals.
- **[notebooks/](./notebooks)**: Jupyter notebooks used during the research phase for data exploration, model training experiments, and behavior analysis validation.

## Tech Stack

The system is built using modern technologies focused on high performance and scalability:

- **AI/ML Engine**: YOLOv8 (Ultralytics) for real-time object detection and behavioral classification.
- **Backend API**: FastAPI (Python) with SQLAlchemy (MySQL) for high-concurrency data management.
- **Admin Portal**: Next.js (React) with Tailwind CSS for a responsive, modern management interface.
- **Teacher Client**: Flutter (Dart) for consistent performance across mobile and web platforms.
- **Database**: MySQL for structured storage of academic data and behavior logs.
- **Media Hosting**: Cloudinary integration for handling subject covers and profile images.

## Core Features

- **Real-time Detection**: Automatic classification of student behaviors (On-task, Sleeping, Phone Usage, etc.).
- **Engagement Scoring**: Proprietary weighted algorithms for calculating individual and class-wide engagement percentages.
- **Administrative Hub**: Granular control over the academic hierarchy, teacher assignments, and system-wide audit logging.
- **Session Summaries**: Visual analytics and historical rollups of engagement trends over time.

---

*This project was developed as a Capstone Project.*
