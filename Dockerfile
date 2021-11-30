FROM node:16.13-alpine

RUN apk add --no-cache tini

EXPOSE 5000
RUN mkdir /app && mkdir /dash-data
ENV DASH_DIR=/dash-data
WORKDIR /app
COPY index.js .
COPY package*.json .
COPY public/ public/
COPY libs/ libs/
RUN npm ci --production

ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "node", "/app/index.js" ]