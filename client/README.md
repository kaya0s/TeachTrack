# TeachTrack Flutter Client

A premium, scalable Flutter application built with Clean Architecture for the Classroom Behavior Detection System.

## 🏗️ Architecture

This project follows a feature-first folder structure, separating concerns into:

- **Core**: Contains global configurations, API clients, themes, and shared widgets.
- **Data**: Contains models and repositories for data fetching and persistence.
- **Features**: Contains UI components and state management (Providers) for specific business features (Auth, Dashboard, etc.).

### Key Decisions:
1. **Dio & Interceptors**: Used for HTTP requests with automatic JWT token attachment in every protected request.
2. **Dependency Injection**: Powered by `GetIt` for decoupling components and improving testability.
3. **State Management**: Using `Provider` for clean, reactive state handling.
4. **Secure Storage**: Sensitive data like access tokens are stored securely using `flutter_secure_storage`.
5. **Dynamic Networking**: Automatically adjusts the base URL for different environments (Android Emulator vs. iOS/Physical).

## 🌐 Networking & Base URL

To support seamless development across devices, the application uses an environment-based configuration.

### Configuration (`.env` file)
```ini
BASE_URL=http://127.0.0.1:8000
API_VERSION=/api/v1
```

### Emulator / Physical Device Handling:
The `EnvConfig` class automatically detects if the app is running on an Android Emulator:
- **Android Emulator**: `127.0.0.1` is automatically replaced with `10.0.2.2`.
- **iOS Simulator**: Uses `127.0.0.1`.
- **Physical Device**: You should update `.env` with your machine's local IP (e.g., `192.168.1.10`).

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   flutter pub get
   ```
2. **Setup Environment**: Ensure `.env` exists in the root of the `client` folder.
3. **Run the App**:
   ```bash
   flutter run
   ```
