FROM node:18.16.1-alpine as base
USER root
WORKDIR /app
# copy all dpendecies
COPY package.json nodemon.json tsconfig.json ./
RUN apk add curl
RUN apk add --no-cache \
    udev \
    ttf-freefont \
    chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN yarn global add typescript
RUN yarn install --network-timeout=60000
# copy source code
COPY ./src ./src

FROM base as prod
# RUN yarn build
RUN echo "This is production env"
ENV NODE_ENV=production
CMD [ "yarn", "start" ]


FROM base as staging
# RUN yarn build
RUN echo "This is staging env"
ENV NODE_ENV=staging
CMD [ "yarn", "start" ]



FROM base as dev
ENV NODE_ENV=development
CMD [ "yarn", "dev" ]
