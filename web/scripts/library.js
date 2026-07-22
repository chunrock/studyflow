"use strict";

function createLibraryItemFromMeta(meta, scenario, sourcePath) {
  return {
    id: meta.courseId || scenario.id,
    title: meta.title || scenario.title,
    targetApp: scenario.targetApp,
    description: meta.description || (scenario.steps[0] ? scenario.steps[0].body : ""),
    summary: meta.summary || "",
    pageCount: Number.isFinite(meta.pageCount) ? meta.pageCount : scenario.steps.length,
    authorName: meta.author && meta.author.displayName ? meta.author.displayName : "",
    department: meta.department || "",
    jobRole: meta.jobRole || "",
    updatedAt: meta.updatedAt || "",
    lastSharedAt: meta.lastSharedAt || "",
    favorite: false,
    fileStatus: "normal",
    sourcePath: sourcePath || "",
    tags: [...(meta.tags || []), ...(meta.customCategories || []), scenario.targetApp].filter(Boolean),
    scenario
  };
}

function createLibraryItemFromScannedMeta(scannedItem) {
  const meta = scannedItem.meta || {};
  return {
    id: meta.courseId || scannedItem.sourcePath,
    title: meta.title || "제목 없는 교육 자료",
    targetApp: meta.targetApp || "",
    description: meta.description || "",
    summary: meta.summary || "",
    pageCount: Number.isFinite(meta.pageCount) ? meta.pageCount : 0,
    authorName: meta.author && meta.author.displayName ? meta.author.displayName : "",
    department: meta.department || "",
    jobRole: meta.jobRole || "",
    updatedAt: meta.updatedAt || "",
    lastSharedAt: meta.lastSharedAt || "",
    favorite: false,
    fileStatus: scannedItem.fileStatus || "normal",
    sourcePath: scannedItem.sourcePath || "",
    tags: [...(meta.tags || []), ...(meta.customCategories || [])].filter(Boolean),
    scenario: null
  };
}

function createLibraryItems(scenarios, metas) {
  return scenarios.map((scenario, index) => createLibraryItemFromMeta((metas || [])[index] || {}, scenario, ""));
}

function filterLibraryItems(items, query) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;
  return items.filter((item) => [
    item.title,
    item.targetApp,
    item.description,
    item.summary,
    item.authorName,
    item.department,
    item.jobRole,
    ...item.tags
  ].some((value) => String(value).toLowerCase().includes(keyword)));
}

function filterLibraryItemsByStatus(items, status) {
  if (status === "missing") {
    return items.filter((item) => item.fileStatus === "missing");
  }
  return items.filter((item) => item.fileStatus !== "missing");
}

function getUniqueFilterValues(items, field) {
  return Array.from(new Set(items.map((item) => item[field]).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function filterLibraryItemsByFacets(items, facets) {
  return items.filter((item) => {
    if (facets.department && item.department !== facets.department) return false;
    if (facets.jobRole && item.jobRole !== facets.jobRole) return false;
    if (facets.category) {
      const category = facets.category.trim().toLowerCase();
      const tags = item.tags || [];
      if (category && !tags.some((tag) => String(tag).toLowerCase().includes(category))) return false;
    }
    return true;
  });
}

function getVersionTimestamp(item) {
  return Date.parse(item.lastSharedAt || item.updatedAt || "") || 0;
}

function groupLatestLibraryItems(items) {
  const groups = new Map();
  for (const item of items) {
    const groupKey = item.id || item.sourcePath || item.title;
    const group = groups.get(groupKey) || [];
    group.push(item);
    groups.set(groupKey, group);
  }

  return Array.from(groups.values()).map((group) => {
    const sorted = [...group].sort((a, b) => getVersionTimestamp(b) - getVersionTimestamp(a));
    return {
      ...sorted[0],
      isLatest: true,
      previousVersions: sorted.slice(1).map((item) => ({ ...item, isLatest: false, previousVersions: [] }))
    };
  });
}

function toggleFavorite(items, itemId) {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    return { ...item, favorite: !item.favorite };
  });
}

function removeLibraryItem(items, itemId) {
  return items.filter((item) => item.id !== itemId && item.sourcePath !== itemId);
}

function createLibraryStore(items, recentScanFolders) {
  return {
    recentScanFolders: recentScanFolders || [],
    libraryItems: items
  };
}

function restoreStoredItems(storedItems) {
  return (storedItems || []).map((item) => ({
    ...item,
    tags: item.tags || [],
    scenario: null
  }));
}

const libraryApi = {
  createLibraryItemFromMeta,
  createLibraryItemFromScannedMeta,
  createLibraryItems,
  createLibraryStore,
  filterLibraryItems,
  filterLibraryItemsByFacets,
  filterLibraryItemsByStatus,
  getUniqueFilterValues,
  groupLatestLibraryItems,
  removeLibraryItem,
  restoreStoredItems,
  toggleFavorite
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = libraryApi;
}

if (typeof window !== "undefined") {
  window.StudyFlowLibrary = libraryApi;
}
