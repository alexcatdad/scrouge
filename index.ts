import indexHtml from "./index.html";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const convexUrl = process.env.CONVEX_URL;

if (!convexUrl) {
  console.warn("Warning: CONVEX_URL environment variable is not set");
}

// Inject CONVEX_URL into HTML for browser access
const index = indexHtml.replace(
  "</head>",
  convexUrl
    ? `<script>window.CONVEX_URL = ${JSON.stringify(convexUrl)};</script></head>`
    : "</head>"
);

Bun.serve({
  port,
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at http://localhost:${port}`);
