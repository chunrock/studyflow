"use strict";

(async function init() {
  const response = await fetch("./data/sample-course.json");
  const rawScenario = await response.json();
  const metaResponse = await fetch("./data/course-meta.json");
  let courseMeta = await metaResponse.json();
  let scenario = window.StudyFlowSchema.normalizeScenario(rawScenario);
  let state = window.StudyFlowState.createOverlayState(scenario);
  const sampleItems = window.StudyFlowLibrary.createLibraryItems([scenario], [courseMeta]);
  let libraryItems = sampleItems;

  function render() {
    window.StudyFlowRender.renderOverlay(state.snapshot(), window.StudyFlowGeometry);
    if (window.studyflow) {
      window.studyflow.setClickThrough(state.snapshot().clickThrough);
    }
  }

  let editor = window.StudyFlowEditor.createEditor({
    state,
    render,
    onApply: () => scheduleAutosave("step-edited")
  });
  const library = document.querySelector("[data-role='library']");
  const librarySearch = document.querySelector("[data-library-role='search']");
  const libraryList = document.querySelector("[data-library-role='list']");
  const libraryStatus = document.querySelector("[data-library-role='status']");
  const validationPanel = document.querySelector("[data-library-role='validation']");
  const classificationPanel = document.querySelector("[data-role='classification-panel']");
  const departmentFilter = document.querySelector("[data-library-filter='department']");
  const jobRoleFilter = document.querySelector("[data-library-filter='jobRole']");
  const categoryFilter = document.querySelector("[data-library-filter='category']");
  let recentScanFolders = [];
  const expandedVersions = new Set();
  let activeLibraryStatus = "normal";
  let lastShareValidation = null;
  let shareWarningsAccepted = false;
  let currentCoursePackage = null;
  let savedCourseSnapshot = null;
  let autosaveTimerId = null;
  let classificationSettings = null;

  async function restoreLibraryStore() {
    if (!window.studyflow || !window.studyflow.readLibraryStore) return;
    const store = await window.studyflow.readLibraryStore();
    const storedItems = window.StudyFlowLibrary.restoreStoredItems(store.libraryItems);
    recentScanFolders = store.recentScanFolders || [];
    libraryItems = [...sampleItems, ...storedItems.filter((item) => !sampleItems.some((sample) => sample.id === item.id))];
    if (store.updatedAt) {
      libraryStatus.textContent = `저장된 보관함을 불러왔습니다. 마지막 갱신: ${store.updatedAt}`;
    }
  }

  function showOverlay() {
    library.hidden = true;
    document.querySelector(".overlay-shell").hidden = false;
    render();
  }

  function showLibrary() {
    library.hidden = false;
    document.querySelector(".overlay-shell").hidden = true;
  }

  function syncCurrentCoursePackage() {
    if (!currentCoursePackage) return;
    currentCoursePackage.courseMeta = courseMeta;
    currentCoursePackage.scenario = scenario;
  }

  function applyOpenModeToUi(openMode) {
    const readOnly = openMode && openMode.openMode === "read-only";
    document.querySelectorAll("[data-requires-edit='true']").forEach((element) => {
      element.hidden = readOnly;
      element.disabled = readOnly;
    });
  }

  function cloneCoursePackage(coursePackage) {
    return JSON.parse(JSON.stringify(coursePackage));
  }

  function buildChangeLogEntry(beforePackage, afterPackage, summary) {
    const beforeSteps = Array.isArray(beforePackage.scenario && beforePackage.scenario.steps) ? beforePackage.scenario.steps : [];
    const afterSteps = Array.isArray(afterPackage.scenario && afterPackage.scenario.steps) ? afterPackage.scenario.steps : [];
    const items = [];
    const stepDelta = afterSteps.length - beforeSteps.length;
    if (beforePackage.scenario && afterPackage.scenario && beforePackage.scenario.title !== afterPackage.scenario.title) {
      items.push("제목 수정");
    }
    if (stepDelta > 0) {
      items.push(`페이지 ${stepDelta}개 추가`);
    }
    if (stepDelta < 0) {
      items.push(`페이지 ${Math.abs(stepDelta)}개 삭제`);
    }
    if (items.length === 0) {
      items.push("교육 자료 내용 수정");
    }
    return {
      changedAt: new Date().toISOString(),
      sharedAt: afterPackage.courseMeta.lastSharedAt || "",
      author: afterPackage.courseMeta.author || {},
      summary,
      items,
      contentHash: afterPackage.courseMeta.contentHash || "",
      openMode: afterPackage.openMode || null
    };
  }

  function showSaveError(message) {
    libraryStatus.textContent = message;
  }

  function scheduleAutosave(reason) {
    if (!window.studyflow || !window.studyflow.writeAutosave || !currentCoursePackage) return;
    syncCurrentCoursePackage();
    window.clearTimeout(autosaveTimerId);
    autosaveTimerId = window.setTimeout(() => {
      syncCurrentCoursePackage();
      window.studyflow.writeAutosave(currentCoursePackage, reason).then((record) => {
        libraryStatus.textContent = `자동 저장됨: ${record.autosavedAt}`;
      }).catch((error) => {
        showSaveError(`자동 저장 실패: ${error.message}`);
      });
    }, 500);
  }

  function startAutosaveInterval() {
    if (!window.studyflow || !window.studyflow.writeAutosave) return;
    window.setInterval(() => {
      if (!currentCoursePackage) return;
      syncCurrentCoursePackage();
      window.studyflow.writeAutosave(currentCoursePackage, "interval").catch((error) => {
        showSaveError(`자동 저장 실패: ${error.message}`);
      });
    }, 30000);
  }

  function loadCoursePackage(coursePackage) {
    currentCoursePackage = coursePackage;
    savedCourseSnapshot = cloneCoursePackage(coursePackage);
    applyOpenModeToUi(currentCoursePackage.openMode);
    courseMeta = coursePackage.courseMeta || courseMeta;
    scenario = window.StudyFlowSchema.normalizeScenario(coursePackage.scenario || scenario);
    state = window.StudyFlowState.createOverlayState(scenario);
    editor = window.StudyFlowEditor.createEditor({
      state,
      render,
      onApply: () => scheduleAutosave("step-edited")
    });
    renderFilterOptions();
    renderLibrary();
    render();
  }

  async function enterEditModeFromReadOnly(employeeId) {
    if (!window.studyflow || !window.studyflow.createEditableCopy || !currentCoursePackage || !currentCoursePackage.openMode.canEnterEditMode) return;
    currentCoursePackage = await window.studyflow.createEditableCopy(currentCoursePackage, employeeId);
    savedCourseSnapshot = cloneCoursePackage(currentCoursePackage);
    applyOpenModeToUi(currentCoursePackage.openMode);
    render();
  }

  async function appendCurrentChangeLog(summary) {
    if (!window.studyflow || !window.studyflow.appendChangeLog || !currentCoursePackage) return;
    syncCurrentCoursePackage();
    const entry = buildChangeLogEntry(savedCourseSnapshot || currentCoursePackage, currentCoursePackage, summary);
    await window.studyflow.appendChangeLog(currentCoursePackage.courseDir, entry);
    savedCourseSnapshot = cloneCoursePackage(currentCoursePackage);
  }

  function renderRecoverableAutosaves(records) {
    const panel = document.querySelector("[data-role='recovery-panel']");
    const list = document.querySelector("[data-role='recovery-list']");
    if (!panel || !list || records.length === 0) return;
    panel.hidden = false;
    list.replaceChildren(...records.map((record) => {
      const row = document.createElement("div");
      row.className = "recovery-item";
      row.innerHTML = `
        <div>
          <strong>${record.courseMeta.title || "교육 자료"}</strong>
          <span>${record.autosavedAt}</span>
        </div>
        <div class="recovery-item__actions">
          <button type="button" data-recovery-action="restore">복구해서 열기</button>
          <button type="button" data-recovery-action="open-original">기존 저장본 열기</button>
          <button type="button" data-recovery-action="delete">복구본 삭제</button>
        </div>
      `;
      row.querySelector("[data-recovery-action='restore']").addEventListener("click", async () => {
        loadCoursePackage(await window.studyflow.restoreAutosave(record));
        panel.hidden = true;
        libraryStatus.textContent = "자동 저장본을 복구했습니다.";
      });
      row.querySelector("[data-recovery-action='open-original']").addEventListener("click", () => {
        row.remove();
        if (!list.children.length) {
          panel.hidden = true;
        }
        libraryStatus.textContent = "기존 저장본을 유지합니다.";
      });
      row.querySelector("[data-recovery-action='delete']").addEventListener("click", async () => {
        await window.studyflow.deleteAutosave(record.courseDir);
        row.remove();
        if (!list.children.length) {
          panel.hidden = true;
        }
        libraryStatus.textContent = "복구본을 삭제했습니다.";
      });
      return row;
    }));
  }

  function renderLibrary() {
    const groupedItems = window.StudyFlowLibrary.groupLatestLibraryItems(libraryItems);
    const statusItems = window.StudyFlowLibrary.filterLibraryItemsByStatus(groupedItems, activeLibraryStatus);
    const facetItems = window.StudyFlowLibrary.filterLibraryItemsByFacets(statusItems, {
      department: departmentFilter.value,
      jobRole: jobRoleFilter.value,
      category: categoryFilter.value
    });
    const visibleItems = window.StudyFlowLibrary.filterLibraryItems(facetItems, librarySearch.value);
    libraryList.replaceChildren(...visibleItems.map((item) => {
      const previousVersions = item.previousVersions || [];
      const previousHtml = expandedVersions.has(item.id)
        ? previousVersions.map((version) => `
          <div class="library-version">
            <span>${version.updatedAt || version.lastSharedAt || "날짜 없음"} · ${version.sourcePath || "샘플"}</span>
            <button type="button" data-library-remove="${version.sourcePath || version.id}">이전 자료 제거</button>
          </div>
        `).join("")
        : "";
      const card = document.createElement("article");
      card.className = "library-card";
      card.innerHTML = `
        <div>
          <p class="library-card__meta">${item.targetApp || "대상 미지정"} · ${item.pageCount}단계 · ${item.fileStatus === "normal" ? "정상" : "확인 필요"}</p>
          <h2>${item.title}</h2>
          <p>${item.description}</p>
          <p class="library-card__detail">${item.department} · ${item.jobRole} · ${item.authorName} · ${item.updatedAt}</p>
          ${previousVersions.length ? `<button class="library-version-toggle" type="button" data-library-versions="${item.id}">이전 자료 ${previousVersions.length}개 ${expandedVersions.has(item.id) ? "접기" : "보기"}</button>` : ""}
          ${previousHtml ? `<div class="library-versions">${previousHtml}</div>` : ""}
        </div>
        <div class="library-card__actions">
          <button type="button" data-library-favorite="${item.id}">${item.favorite ? "즐겨찾기 해제" : "즐겨찾기"}</button>
          <button type="button" data-library-start="${item.id}" ${item.scenario ? "" : "disabled"}>교육 시작</button>
          <button type="button" data-library-remove="${item.id}">목록 제거</button>
          <button type="button" data-library-delete="${item.id}" ${item.sourcePath ? "" : "disabled"}>파일 삭제</button>
        </div>
      `;
      return card;
    }));
  }

  function splitLines(value) {
    return value.split("\n").map((item) => item.trim()).filter(Boolean);
  }

  function parseCustomCategories(value) {
    return splitLines(value).reduce((categories, line) => {
      const [group, values] = line.split(":");
      if (!group || !values) return categories;
      categories[group.trim()] = values.split(",").map((item) => item.trim()).filter(Boolean);
      return categories;
    }, {});
  }

  function formatCustomCategories(customCategories) {
    return Object.entries(customCategories || {}).map(([group, values]) => `${group}: ${values.join(", ")}`).join("\n");
  }

  function getPendingTermsFromLibrary(settings) {
    const knownDepartments = settings.departments || [];
    const knownJobRoles = settings.jobRoles || [];
    const knownCategories = Object.values(settings.customCategories || {}).flat();
    const knownTags = (settings.tagAliases || []).flatMap((entry) => [entry.canonical, ...(entry.aliases || [])]);
    const now = new Date().toISOString();
    const terms = [];
    for (const item of libraryItems) {
      if (item.department && !knownDepartments.includes(item.department)) {
        terms.push({ type: "department", value: item.department, sourceCourseId: item.id, detectedAt: now });
      }
      if (item.jobRole && !knownJobRoles.includes(item.jobRole)) {
        terms.push({ type: "jobRole", value: item.jobRole, sourceCourseId: item.id, detectedAt: now });
      }
      for (const tag of item.tags || []) {
        const isKnownCategory = knownCategories.includes(tag);
        const isKnownTag = knownTags.includes(tag);
        if (!isKnownCategory && !isKnownTag) {
          terms.push({ type: "tag", value: tag, sourceCourseId: item.id, detectedAt: now });
        }
      }
    }
    const seen = new Set();
    return terms.filter((term) => {
      const key = `${term.type}:${term.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function renderClassificationSettings(settings) {
    classificationPanel.hidden = false;
    classificationPanel.querySelector("[data-classification-field='departments']").value = (settings.departments || []).join("\n");
    classificationPanel.querySelector("[data-classification-field='jobRoles']").value = (settings.jobRoles || []).join("\n");
    classificationPanel.querySelector("[data-classification-field='customCategories']").value = formatCustomCategories(settings.customCategories);
    const pendingTerms = [...(settings.pendingTerms || []), ...getPendingTermsFromLibrary(settings)];
    const pendingContainer = classificationPanel.querySelector("[data-classification-role='pendingTerms']");
    pendingContainer.innerHTML = `
      <strong>새 항목 후보 ${pendingTerms.length}개</strong>
      <ul>
        ${pendingTerms.map((term) => `<li>${term.type} · ${term.value}</li>`).join("") || "<li>새 항목 후보가 없습니다.</li>"}
      </ul>
    `;
  }

  async function openClassificationSettings() {
    if (!window.studyflow || !window.studyflow.loadClassificationSettings) {
      libraryStatus.textContent = "정적 미리보기에서는 분류 설정 저장을 사용할 수 없습니다.";
      return;
    }
    classificationSettings = await window.studyflow.loadClassificationSettings();
    renderClassificationSettings(classificationSettings);
  }

  async function saveClassificationSettingsFromPanel() {
    if (!window.studyflow || !window.studyflow.saveClassificationSettings || !classificationSettings) return;
    const pendingTerms = [...(classificationSettings.pendingTerms || []), ...getPendingTermsFromLibrary(classificationSettings)];
    classificationSettings = await window.studyflow.saveClassificationSettings({
      ...classificationSettings,
      departments: splitLines(classificationPanel.querySelector("[data-classification-field='departments']").value),
      jobRoles: splitLines(classificationPanel.querySelector("[data-classification-field='jobRoles']").value),
      customCategories: parseCustomCategories(classificationPanel.querySelector("[data-classification-field='customCategories']").value),
      pendingTerms
    });
    renderClassificationSettings(classificationSettings);
    libraryStatus.textContent = "분류/태그 설정을 저장했습니다.";
  }

  function renderValidationResult(result) {
    lastShareValidation = result;
    if (result.summary.errors > 0 || result.summary.warnings === 0) {
      shareWarningsAccepted = false;
    }
    const showWarningConfirmation = result.summary.errors === 0 && result.summary.warnings > 0;
    validationPanel.hidden = false;
    validationPanel.innerHTML = `
      <strong>공유 전 검사: 오류 ${result.summary.errors}개 · 경고 ${result.summary.warnings}개</strong>
      <button class="validation-fix" type="button" data-library-action="autofix-share">자동 수정</button>
      ${showWarningConfirmation ? `
        <label class="validation-confirm">
          <input type="checkbox" data-library-action="confirm-share-warnings" ${shareWarningsAccepted ? "checked" : ""}>
          경고를 확인했고 공유를 계속합니다.
        </label>
      ` : ""}
      <ul>
        ${result.issues.map((issue) => `<li data-level="${issue.level}">${issue.level.toUpperCase()} · ${issue.message}</li>`).join("") || "<li>공유 가능한 상태입니다.</li>"}
      </ul>
    `;
  }

  async function validateShareForExport() {
    const result = window.studyflow && window.studyflow.validateShare
      ? await window.studyflow.validateShare(courseMeta, scenario)
      : {
        summary: { ok: true, errors: 0, warnings: 1 },
        issues: [{ level: "warning", code: "electron-required", message: "정적 미리보기에서는 Electron 공유 검사를 실행할 수 없습니다." }]
      };
    renderValidationResult(result);
    return result;
  }

  async function getShareGate(result) {
    if (window.studyflow && window.studyflow.getShareGate) {
      return window.studyflow.getShareGate(result, shareWarningsAccepted);
    }
    const errors = result.summary.errors || 0;
    const warnings = result.summary.warnings || 0;
    if (errors > 0) {
      return { allowed: false, reason: "errors", message: "공유 전 검사 오류가 있어 내보내기를 차단했습니다." };
    }
    if (warnings > 0 && !shareWarningsAccepted) {
      return { allowed: false, reason: "warnings-unconfirmed", message: "경고를 확인한 뒤 다시 내보내세요." };
    }
    return { allowed: true, reason: warnings > 0 ? "warnings-accepted" : "clean", message: "공유 가능한 상태입니다." };
  }

  async function canExportScenario() {
    const result = await validateShareForExport();
    const gate = await getShareGate(result);
    libraryStatus.textContent = gate.message;
    if (!gate.allowed) {
      showLibrary();
    }
    return gate.allowed;
  }

  async function saveLibraryStore(statusMessage) {
    if (!window.studyflow || !window.studyflow.writeLibraryStore) return;
    const store = window.StudyFlowLibrary.createLibraryStore(libraryItems, recentScanFolders);
    await window.studyflow.writeLibraryStore(store);
    libraryStatus.textContent = statusMessage;
  }

  function renderFilterOptions() {
    const groupedItems = window.StudyFlowLibrary.groupLatestLibraryItems(libraryItems);
    const departments = window.StudyFlowLibrary.getUniqueFilterValues(groupedItems, "department");
    const jobRoles = window.StudyFlowLibrary.getUniqueFilterValues(groupedItems, "jobRole");
    const currentDepartment = departmentFilter.value;
    const currentJobRole = jobRoleFilter.value;
    departmentFilter.replaceChildren(new Option("전체", ""), ...departments.map((value) => new Option(value, value)));
    jobRoleFilter.replaceChildren(new Option("전체", ""), ...jobRoles.map((value) => new Option(value, value)));
    departmentFilter.value = departments.includes(currentDepartment) ? currentDepartment : "";
    jobRoleFilter.value = jobRoles.includes(currentJobRole) ? currentJobRole : "";
  }

  function loadScenario(nextScenario) {
    scenario = window.StudyFlowSchema.normalizeScenario(nextScenario);
    state = window.StudyFlowState.createOverlayState(scenario);
    editor = window.StudyFlowEditor.createEditor({
      state,
      render,
      onApply: () => scheduleAutosave("step-edited")
    });
    syncCurrentCoursePackage();
    libraryItems = window.StudyFlowLibrary.createLibraryItems([scenario], [courseMeta]);
    renderLibrary();
  }

  async function handleAction(action) {
    if (action === "next") {
      state.next();
      editor.loadCurrentStep();
    }
    if (action === "previous") {
      state.previous();
      editor.loadCurrentStep();
    }
    if (action === "click-through" || action === "click-through-on" || action === "click-through-off") {
      state.setClickThrough(!state.snapshot().clickThrough);
    }
    if (action === "editor-toggle") {
      editor.togglePanel();
    }
    if (action === "hide") {
      if (window.studyflow && window.studyflow.windowCommand) {
        await window.studyflow.windowCommand("minimize");
      } else {
        document.body.hidden = true;
      }
    }
    if (action === "save" && window.studyflow) {
      await window.studyflow.saveScenario(scenario);
      await appendCurrentChangeLog("교육 자료 저장");
      if (currentCoursePackage && window.studyflow.deleteAutosave) {
        await window.studyflow.deleteAutosave(currentCoursePackage.courseDir);
        libraryStatus.textContent = "저장 후 자동 저장본을 정리했습니다.";
      }
    }
    if (action === "open" && window.studyflow) {
      const result = await window.studyflow.openScenario();
      if (!result.canceled) {
        loadScenario(result.scenario);
      }
    }
    if (action === "capture") {
      await window.StudyFlowCapture.captureCurrentPage(state.getCurrentStep());
      scheduleAutosave("capture-linked");
    }
    if (action === "export-docx" && window.studyflow && await canExportScenario()) {
      await window.studyflow.exportScenario("docx", scenario);
    }
    if (action === "export-pptx" && window.studyflow && await canExportScenario()) {
      await window.studyflow.exportScenario("pptx", scenario);
    }
    if (action === "export-pdf" && window.studyflow && await canExportScenario()) {
      await window.studyflow.exportScenario("pdf", scenario);
    }
    render();
  }

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  librarySearch.addEventListener("input", renderLibrary);
  libraryList.addEventListener("click", async (event) => {
    const favoriteButton = event.target.closest("[data-library-favorite]");
    const startButton = event.target.closest("[data-library-start]");
    const removeButton = event.target.closest("[data-library-remove]");
    const deleteButton = event.target.closest("[data-library-delete]");
    const versionsButton = event.target.closest("[data-library-versions]");
    if (versionsButton) {
      const id = versionsButton.dataset.libraryVersions;
      if (expandedVersions.has(id)) {
        expandedVersions.delete(id);
      } else {
        expandedVersions.add(id);
      }
      renderLibrary();
    }
    if (favoriteButton) {
      libraryItems = window.StudyFlowLibrary.toggleFavorite(libraryItems, favoriteButton.dataset.libraryFavorite);
      renderFilterOptions();
      renderLibrary();
      saveLibraryStore("즐겨찾기 상태를 저장했습니다.");
    }
    if (removeButton) {
      libraryItems = window.StudyFlowLibrary.removeLibraryItem(libraryItems, removeButton.dataset.libraryRemove);
      renderFilterOptions();
      renderLibrary();
      saveLibraryStore("보관함 목록에서 제거했습니다.");
    }
    if (deleteButton && window.studyflow && window.studyflow.deleteLibrarySource) {
      const item = libraryItems.find((candidate) => candidate.id === deleteButton.dataset.libraryDelete);
      const result = await window.studyflow.deleteLibrarySource(item);
      if (!result.canceled) {
        libraryItems = window.StudyFlowLibrary.removeLibraryItem(libraryItems, item.id);
        renderFilterOptions();
        renderLibrary();
        saveLibraryStore("실제 파일을 삭제하고 목록에서 제거했습니다.");
      }
    }
    if (startButton) {
      const item = libraryItems.find((candidate) => candidate.id === startButton.dataset.libraryStart);
      if (item) {
        loadScenario(item.scenario);
        showOverlay();
      }
    }
  });

  document.querySelector("[data-library-action='new']").addEventListener("click", showOverlay);
  document.querySelectorAll("[data-library-status]").forEach((button) => {
    button.addEventListener("click", () => {
      activeLibraryStatus = button.dataset.libraryStatus;
      document.querySelectorAll("[data-library-status]").forEach((tab) => {
        tab.classList.toggle("library-tab--active", tab === button);
      });
      renderLibrary();
    });
  });
  document.querySelector("[data-library-action='scan-folder']").addEventListener("click", async () => {
    if (!window.studyflow || !window.studyflow.scanLibraryFolder) {
      renderLibrary();
      return;
    }
    const result = await window.studyflow.scanLibraryFolder();
    if (!result.canceled) {
      const scannedItems = result.items.map(window.StudyFlowLibrary.createLibraryItemFromScannedMeta);
      libraryItems = [...libraryItems.filter((item) => item.scenario), ...scannedItems];
      recentScanFolders = [result.folderPath, ...recentScanFolders.filter((folder) => folder !== result.folderPath)].slice(0, 10);
      renderFilterOptions();
      renderLibrary();
      saveLibraryStore(`${scannedItems.length}개 교육 자료를 보관함에 저장했습니다.`);
    }
  });
  document.querySelector("[data-library-action='refresh-status']").addEventListener("click", async () => {
    if (!window.studyflow || !window.studyflow.refreshLibraryStatus) {
      renderLibrary();
      return;
    }
    libraryItems = await window.studyflow.refreshLibraryStatus(libraryItems);
    renderFilterOptions();
    renderLibrary();
    saveLibraryStore("자료 위치 상태를 갱신했습니다.");
  });
  document.querySelector("[data-library-action='classification-settings']").addEventListener("click", openClassificationSettings);
  document.querySelector("[data-library-action='close-classification-settings']").addEventListener("click", () => {
    classificationPanel.hidden = true;
  });
  document.querySelector("[data-library-action='save-classification-settings']").addEventListener("click", saveClassificationSettingsFromPanel);
  document.querySelector("[data-library-action='validate-share']").addEventListener("click", async () => {
    const result = window.studyflow && window.studyflow.validateShare
      ? await window.studyflow.validateShare(courseMeta, scenario)
      : {
        summary: { ok: true, errors: 0, warnings: 1 },
        issues: [{ level: "warning", code: "electron-required", message: "정적 미리보기에서는 Electron 공유 검사를 실행할 수 없습니다." }]
      };
    renderValidationResult(result);
  });
  validationPanel.addEventListener("click", async (event) => {
    if (!event.target.closest("[data-library-action='autofix-share']")) return;
    if (!window.studyflow || !window.studyflow.autofixShareMeta) {
      libraryStatus.textContent = "정적 미리보기에서는 자동 수정을 실행할 수 없습니다.";
      return;
    }
    courseMeta = await window.studyflow.autofixShareMeta(courseMeta, scenario);
    const result = await window.studyflow.validateShare(courseMeta, scenario);
    renderValidationResult(result);
    libraryStatus.textContent = "자동 수정 가능한 메타데이터를 보정했습니다.";
  });
  validationPanel.addEventListener("change", (event) => {
    if (!event.target.matches("[data-library-action='confirm-share-warnings']")) return;
    shareWarningsAccepted = event.target.checked;
    if (lastShareValidation) {
      libraryStatus.textContent = shareWarningsAccepted ? "공유 경고를 확인했습니다." : "공유 경고 확인이 해제되었습니다.";
    }
  });

  if (window.studyflow) {
    window.studyflow.onShortcut(handleAction);
  }

  [departmentFilter, jobRoleFilter, categoryFilter].forEach((input) => {
    input.addEventListener("input", renderLibrary);
    input.addEventListener("change", renderLibrary);
  });

  document.querySelector(".overlay-shell").hidden = true;
  if (window.studyflow && window.studyflow.getCurrentCourseDir) {
    const courseDir = await window.studyflow.getCurrentCourseDir();
    currentCoursePackage = {
      courseDir,
      courseMeta,
      scenario,
      sharedSettings: {
        baseResolution: { width: 1920, height: 1080 },
        aspectRatio: "16:9"
      },
      openMode: {
        openMode: "editable",
        sourceType: "folder",
        sourcePath: courseDir,
        canEditOriginal: true,
        readOnlyReason: "",
        employeeId: "",
        canEnterEditMode: true,
        editSession: {
          copyCreated: false,
          originalCourseDir: "",
          tempCourseDir: ""
        }
      }
    };
    savedCourseSnapshot = cloneCoursePackage(currentCoursePackage);
    applyOpenModeToUi(currentCoursePackage.openMode);
    if (window.studyflow.findRecoverableAutosaves) {
      renderRecoverableAutosaves(await window.studyflow.findRecoverableAutosaves([courseDir]));
    }
    startAutosaveInterval();
  }
  await restoreLibraryStore();
  renderFilterOptions();
  renderLibrary();
  render();
})();
