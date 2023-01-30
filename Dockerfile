# stage one: buliding the app
FROM node:16.15.1-alpine
WORKDIR /usr/src/app

COPY package*.json ./
COPY . .
RUN npm install
RUN npm run build

# stage two: running the app

FROM node:16.15.1-alpine
WORKDIR /usr/src/app

COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

RUN NODE_ENV=$NODE_ENV npm install

COPY --from=0 /usr/src/app/dist ./dist
RUN mkdir ./imgs
CMD npm start