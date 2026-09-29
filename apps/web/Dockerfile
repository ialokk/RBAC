FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY libs/shared-types/package.json libs/shared-types/package.json
COPY libs/shared-utils/package.json libs/shared-utils/package.json
COPY libs/shared-validation/package.json libs/shared-validation/package.json
RUN npm install --workspaces --include-workspace-root
COPY libs libs
COPY apps/web apps/web
# libs must be compiled to dist/ first — apps/web resolves @rbac/* via node_modules -> dist, not raw src.
RUN npm run build --workspace libs/shared-types \
  && npm run build --workspace libs/shared-utils \
  && npm run build --workspace libs/shared-validation \
  && npm run build --workspace apps/web -- --configuration production

FROM nginx:1.27-alpine
COPY --from=build /repo/apps/web/dist/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/ >/dev/null 2>&1 || exit 1
