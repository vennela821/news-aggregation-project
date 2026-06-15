# Frontend

This is a simple static frontend for the Student News Desk project.

## Run locally

1. Open a terminal in `c:\Users\venne\Documents\sem_project\frontend`
2. Run `npm install`
3. Run `npm start`
4. Open `http://localhost:8001`

## Notes

- The frontend expects the backend API at `http://localhost:8081/api`
- The static dev server is configured to run on port **8001** (see `package.json`).
- The backend base URL can be derived from the current host. When the page is served from `127.0.0.1` the frontend talks to `127.0.0.1:8081`, otherwise it talks to `localhost:8081`.
- If you prefer not to use npm, you can also open `index.html` directly in a browser or use another static server.
