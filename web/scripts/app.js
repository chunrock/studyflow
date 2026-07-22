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

  let editor = window.StudyFlowEditor.createEditor({ state, render });
  const library = document.querySelector("[data-role='library']");
  const librarySearch = document.querySelector("[data-library-role='search']");
  const libraryList = document.querySelector("[data-library-role='list']");
  const libraryStatus = document.querySelector("[data-library-role='status']");
  const validationPanel = document.querySelector("[data-library-role='validation']");
  const departmentFilter = document.querySelector("[data-library-filter='department']");
  const jobRoleFilter = document.querySelector("[data-library-filter='jobRole']");
  const categoryFilter = document.querySelector("[data-library-filter='category']");
  let recentScanFolders = [];
  const expandedVersions = new Set();
  let activeLibraryStatus = "normal";

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

  function renderValidationResult(result) {
    validationPanel.hidden = false;
    validationPanel.innerHTML = `
      <strong>공유 전 검사: 오류 ${result.summary.errors}개 · 경고 ${result.summary.warnings}개</strong>
      <button class="validation-fix" type="button" data-library-action="autofix-share">자동 수정</button>
      <ul>
        ${result.issues.map((issue) => `<li data-level="${issue.level}">${issue.level.toUpperCase()} · ${issue.message}</li>`).join("") || "<li>공유 가능한 상태입니다.</li>"}
      </ul>
    `;
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
    editor = window.StudyFlowEditor.createEditor({ state, render });
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
      document.body.hidden = true;
    }
    if (action === "save" && window.studyflow) {
      await window.studyflow.saveScenario(scenario);
    }
    if (action === "open" && window.studyflow) {
      const result = await window.studyflow.openScenario();
      if (!result.canceled) {
        loadScenario(result.scenario);
      }
    }
    if (action === "capture") {
      await window.StudyFlowCapture.captureCurrentPage(state.getCurrentStep());
    }
    if (action === "export-docx" && window.studyflow) {
      await window.studyflow.exportScenario("docx", scenario);
    }
    if (action === "export-pptx" && window.studyflow) {
      await window.studyflow.exportScenario("pptx", scenario);
    }
    if (action === "export-pdf" && window.studyflow) {
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

  if (window.studyflow) {
    window.studyflow.onShortcut(handleAction);
  }

  [departmentFilter, jobRoleFilter, categoryFilter].forEach((input) => {
    input.addEventListener("input", renderLibrary);
    input.addEventListener("change", renderLibrary);
  });

  document.querySelector(".overlay-shell").hidden = true;
  await restoreLibraryStore();
  renderFilterOptions();
  renderLibrary();
  render();
})();
