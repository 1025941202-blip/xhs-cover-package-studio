FROM node:22-slim

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

ENV APP_MODE=web
ENV HOST=0.0.0.0
EXPOSE 4175

CMD ["npm", "run", "start:web"]
