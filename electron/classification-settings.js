"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

function getClassificationSettingsPath(databaseDir) {
  return path.join(databaseDir, "classification-settings.json");
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").replace(/\s+/g, " ").trim()).filter(Boolean))];
}

function normalizeCustomCategories(customCategories) {
  const normalized = {};
  for (const [group, values] of Object.entries(customCategories || {})) {
    normalized[group] = uniqueStrings(Array.isArray(values) ? values : []);
  }
  return normalized;
}

function normalizeSettings(settings) {
  return {
    departments: uniqueStrings(settings.departments || []),
    jobRoles: uniqueStrings(settings.jobRoles || []),
    customCategories: normalizeCustomCategories(settings.customCategories || {}),
    tagAliases: Array.isArray(settings.tagAliases) ? settings.tagAliases : [],
    pendingTerms: Array.isArray(settings.pendingTerms) ? settings.pendingTerms : []
  };
}

async function saveClassificationSettings(databaseDir, settings) {
  await fs.mkdir(databaseDir, { recursive: true });
  const normalized = normalizeSettings(settings || {});
  const filePath = getClassificationSettingsPath(databaseDir);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
  return normalized;
}

async function loadClassificationSettings(databaseDir) {
  await fs.mkdir(databaseDir, { recursive: true });
  try {
    const text = await fs.readFile(getClassificationSettingsPath(databaseDir), "utf8");
    return normalizeSettings(JSON.parse(text));
  } catch (_error) {
    return saveClassificationSettings(databaseDir, {
      departments: [],
      jobRoles: [],
      customCategories: {},
      tagAliases: [],
      pendingTerms: []
    });
  }
}

function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags || "").split(",");
  return uniqueStrings(values);
}

function detectPendingTerms(meta, settings) {
  const terms = [];
  const knownCategories = Object.values(settings.customCategories || {}).flat();
  const knownTags = (settings.tagAliases || []).flatMap((entry) => [entry.canonical, ...(entry.aliases || [])]);
  pushUnknown(terms, "department", meta.department, settings.departments || [], meta.courseId);
  pushUnknown(terms, "jobRole", meta.jobRole, settings.jobRoles || [], meta.courseId);
  for (const category of meta.customCategories || []) {
    pushUnknown(terms, "customCategory", category, knownCategories, meta.courseId);
  }
  for (const tag of normalizeTags(meta.tags || [])) {
    pushUnknown(terms, "tag", tag, knownTags, meta.courseId);
  }
  return terms;
}

function applyClassificationFilters(items, filters) {
  return (items || []).filter((item) => (
    matchesValueGroup(item.department, filters.departments) &&
    matchesValueGroup(item.jobRole, filters.jobRoles) &&
    matchesArrayGroup(item.customCategories || [], filters.customCategories) &&
    matchesArrayGroup(item.tags || [], filters.tags)
  ));
}

function isUnclassified(item) {
  return !item.department &&
    !item.jobRole &&
    (!Array.isArray(item.customCategories) || item.customCategories.length === 0) &&
    (!Array.isArray(item.tags) || item.tags.length === 0);
}

function pushUnknown(terms, type, value, knownValues, courseId) {
  const normalizedValue = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalizedValue || knownValues.includes(normalizedValue)) return;
  terms.push({
    type,
    value: normalizedValue,
    sourceCourseId: courseId || "",
    detectedAt: new Date().toISOString()
  });
}

function matchesValueGroup(value, selected) {
  if (!selected || selected.length === 0) return true;
  if (selected.includes("미분류") && !value) return true;
  return selected.includes(value);
}

function matchesArrayGroup(values, selected) {
  if (!selected || selected.length === 0) return true;
  if (selected.includes("미분류") && values.length === 0) return true;
  return values.some((value) => selected.includes(value));
}

module.exports = {
  applyClassificationFilters,
  detectPendingTerms,
  getClassificationSettingsPath,
  isUnclassified,
  loadClassificationSettings,
  normalizeTags,
  saveClassificationSettings
};
