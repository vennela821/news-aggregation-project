FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY frontend ./frontend

ENV NODE_ENV=production
EXPOSE 10000

CMD ["npm", "start"]
