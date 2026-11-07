# Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=compilacion /app/node_modules ./node_modules
COPY --from=compilacion /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/servidor.js"]
