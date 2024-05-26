FROM node:20-alpine AS base

# to be able to read git hash
RUN apk -U upgrade && apk add --no-cache git openssh
RUN git config --global --add safe.directory /home/node/app

FROM base as dev_dep
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

# --- dependencies ---
COPY --chown=node:node package*.json ./
COPY --chown=node:node packages/admin/package*.json ./packages/admin/
COPY --chown=node:node packages/client/package*.json ./packages/client/
COPY --chown=node:node packages/lib/package*.json ./packages/lib/
COPY --chown=node:node packages/server/package*.json ./packages/server/

USER node
RUN npm install --include=dev

FROM base as dep
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

# --- dependencies ---
COPY --chown=node:node package*.json ./
COPY --chown=node:node packages/admin/package*.json ./packages/admin/
COPY --chown=node:node packages/client/package*.json ./packages/client/
COPY --chown=node:node packages/lib/package*.json ./packages/lib/
COPY --chown=node:node packages/server/package*.json ./packages/server/

USER node
RUN npm install --omit=dev

#
# === BUILDER ===
#

FROM base as build
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY --from=dev_dep --chown=node:node /home/node/app/ ./
COPY --chown=node:node . .

# --- build lib ---

RUN npm -w packages/lib run build
# janky? fix to keep imports in dev
RUN sed -i -e 's/"main": ".*"/"main": ".\/dist\/index.js"/' packages/lib/package.json

# --- build main client ---

RUN npm -w packages/client run build

# --- build admin ---

RUN npm -w packages/admin run build

# --- build server ---

RUN npx -w packages/server prisma generate
RUN npm -w packages/server run build

#
# === RUNNER ===
#

FROM base as run
WORKDIR /home/node/app
COPY --from=dep /home/node/app/ ./
COPY package*.json docker-start.sh .git ./

# --- prepare lib ---

RUN mkdir -p packages/lib
COPY --from=build /home/node/app/packages/lib/package.json ./packages/lib
COPY --from=build /home/node/app/packages/lib/dist ./packages/lib/dist

# --- prepare client ---

RUN mkdir -p packages/client
COPY --from=build /home/node/app/packages/client/dist ./packages/client/

# --- prepare admin ---

RUN mkdir -p packages/admin
COPY --from=build /home/node/app/packages/admin/dist ./packages/admin/

# --- prepare server ---

RUN mkdir -p packages/server
COPY --from=build /home/node/app/packages/server/package.json ./packages/server/
COPY --from=build /home/node/app/packages/server/prisma ./packages/server/prisma
COPY --from=build /home/node/app/packages/server/tool.sh ./packages/server/
COPY --from=build /home/node/app/packages/server/dist ./packages/server/dist

# --- finalize ---

RUN npx -w packages/server prisma generate

# set runtime env variables

ENV PORT 3000
ENV NODE_ENV production
ENV SERVE_CLIENT /home/node/app/packages/client
ENV SERVE_ADMIN /home/node/app/packages/admin

EXPOSE 3000
ENTRYPOINT [ "/bin/sh" ]
CMD [ "./docker-start.sh" ]