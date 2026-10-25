FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 3000
# Создаёт таблицы и демо-данные при первом запуске (повторно ничего не перезаписывает), затем запускает сервер
CMD ["sh", "-c", "node scripts/init-db.js && node server.js"]
