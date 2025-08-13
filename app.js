(function(){
  // Initial structure for the localStorage-backed database
  function defaultDB() {
    return {
      areas: {},          // { [id]: {id, title, desc, projectIds:[] } }
      projects: {},       // { [id]: {id, title, desc, areaId:null, tasks:[], resourceIds:[], status:'active'|'archived'} }
      resources: {},      // { [id]: {id, title, type:'link'|'note'|'file', url:'', notes:'', tags:[], areaId:null, projectIds:[] } }
      notes: {},          // { [id]: {id, title, content:'', areaId:null, projectId:null, tags:[]} }
      archive: {
        projectIds: [],
        resourceIds: [],
        areaIds: [],
      },
    };
  }

  function loadDB() {
    try {
      return JSON.parse(localStorage.getItem('db')) || defaultDB();
    } catch(e) {
      return defaultDB();
    }
  }

  function saveDB(db) {
    localStorage.setItem('db', JSON.stringify(db));
  }

  let uidCounter = 0;
  function uid(prefix) {
    uidCounter++;
    return `${prefix}-${Date.now()}-${uidCounter}`;
  }

  function addArea(title, desc = "") {
    const db = loadDB();
    const id = uid('area');
    db.areas[id] = { id, title, desc, projectIds: [] };
    saveDB(db);
    return id;
  }

  function addProject(title, { areaId = null, desc = "", tasks = [], resourceIds = [], status = 'active' } = {}) {
    const db = loadDB();
    const id = uid('proj');
    db.projects[id] = { id, title, desc, areaId, tasks, resourceIds, status };
    if (areaId && db.areas[areaId]) {
      db.areas[areaId].projectIds.push(id);
    }
    saveDB(db);
    return id;
  }

  function addResource(title, { type = 'link', url = '', notes = '', tags = [], areaId = null, projectIds = [] } = {}) {
    const db = loadDB();
    const id = uid('res');
    db.resources[id] = { id, title, type, url, notes, tags, areaId, projectIds };
    saveDB(db);
    return id;
  }

  function addNote(title, { content = "", areaId = null, projectId = null, tags = [] } = {}) {
    const db = loadDB();
    const id = uid('note');
    db.notes[id] = { id, title, content, areaId, projectId, tags };
    saveDB(db);
    return id;
  }

  function openProjectModal() { alert('openProjectModal não implementado'); }
  function openResourceModal() { alert('openResourceModal não implementado'); }
  function archiveItem() {}
  function persistGrid() {}
  function renderArchive() {}
  function showToast(msg) { console.log(msg); }
  function escapeHtml(str) {
    return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');

  function openAreaModal(card) {
    const title = card.querySelector(".title")?.textContent || "Área";
    const id = card.dataset.id;
    const db = loadDB();
    const area = db.areas[id];

    modalTitle.textContent = title;
    modalContent.innerHTML = `
      <div style="display:grid; gap:12px;">
        <input id="areaDesc" type="text" placeholder="Descrição da área"
               style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--stroke);background:#0f1320;color:#e7edf7;"/>
        
        <div class="area-columns">
          <!-- PROJETOS -->
          <div class="subcard" id="areaProjCard">
            <h4>Projetos</h4>
            <div class="muted">Vinculados a esta área</div>
            <div class="list" id="areaProjList"></div>
            <div class="btnline">
              <input id="newProjName" type="text" placeholder="Novo projeto..." />
              <button class="btn" id="addProjInArea">Adicionar</button>
            </div>
          </div>

          <!-- NOTAS -->
          <div class="subcard" id="areaNotesCard">
            <h4>Notas</h4>
            <div class="muted">Rascunhos, ideias e registros da área</div>
            <div class="list" id="areaNotesList"></div>
            <div class="btnline">
              <input id="newNoteTitle" type="text" placeholder="Título da nota..." />
              <button class="btn" id="addNoteInArea">Adicionar</button>
            </div>
          </div>

          <!-- RECURSOS -->
          <div class="subcard" id="areaResCard">
            <h4>Recursos</h4>
            <div class="muted">Links, arquivos e notas técnicas desta área</div>
            <div class="list" id="areaResList"></div>
            <div class="btnline">
              <input id="newResTitle" type="text" placeholder="Novo recurso..." />
              <select id="newResType" style="padding:8px;border-radius:8px;border:1px solid var(--stroke);background:#0f1320;color:#e7edf7;">
                <option value="note">Nota</option>
                <option value="link">Link</option>
                <option value="file">Arquivo</option>
              </select>
              <button class="btn" id="addResInArea">Adicionar</button>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button id="archiveArea" class="btn ghost">Arquivar área</button>
          <button id="deleteArea" class="btn danger">Excluir área</button>
        </div>
      </div>
    `;

    const descEl = modalContent.querySelector("#areaDesc");
    const projList = modalContent.querySelector("#areaProjList");
    const addProjBtn = modalContent.querySelector("#addProjInArea");
    const newProjName = modalContent.querySelector("#newProjName");

    const notesList = modalContent.querySelector("#areaNotesList");
    const addNoteBtn = modalContent.querySelector("#addNoteInArea");
    const newNoteTitle = modalContent.querySelector("#newNoteTitle");

    const resList = modalContent.querySelector("#areaResList");
    const addResBtn = modalContent.querySelector("#addResInArea");
    const newResTitle = modalContent.querySelector("#newResTitle");
    const newResType = modalContent.querySelector("#newResType");

    const archiveBtn = modalContent.querySelector("#archiveArea");
    const deleteBtn = modalContent.querySelector("#deleteArea");

    // estado inicial
    descEl.value = area.desc || "";

    descEl.addEventListener("change", () => {
      const db = loadDB();
      db.areas[id].desc = descEl.value;
      saveDB(db);
    });

    // ---- renderizações ----
    function renderProjects() {
      const db = loadDB();
      const a = db.areas[id];
      projList.innerHTML = "";
      if (!a.projectIds.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "Nenhum projeto nesta área ainda.";
        projList.appendChild(empty);
      } else {
        a.projectIds.forEach((pid) => {
          const p = db.projects[pid];
          if (!p) return;
          const row = document.createElement("div");
          row.className = "row";
          row.innerHTML = `
            <div style="flex:1;font-weight:600;">${escapeHtml(p.title)}</div>
            <button class="btn" data-open="${pid}">Abrir</button>
            <button class="btn ghost" data-unlink="${pid}">Desvincular</button>
          `;
          row.querySelector(`[data-open="${pid}"]`).addEventListener("click", () => {
            const dummy = document.createElement("div");
            dummy.className = "card item-card project-card";
            dummy.dataset.type = "project";
            dummy.dataset.id = pid;
            dummy.innerHTML = `<div class="title">${escapeHtml(p.title)}</div>`;
            openProjectModal(dummy);
          });
          row.querySelector(`[data-unlink="${pid}"]`).addEventListener("click", () => {
            const db = loadDB();
            db.areas[id].projectIds = db.areas[id].projectIds.filter(x => x !== pid);
            if (db.projects[pid]) db.projects[pid].areaId = null;
            saveDB(db);
            renderProjects();
            showToast("Projeto desvinculado");
          });
          projList.appendChild(row);
        });
      }
    }

    function renderNotes() {
      const db = loadDB();
      const list = Object.values(db.notes).filter(n => n.areaId === id);
      notesList.innerHTML = "";
      if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "Sem notas ainda.";
        notesList.appendChild(empty);
        return;
      }
      list.forEach(n => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `
          <div style="flex:1;font-weight:600;">${escapeHtml(n.title)}</div>
          <button class="btn" data-edit="${n.id}">Editar</button>
          <button class="btn ghost" data-del="${n.id}">Excluir</button>
        `;
        row.querySelector(`[data-edit="${n.id}"]`).addEventListener("click", () => {
          const db = loadDB();
          const note = db.notes[n.id];
          const newTitle = prompt("Título da nota:", note.title) ?? note.title;
          const newContent = prompt("Conteúdo (texto curto):", note.content ?? "") ?? note.content;
          note.title = newTitle.trim() || note.title;
          note.content = newContent;
          saveDB(db);
          renderNotes();
        });
        row.querySelector(`[data-del="${n.id}"]`).addEventListener("click", () => {
          if (!confirm("Excluir esta nota?")) return;
          const db = loadDB();
          delete db.notes[n.id];
          saveDB(db);
          renderNotes();
          showToast("Nota excluída");
        });
        notesList.appendChild(row);
      });
    }

    function renderResources() {
      const db = loadDB();
      const list = Object.values(db.resources).filter(r => r.areaId === id);
      resList.innerHTML = "";
      if (!list.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "Sem recursos nesta área.";
        resList.appendChild(empty);
        return;
      }
      list.forEach(r => {
        const row = document.createElement("div");
        row.className = "row";
        const extra = r.url ? ` — ${r.url}` : "";
        row.innerHTML = `
          <div style="flex:1;font-weight:600;">${escapeHtml(r.title)}</div>
          <div class="muted">${r.type}${extra ? escapeHtml(extra) : ""}</div>
          <button class="btn" data-open="${r.id}">Abrir</button>
          <button class="btn ghost" data-unlink="${r.id}">Desvincular</button>
        `;
        row.querySelector(`[data-open="${r.id}"]`).addEventListener("click", () => {
          const dummy = document.createElement("div");
          dummy.className = "card item-card";
          dummy.dataset.type = "resource";
          dummy.dataset.id = r.id;
          dummy.innerHTML = `<div class="title">${escapeHtml(r.title)}</div>`;
          openResourceModal(dummy);
        });
        row.querySelector(`[data-unlink="${r.id}"]`).addEventListener("click", () => {
          const db = loadDB();
          if (db.resources[r.id]) db.resources[r.id].areaId = null;
          saveDB(db);
          renderResources();
          showToast("Recurso desvinculado");
        });
        resList.appendChild(row);
      });
    }

    // ---- ações de adicionar ----
    addProjBtn.addEventListener("click", () => {
      const name = (newProjName.value || "").trim();
      if (!name) return;
      const pid = addProject(name, { areaId: id, desc: "" });
      const db = loadDB();
      if (!db.areas[id].projectIds.includes(pid)) db.areas[id].projectIds.push(pid);
      saveDB(db);
      newProjName.value = "";
      renderProjects();
      showToast("Projeto adicionado à área");
    });

    addNoteBtn.addEventListener("click", () => {
      const title = (newNoteTitle.value || "").trim();
      if (!title) return;
      addNote(title, { areaId: id, content: "" });
      newNoteTitle.value = "";
      renderNotes();
      showToast("Nota criada");
    });

    addResBtn.addEventListener("click", () => {
      const title = (newResTitle.value || "").trim();
      if (!title) return;
      const rid = addResource(title, { type: newResType.value, areaId: id });
      const dummy = document.createElement("div");
      dummy.className = "card item-card";
      dummy.dataset.type = "resource";
      dummy.dataset.id = rid;
      dummy.innerHTML = `<div class="title">${escapeHtml(title)}</div>`;
      openResourceModal(dummy);
      newResTitle.value = "";
      renderResources();
      showToast("Recurso criado");
    });

    // ---- arquivar/excluir área ----
    const originalDelete = () => {
      const db = loadDB();
      const a = db.areas[id];
      a.projectIds.forEach((pid) => { if (db.projects[pid]) db.projects[pid].areaId = null; });
      Object.values(db.notes).forEach(n => { if (n.areaId === id) n.areaId = null; });
      Object.values(db.resources).forEach(r => { if (r.areaId === id) r.areaId = null; });
      delete db.areas[id];
      db.archive.areaIds = db.archive.areaIds.filter((aid) => aid !== id);
      saveDB(db);
      card.remove();
      persistGrid("areas");
      renderArchive();
      showToast("Área excluída");
      modalBackdrop.style.display = "none";
    };

    archiveBtn.addEventListener("click", () => {
      if (confirm("Arquivar esta área?")) {
        archiveItem("area", id);
        card.remove();
        persistGrid("areas");
        renderArchive();
        showToast("Área arquivada");
        modalBackdrop.style.display = "none";
      }
    });

    deleteBtn.addEventListener("click", () => {
      if (confirm("Excluir definitivamente esta área?")) originalDelete();
    });

    // iniciar
    renderProjects();
    renderNotes();
    renderResources();
    modalBackdrop.style.display = "flex";
    modalBackdrop.setAttribute("aria-hidden", "false");
  }

  const addAreaBtn = document.getElementById('addAreaBtn');
  const areasGrid = document.getElementById('areasGrid');

  if (addAreaBtn) {
    addAreaBtn.addEventListener('click', () => {
      const name = prompt('Nome da área?');
      if (!name) return;
      const newId = addArea(name, "");
      const card = document.createElement('div');
      card.className = 'card item-card';
      card.dataset.type = 'area';
      card.dataset.id = newId;
      card.innerHTML = `<div class="title">${escapeHtml(name)}</div>`;
      areasGrid.appendChild(card);
      setTimeout(() => {
        const dummy = document.createElement('div');
        dummy.className = 'card item-card';
        dummy.dataset.type = 'area';
        dummy.dataset.id = newId;
        dummy.innerHTML = `<div class="title">${escapeHtml(name)}</div>`;
        openAreaModal(dummy);
      }, 0);
    });
  }

  window.defaultDB = defaultDB;
  window.addArea = addArea;
  window.addProject = addProject;
  window.addResource = addResource;
  window.addNote = addNote;
  window.openAreaModal = openAreaModal;
})();
