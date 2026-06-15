# Gateway

For this beginner-friendly setup, the frontend calls the backend directly:

- Backend API: `http://localhost:8080/api`
- Frontend: open `../frontend/index.html` or serve it on port `5500`

If your college requires a separate gateway service, create a Spring Cloud Gateway app here and route:

- `/api/**` -> `http://localhost:8080`
- `/` -> frontend static files

This folder is kept so your project structure stays:

- `backend`
- `frontend`
- `gateway`
