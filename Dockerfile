# syntax=docker/dockerfile:1

FROM node:16.19.1
WORKDIR /app
COPY . .
RUN npm run init && npm run build
CMD npm run start