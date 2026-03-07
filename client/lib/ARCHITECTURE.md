# Client Architecture

This Flutter client follows a feature-first layered architecture:

- `app/`: app composition and entry wiring (`bootstrap`, router, app shell widgets).
- `core/`: cross-cutting technical concerns (network, DI, config, theme, platform services).
- `features/`: business modules, each organized into:
  - `presentation/`: screens, UI state (`ChangeNotifier` providers), and UI-only widgets.
  - `domain/`: feature entities and domain-level models.
  - `data/`: repositories and remote/local data access implementation.

## Folder Layout

```text
lib/
  main.dart
  app/
    app.dart
    bootstrap.dart
    navigation/
      app_router.dart
    widgets/
      splash_gate.dart
      foreground_task_listener.dart
  core/
    config/
    di/
    network/
    services/
    theme/
  features/
    auth/
      data/repositories/
      domain/models/
      presentation/providers/
      presentation/screens/
      presentation/widgets/
    classroom/
      data/repositories/
      domain/models/
      presentation/providers/
      presentation/screens/
    dashboard/
      presentation/screens/
    notifications/
      data/repositories/
      domain/models/
      presentation/providers/
      presentation/screens/
    session/
      data/repositories/
      presentation/providers/
      presentation/screens/
```

## Dependency Direction

- `presentation -> domain + data abstraction layer (repositories)`
- `data -> core/network + domain models`
- `core` must not depend on feature presentation.

## Team Rules

1. Keep imports package-based (`package:teachtrack/...`) to avoid fragile relative paths.
2. New feature code goes under `features/<feature>/presentation|domain|data`.
3. Put shared technical utilities in `core/`, not in feature folders.
4. Keep UI widgets dumb where possible; business logic belongs in providers/use-cases.
5. Register only data/repository/service dependencies in `core/di/injection.dart`.
