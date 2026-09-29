FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY libs/shared-types/package.json libs/shared-types/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
COPY libs/shared-validation/package.json libs/shared-validation/package.json
RUN npm install --workspaces --include-workspace-root
COPY libs libs
COPY apps/api apps/api
# libs must be compiled to dist/ first — apps/api resolves @rbac/* via node_modules -> dist, not raw src.
RUN npm run build --workspace libs/shared-types \
 && npm run build --workspace libs/shared-utils \
 && npm run build --workspace libs/shared-validation \
 && npm run build --workspace apps/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/server.js"]

