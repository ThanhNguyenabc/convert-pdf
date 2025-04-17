FROM  node:23.11.0-slim AS base

RUN apt-get update && apt-get install -y \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  libgbm-dev \
  && apt-get clean && rm -rf /var/lib/apt/lists/*


USER root
WORKDIR /app

# copy all dpendecies
COPY package.json nodemon.json tsconfig.json ./

RUN yarn global add typescript \
    && yarn install --frozen-lockfile --network-timeout=60000 \
    && yarn cache clean

COPY . .

FROM base AS production
RUN echo "This is production env"
ENV NODE_ENV=production
RUN yarn build
CMD [ "yarn", "start" ]


FROM base AS staging
RUN echo "This is staging env"
ENV NODE_ENV=staging
CMD [ "yarn", "start" ]


FROM base AS dev
ENV NODE_ENV=development
CMD [ "yarn", "dev" ]
