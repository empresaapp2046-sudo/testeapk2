import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveLocalDataToDisk(category: string, content: unknown, tenantId: string) {
  const filePath = path.join(DATA_DIR, `${tenantId}_${category}.json`);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf-8");
}

export function loadLocalDataFromDisk(category: string, tenantId: string) {
  const filePath = path.join(DATA_DIR, `${tenantId}_${category}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
