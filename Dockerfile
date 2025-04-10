FROM node:23.11.0-alpine AS base
USER root
WORKDIR /app
# copy all dpendecies
COPY package.json nodemon.json tsconfig.json ./
RUN apk add curl
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true
# RUN apk add ghostscript -l
COPY ./src ./src
COPY ./public ./public
COPY ./package.json ./package.json
COPY ./tsconfig.json ./tsconfig.json
COPY ./webpack.config.js ./webpack.config.js

RUN yarn global add typescript
RUN yarn install --network-timeout=60000

FROM base AS production
RUN echo "This is production env"
ENV NODE_ENV=production
RUN yarn build
CMD [ "yarn", "start" ]


FROM base AS staging
# RUN yarn build
RUN echo "This is staging env"
ENV NODE_ENV=staging
CMD [ "yarn", "start" ]



FROM base AS dev
ENV NODE_ENV=development
CMD [ "yarn", "dev" ]
