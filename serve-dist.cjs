const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 3001;
const rootDir = path.join(__dirname, "dist");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function safeResolve(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requestedPath = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolvedPath = path.normalize(path.join(rootDir, requestedPath));
  return resolvedPath.startsWith(rootDir) ? resolvedPath : path.join(rootDir, "index.html");
}

http
  .createServer((req, res) => {
    let filePath = safeResolve(req.url || "/");

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(rootDir, "index.html");
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Server error");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(port, "localhost", () => {
    console.log(`DDO static server running at http://localhost:${port}`);
  });
