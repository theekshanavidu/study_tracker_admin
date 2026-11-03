import { onRequestPost } from "../functions/api/upload.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route /api/upload to the R2 upload handler
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      return onRequestPost({ request, env });
    }

    // Serve static SPA assets from dist
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};

