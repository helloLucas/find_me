import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
};

function serveRepoAsset(req, res, next) {
  const rawUrl = (req.url ?? "").split("?")[0];
  if (!rawUrl.startsWith("/repo-assets/")) {
    next();
    return;
  }

  const relativePath = decodeURIComponent(rawUrl.slice("/repo-assets/".length));
  if (!relativePath || relativePath.includes("..")) {
    res.statusCode = 400;
    res.end("Bad asset path");
    return;
  }

  const filePath = path.resolve(repoRoot, relativePath);
  if (!filePath.startsWith(repoRoot)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      next();
      return;
    }

    res.setHeader("Content-Type", contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  });
}

function repoAssetPlugin() {
  return {
    name: "lucas-presentation-repo-assets",
    configureServer(server) {
      server.middlewares.use(serveRepoAsset);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveRepoAsset);
    },
  };
}

export default {
  plugins: [repoAssetPlugin()],
  server: {
    host: "0.0.0.0",
    port: 8090,
  },
  preview: {
    host: "0.0.0.0",
    port: 4175,
  },
};
