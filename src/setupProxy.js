/**
 * CRA dev-server proxy — same routes as deploy/nginx.conf (Sprint 32).
 * Use when running `npm start` instead of the Docker UI on :3000.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

const host = '127.0.0.1';

module.exports = function setupProxy(app) {
  app.use('/rag', createProxyMiddleware({
    target: `http://${host}:8001`,
    changeOrigin: true,
    pathRewrite: { '^/rag': '' },
  }));
  app.use('/api/configure', createProxyMiddleware({
    target: `http://${host}:8017`,
    changeOrigin: true,
  }));
  app.use('/api/orchestrate', createProxyMiddleware({
    target: `http://${host}:3003`,
    changeOrigin: true,
  }));
  app.use(['/api/modes', '/api/agents'], createProxyMiddleware({
    target: `http://${host}:8012`,
    changeOrigin: true,
  }));
  app.use('/api/pressure', createProxyMiddleware({
    target: `http://${host}:8013`,
    changeOrigin: true,
  }));
  app.use('/api/mlx/stream', createProxyMiddleware({
    target: `http://${host}:8010`,
    changeOrigin: true,
    pathRewrite: { '^/api/mlx/stream': '/api/architect/stream' },
  }));
  app.use('/api/mlx', createProxyMiddleware({
    target: `http://${host}:8010`,
    changeOrigin: true,
  }));
  app.use('/api', createProxyMiddleware({
    target: `http://${host}:8010`,
    changeOrigin: true,
  }));
};
