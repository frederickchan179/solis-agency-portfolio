FROM node:26.8.2-alpine AS build
WORKDIR /app
# Node 25+ images no longer ship corepack; it reads the pnpm version from packageManager
RUN npm install -g corepack && corepack enable

# The prepare script chmods .husky/*, so the hooks folder must exist; HUSKY=0 skips installing them
ENV HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .husky .husky
RUN pnpm install --frozen-lockfile

COPY . .
ARG SITE_URL=https://solis-agency.fredchan.dev
ENV SITE_URL=$SITE_URL
RUN pnpm build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
