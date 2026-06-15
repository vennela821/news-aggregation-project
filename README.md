# News Aggregator Project

News Aggregator is a student news portal with:

- Static HTML/CSS/JS frontend in `frontend/`
- Node.js Express backend in `server/`
- MongoDB database through Mongoose
- Render Docker deployment from the repo root

## Local Backend

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/newsdb
JWT_SECRET=change-this-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

Then run:

```bash
npm install
npm start
```

Backend and hosted frontend run at:

```text
http://localhost:8081
```

Health check:

```text
http://localhost:8081/api/health
```

## Local Frontend Only

For the old static frontend server:

```bash
cd frontend
npm install
npm start
```

Open:

```text
http://127.0.0.1:8001/index.html
```

When opened on port `8001`, the frontend calls the backend at `http://127.0.0.1:8081/api`.
When deployed on Render, it automatically calls the same Render domain.

## Render Deployment

This repo includes:

- `Dockerfile`
- `.dockerignore`
- `render.yaml`

Render environment variables needed:

```text
MONGODB_URI
JWT_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
```

Use the repo root as the deploy root. The Docker service starts with:

```bash
npm start
```

Student articles are saved as `PENDING`. Admins approve/reject from the Admin page. Only `APPROVED` articles appear on the public dashboard.
