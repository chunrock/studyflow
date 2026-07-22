const test = require("node:test");
const assert = require("node:assert/strict");
const { createLibraryItemFromMeta, createLibraryItemFromScannedMeta, createLibraryItems, createLibraryStore, filterLibraryItems, filterLibraryItemsByFacets, filterLibraryItemsByStatus, getUniqueFilterValues, groupLatestLibraryItems, removeLibraryItem, restoreStoredItems, toggleFavorite } = require("../web/scripts/library");

const scenario = {
  id: "voucher-basic",
  title: "전표 발행 기본 교육",
  targetApp: "전표 발행",
  steps: [
    { body: "전표 발행 메뉴를 확인합니다." },
    { body: "저장 전 누락 항목을 확인합니다." }
  ]
};

const meta = {
  courseId: "voucher-basic",
  title: "전표 발행 기본 교육",
  description: "전표 발행 샘플 교육입니다.",
  summary: "메뉴, 입력, 저장 확인",
  author: { displayName: "작성자" },
  department: "회계팀",
  jobRole: "경리",
  updatedAt: "2026-07-22T11:00:00+09:00",
  pageCount: 2,
  tags: ["회계"],
  customCategories: ["신입교육"]
};

test("createLibraryItems summarizes scenarios for the library", () => {
  const items = createLibraryItems([scenario], [meta]);

  assert.equal(items[0].id, "voucher-basic");
  assert.equal(items[0].pageCount, 2);
  assert.equal(items[0].favorite, false);
  assert.equal(items[0].description, "전표 발행 샘플 교육입니다.");
  assert.equal(items[0].department, "회계팀");
});

test("filterLibraryItems searches title target app description and tags", () => {
  const items = createLibraryItems([scenario], [meta]);

  assert.equal(filterLibraryItems(items, "전표").length, 1);
  assert.equal(filterLibraryItems(items, "신입교육").length, 1);
  assert.equal(filterLibraryItems(items, "작성자").length, 1);
  assert.equal(filterLibraryItems(items, "없는 자료").length, 0);
});

test("toggleFavorite flips only the selected item", () => {
  const items = createLibraryItems([scenario], [meta]);
  const updated = toggleFavorite(items, "voucher-basic");

  assert.equal(updated[0].favorite, true);
  assert.equal(items[0].favorite, false);
});

test("createLibraryItemFromMeta falls back to scenario fields", () => {
  const item = createLibraryItemFromMeta({}, scenario, "sample/course.json");

  assert.equal(item.title, "전표 발행 기본 교육");
  assert.equal(item.description, "전표 발행 메뉴를 확인합니다.");
  assert.equal(item.sourcePath, "sample/course.json");
});

test("createLibraryItemFromScannedMeta creates list-only items", () => {
  const item = createLibraryItemFromScannedMeta({
    sourcePath: "/shared/voucher",
    fileStatus: "normal",
    meta
  });

  assert.equal(item.id, "voucher-basic");
  assert.equal(item.sourcePath, "/shared/voucher");
  assert.equal(item.scenario, null);
});

test("createLibraryStore keeps scan folders with library items", () => {
  const items = createLibraryItems([scenario], [meta]);
  const store = createLibraryStore(items, ["/shared"]);

  assert.equal(store.recentScanFolders[0], "/shared");
  assert.equal(store.libraryItems[0].id, "voucher-basic");
});

test("restoreStoredItems returns list-only items with tags", () => {
  const restored = restoreStoredItems([{ id: "saved", title: "저장 자료" }]);

  assert.equal(restored[0].id, "saved");
  assert.deepEqual(restored[0].tags, []);
  assert.equal(restored[0].scenario, null);
});

test("removeLibraryItem removes only the selected item", () => {
  const items = [
    { id: "a", title: "A", sourcePath: "/old" },
    { id: "b", title: "B", sourcePath: "/new" }
  ];

  assert.deepEqual(removeLibraryItem(items, "a"), [{ id: "b", title: "B", sourcePath: "/new" }]);
  assert.deepEqual(removeLibraryItem(items, "/old"), [{ id: "b", title: "B", sourcePath: "/new" }]);
});

test("groupLatestLibraryItems keeps newest item as representative", () => {
  const grouped = groupLatestLibraryItems([
    { id: "course", title: "old", updatedAt: "2026-07-01T00:00:00+09:00", sourcePath: "/old" },
    { id: "course", title: "new", lastSharedAt: "2026-07-22T00:00:00+09:00", sourcePath: "/new" }
  ]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].title, "new");
  assert.equal(grouped[0].previousVersions.length, 1);
  assert.equal(grouped[0].previousVersions[0].title, "old");
});

test("filterLibraryItemsByStatus separates missing items", () => {
  const items = [
    { id: "a", fileStatus: "normal" },
    { id: "b", fileStatus: "missing" },
    { id: "c", fileStatus: "missing-meta" }
  ];

  assert.deepEqual(filterLibraryItemsByStatus(items, "normal"), [items[0], items[2]]);
  assert.deepEqual(filterLibraryItemsByStatus(items, "missing"), [items[1]]);
});

test("getUniqueFilterValues returns sorted non-empty values", () => {
  const values = getUniqueFilterValues([
    { department: "회계팀" },
    { department: "" },
    { department: "총무팀" },
    { department: "회계팀" }
  ], "department");

  assert.deepEqual(values, ["총무팀", "회계팀"]);
});

test("filterLibraryItemsByFacets applies department job role and category", () => {
  const items = [
    { id: "a", department: "회계팀", jobRole: "경리", tags: ["신입교육"] },
    { id: "b", department: "총무팀", jobRole: "관리", tags: ["정기교육"] }
  ];

  assert.deepEqual(filterLibraryItemsByFacets(items, { department: "회계팀", jobRole: "경리", category: "신입" }), [items[0]]);
  assert.deepEqual(filterLibraryItemsByFacets(items, { department: "회계팀", jobRole: "관리", category: "" }), []);
});
