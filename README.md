# News Aggregator Project

This project has a Spring Boot backend and a simple frontend.

## Run Backend

```bash
cd backend
mvn spring-boot:run
```

Backend starts at:

```text
http://localhost:8080
```

Useful endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/articles`
- `POST /api/articles`

## Run Frontend

Open:

```text
frontend/index.html
```

Or use VS Code Live Server on port `5500`.

## Database

The backend uses H2 in-memory database.

H2 console:

```text
http://localhost:8080/h2-console
```

JDBC URL:

```text
jdbc:h2:mem:newsdb
```
