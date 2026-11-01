FROM node:22-alpine AS build

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY services ./services
RUN npm ci

ARG SERVICE_NAME
RUN npm run build --workspace=@uber-clone/${SERVICE_NAME}

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

ARG SERVICE_NAME
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/${SERVICE_NAME}/package.json ./package.json
COPY --from=build /workspace/services/${SERVICE_NAME}/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
