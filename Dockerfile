FROM node:16

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent
COPY . ./

CMD ["node", "app.js"]