# this file needs to be copied to /build

FROM node:20-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node . /home/node/app/
USER node
RUN npm install --omit=dev
RUN npx prisma generate

ENV PORT 3000
ENV NODE_ENV production
ENV SERVE_CLIENT /home/node/app/packages/client
ENV SERVE_ADMIN /home/node/app/packages/admin

EXPOSE 3000
CMD [ "npm", "-w", "packages/server", "start" ]