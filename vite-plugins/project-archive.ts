import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

export const ARCHIVE_FILENAME = "smart-pdv-pro-projeto.zip";

const EXCLUDED_NAMES = new Set([
  ".git", "node_modules", ".output", "dist", "build", ".vinxi", ".cache", ".turbo",
  ".workspace", ".claude", ".agents", "tsconfig.tsbuildinfo", ARCHIVE_FILENAME,
]);

function addDirectory(zip: AdmZip, rootDir: string, directory: string) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (EXCLUDED_NAMES.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      addDirectory(zip, rootDir, absolutePath);
    } else if (entry.isFile()) {
      const archiveDir = path.dirname(path.relative(rootDir, absolutePath)).split(path.sep).join("/");
      zip.addLocalFile(absolutePath, archiveDir === "." ? "" : archiveDir);
    }
  }
}

export function buildProjectArchive(rootDir: string): Buffer {
  const zip = new AdmZip();
  addDirectory(zip, rootDir, rootDir);
  if (zip.getEntries().length === 0) throw new Error("Nenhum arquivo do projeto encontrado.");
  return zip.toBuffer();
}

/**
 * Serves /smart-pdv-pro-projeto.zip in dev and emits it as a static asset on build,
 * so the landing page download works both in preview and in production.
 */
export function projectArchivePlugin(): Plugin {
  const publicPath = `/${ARCHIVE_FILENAME}`;
  return {
    name: "project-archive",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.url.split("?")[0] !== publicPath) return next();
        try {
          const buffer = buildProjectArchive(server.config.root);
          res.setHeader("Content-Type", "application/zip");
          res.setHeader("Content-Disposition", `attachment; filename="${ARCHIVE_FILENAME}"`);
          res.setHeader("Content-Length", String(buffer.length));
          res.end(buffer);
        } catch (error) {
          res.statusCode = 500;
          res.end(String(error));
        }
      });
    },
    generateBundle() {
      if (this.environment?.name && this.environment.name !== "client") return;
      try {
        this.emitFile({
          type: "asset",
          fileName: ARCHIVE_FILENAME,
          source: buildProjectArchive(process.cwd()),
        });
      } catch (error) {
        this.warn(`Falha ao gerar o ZIP do projeto: ${String(error)}`);
      }
    },
  };
}
