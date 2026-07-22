"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

function createEmptyStore() {
  return {
    schemaVersion: "1.0.0",
    updatedAt: "",
    recentScanFolders: [],
    libraryItems: []
  };
}

function toStoredLibraryItem(item) {
  return {
    id: item.id,
    title: item.title,
    targetApp: item.targetApp,
    description: item.description,
    summary: item.summary,
    pageCount: item.pageCount,
    authorName: item.authorName,
    department: item.department,
    jobRole: item.jobRole,
    updatedAt: item.updatedAt,
    lastSharedAt: item.lastSharedAt,
    favorite: Boolean(item.favorite),
    fileStatus: item.fileStatus,
    sourcePath: item.sourcePath,
    tags: item.tags || []
  };
}

async function readLibraryStore(storePath) {
  try {
    const text = await fs.readFile(storePath, "utf8");
    return { ...createEmptyStore(), ...JSON.parse(text) };
  } catch (error) {
    if (error.code === "ENOENT") return createEmptyStore();
    throw error;
  }
}

async function writeLibraryStore(storePath, store) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  const payload = {
    ...createEmptyStore(),
    ...store,
    updatedAt: new Date().toISOString(),
    libraryItems: (store.libraryItems || []).map(toStoredLibraryItem)
  };
  const tempPath = `${storePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
  return payload;
}

async function refreshLibraryItemStatus(items) {
  const refreshed = [];
  for (const item of items || []) {
    if (!item.sourcePath) {
      refreshed.push(item);
      continue;
    }
    try {
      await fs.access(item.sourcePath);
      refreshed.push({ ...item, fileStatus: item.fileStatus === "missing" ? "normal" : item.fileStatus });
    } catch {
      refreshed.push({ ...item, fileStatus: "missing" });
    }
  }
  return refreshed;
}

async function deleteLibrarySource(sourcePath) {
  if (!sourcePath) return { deleted: false };
  await fs.rm(sourcePath, { recursive: true, force: true });
  return { deleted: true, sourcePath };
}

module.exports = {
  createEmptyStore,
  deleteLibrarySource,
  readLibraryStore,
  refreshLibraryItemStatus,
  toStoredLibraryItem,
  writeLibraryStore
};
