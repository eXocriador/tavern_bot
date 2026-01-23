FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn workspace tavern-bot-backend build
RUN yarn workspace tavern-bot-telegram build

FROM base AS backend
WORKDIR /app
RUN yarn workspace tavern-bot-backend build
RUN apk add --no-cache curl
EXPOSE 3333
CMD ["yarn", "workspace", "tavern-bot-backend", "start"]

FROM base AS frontend
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN yarn workspace tavern-bot-frontend build
FROM nginx:alpine
COPY --from=frontend /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM base AS telegram-bot
WORKDIR /app
RUN yarn workspace tavern-bot-telegram build
CMD ["yarn", "workspace", "tavern-bot-telegram", "start"]
