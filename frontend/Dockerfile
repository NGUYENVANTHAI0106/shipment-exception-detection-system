FROM node:20-alpine

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY app /app/app
COPY next.config.js /app/next.config.js
COPY tailwind.config.js /app/tailwind.config.js
COPY postcss.config.js /app/postcss.config.js

EXPOSE 3000

RUN npm run build

CMD ["npm", "run", "start"]
