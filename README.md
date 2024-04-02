# Canvas

## Running via Docker Compose

1. Run `docker compose build`
2. (optional) Load default palette colors
   Run `docker compose run --rm canvas npm run -w packages/server prisma:seed:palette`
3. Run `docker compose up -d`
