# syntax=docker/dockerfile:1
FROM node:16.19.1 as base

WORKDIR /app

COPY . .

FROM base as local
RUN npm run init && npm run build:local
CMD npm run start

FROM base as prod
RUN npm run init && npm run build
CMD npm run start