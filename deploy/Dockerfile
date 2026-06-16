# Production: static React app behind nginx; /api proxied to cofiswarm-dispatch :8010
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
COPY scripts ./scripts
COPY patches ./patches
RUN npm ci

COPY public ./public
COPY src ./src

ARG REACT_APP_API_BASE=/api
ARG REACT_APP_RAG_INGEST_BASE=/rag
ENV REACT_APP_API_BASE=$REACT_APP_API_BASE
ENV REACT_APP_RAG_INGEST_BASE=$REACT_APP_RAG_INGEST_BASE
ENV CI=true
ENV GENERATE_SOURCEMAP=false

RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R g+r /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
