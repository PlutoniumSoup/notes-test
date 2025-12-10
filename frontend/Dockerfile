FROM node:20-slim

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json ./

RUN yarn install

COPY . .

EXPOSE 5173
CMD ["yarn", "run", "dev", "--", "--host", "0.0.0.0"]
