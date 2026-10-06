FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files
COPY . .

EXPOSE 5050

ENV NODE_ENV=production
ENV PORT=5050

CMD ["node", "src/index.js"]
