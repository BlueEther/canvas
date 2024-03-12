# Canvas

## Running via Docker Compose

1. Run `npm run build:all`
2. Run `npm run build:docker`
3. Run `docker compose run --rm canvas npx prisma migrate deploy`
4. (optional) Load default palette colors
   Run `docker compose run --rm canvas npm run -w packages/server prisma:seed:palette`
5. Run `docker compose up -d`
