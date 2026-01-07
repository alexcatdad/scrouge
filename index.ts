// Bun automatically loads .env, but we need to ensure .env.local is loaded too
// Check for both CONVEX_URL and VITE_CONVEX_URL (Convex generates VITE_CONVEX_URL)
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn("Warning: CONVEX_URL environment variable is not set");
}

// Read the HTML file and inject CONVEX_URL
const indexHtmlFile = Bun.file("./index.html");
const baseHtml = await indexHtmlFile.text();

const getHtml = () => {
  if (convexUrl) {
    return baseHtml.replace(
      'window.CONVEX_URL = null;',
      `window.CONVEX_URL = ${JSON.stringify(convexUrl)};`
    );
  }
  return baseHtml;
};

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Health check endpoint for container orchestration
    if (pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // Serve the HTML for the root path
    if (pathname === "/") {
      return new Response(getHtml(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve static files and handle TypeScript/TSX transpilation
    const filePath = `.${pathname}`;
    const file = Bun.file(filePath);
    
    if (await file.exists()) {
      // Handle TypeScript/TSX files - Bun needs to transpile them
      if (pathname.endsWith(".tsx") || pathname.endsWith(".ts")) {
        try {
          // Use Bun's build API to transpile on the fly
          const result = await Bun.build({
            entrypoints: [filePath],
            target: "browser",
            format: "esm",
            minify: false,
            sourcemap: "inline",
          });
          
          if (result.success && result.outputs.length > 0) {
            const output = result.outputs[0];
            return new Response(output, {
              headers: { 
                "Content-Type": "application/javascript",
                "Cache-Control": "no-cache",
              },
            });
          }
        } catch (error) {
          console.error("Error transpiling:", error);
          return new Response("Error transpiling file", { status: 500 });
        }
      }
      
      // Determine content type for other files
      let contentType = "text/plain";
      if (pathname.endsWith(".css")) {
        contentType = "text/css";
      } else if (pathname.endsWith(".js")) {
        contentType = "application/javascript";
      } else if (pathname.endsWith(".json")) {
        contentType = "application/json";
      }

      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${port}`);
