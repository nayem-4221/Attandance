# Docker instructions

Build the Docker image:

```powershell
docker build -t team-attendance-app .
```

Run with Docker:

```powershell
docker run --rm -p 4221:4221 -e PORT=4221 team-attendance-app
```

Or use Docker Compose:

```powershell
docker compose up --build -d
```

The app listens on port `4221` inside the container and is mapped to `4221` on the host.
