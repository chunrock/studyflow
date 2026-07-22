const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { deleteLibrarySource, readLibraryStore, refreshLibraryItemStatus, toStoredLibraryItem, writeLibraryStore } = require("../electron/library-store");

test("toStoredLibraryItem removes live scenario data", () => {
  const stored = toStoredLibraryItem({
    id: "sample",
    title: "샘플",
    favorite: true,
    tags: ["태그"],
    scenario: { steps: [] }
  });

  assert.equal(stored.id, "sample");
  assert.equal(stored.favorite, true);
  assert.equal(stored.scenario, undefined);
});

test("writeLibraryStore writes atomically readable JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-store-"));
  const storePath = path.join(root, "database", "library.json");

  await writeLibraryStore(storePath, {
    recentScanFolders: ["/shared"],
    libraryItems: [{ id: "sample", title: "샘플", favorite: true }]
  });
  const store = await readLibraryStore(storePath);

  assert.equal(store.recentScanFolders[0], "/shared");
  assert.equal(store.libraryItems[0].id, "sample");
  assert.equal(store.libraryItems[0].favorite, true);

  await fs.rm(root, { recursive: true, force: true });
});

test("refreshLibraryItemStatus marks missing source paths", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-store-"));
  const existing = path.join(root, "existing");
  await fs.mkdir(existing);

  const items = await refreshLibraryItemStatus([
    { id: "existing", sourcePath: existing, fileStatus: "missing" },
    { id: "missing", sourcePath: path.join(root, "missing"), fileStatus: "normal" }
  ]);

  assert.equal(items[0].fileStatus, "normal");
  assert.equal(items[1].fileStatus, "missing");

  await fs.rm(root, { recursive: true, force: true });
});

test("deleteLibrarySource removes a source folder", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "studyflow-store-"));
  const target = path.join(root, "course");
  await fs.mkdir(target);

  await deleteLibrarySource(target);
  await assert.rejects(fs.access(target));

  await fs.rm(root, { recursive: true, force: true });
});
