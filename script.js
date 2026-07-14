(function () {
    const FIELDS = [
        { key: "name", label: "Name", type: "text" },
        { key: "cut_speed", label: "Cut Speed", type: "number" },
        { key: "cut_power", label: "Cut Power", type: "number" },
        { key: "corner_power", label: "Corner Power", type: "number" },
        { key: "engrave_speed", label: "Engrave Speed", type: "number" },
        { key: "engrave_power", label: "Engrave Power", type: "number" }
    ];

    let data = null;
    let materials = [];
    let originalFilename = "materials.json";
    let idCounter = 0;

    const el = (sel) => document.querySelector(sel);
    const fileInput = el("#fileInput");
    const dropzone = el("#dropzone");
    const toolbar = el("#toolbar");
    const board = el("#board");
    const filenameLabel = el("#filenameLabel");
    const exportBtn = el("#exportBtn");
    const toast = el("#toast");
    const searchInput = el("#searchInput");
    const hintFooter = el("#hintFooter");

    function showToast(msg, isErr) {
        toast.textContent = msg;
        toast.className = "toast show" + (isErr ? " err" : "");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => (toast.className = "toast"), 2200);
    }

    function uid() {
        return "m" + idCounter++;
    }

    function loadFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed || !Array.isArray(parsed.materials)) {
                    throw new Error('JSON must contain a top-level "materials" array');
                }
                data = parsed;
                materials = parsed.materials.map((m) => ({ ...m, _id: uid() }));
                originalFilename = file.name || "materials.json";
                filenameLabel.textContent = originalFilename;
                filenameLabel.title = originalFilename;
                exportBtn.disabled = false;
                dropzone.classList.remove("show");
                toolbar.classList.add("show");
                board.classList.add("show");
                //hintFooter.style.display = "block";
                render();
                showToast("Loaded " + materials.length + " materials");
            } catch (err) {
                showToast("Could not parse JSON: " + err.message, true);
            }
        };
        reader.readAsText(file);
    }

    function startNew() {
        data = { materials: [] };
        materials = [];
        originalFilename = "materials.json";
        filenameLabel.textContent = "untitled — new file";
        exportBtn.disabled = false;
        dropzone.classList.remove("show");
        toolbar.classList.add("show");
        board.classList.add("show");
        //hintFooter.style.display = "block";
        render();
        addCategory("New Category");
    }

    function getCategories() {
        const order = [];
        const seen = new Set();
        materials.forEach((m) => {
            const c = m.category || "Uncategorized";
            if (!seen.has(c)) {
                seen.add(c);
                order.push(c);
            }
        });
        return order;
    }

    function addMaterial(category) {
        materials.push({
            _id: uid(),
            name: "New Material",
            category: category,
            cut_speed: 0,
            cut_power: 0,
            corner_power: 50,
            engrave_speed: 0,
            engrave_power: 0
        });
        render();
    }

    function addCategory(name) {
        name = name || "New Category";
        materials.push({
            _id: uid(),
            name: "New Material",
            category: name,
            cut_speed: 0,
            cut_power: 0,
            corner_power: 50, //ain't the corner power always 50...
            engrave_speed: 0,
            engrave_power: 0
        });
        render();
    }

    function removeMaterial(id) {
        materials = materials.filter((m) => m._id !== id);
        render();
    }

    function renameCategory(oldName, newName) {
        if (!newName || newName === oldName) return;
        materials.forEach((m) => {
            if ((m.category || "Uncategorized") === oldName) m.category = newName;
        });
        render();
    }

    function removeCategory(name) {
        materials = materials.filter((m) => (m.category || "Uncategorized") !== name);
        render();
    }

    function updateField(id, key, value, type) {
        const m = materials.find((x) => x._id === id);
        if (!m) return;
        if (type === "number") {
            const n = parseFloat(value);
            m[key] = isNaN(n) ? 0 : n;
        } else {
            m[key] = value;
        }
    }
    
    // had AI to generate some of these, this is very breakable, however for now it's ok.

    function render() {
        const query = (searchInput.value || "").trim().toLowerCase();
        const categories = getCategories();
        board.innerHTML = "";

        el("#matCount").textContent = materials.length;
        el("#catCount").textContent = categories.length;

        if (categories.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-msg";
            empty.textContent = "No materials yet — add a category to get started.";
            board.appendChild(empty);
        }

        categories.forEach((cat) => {
            let rows = materials.filter((m) => (m.category || "Uncategorized") === cat);
            if (query) {
                rows = rows.filter(
                    (m) => (m.name || "").toLowerCase().includes(query) || cat.toLowerCase().includes(query)
                );
                if (rows.length === 0) return;
            }

            const wrap = document.createElement("div");
            wrap.className = "category";

            const head = document.createElement("div");
            head.className = "cat-head";
            head.innerHTML = `
        <div class="cat-head-left">
          <span class="cat-swatch"></span>
          <input class="cat-name" value="${escapeAttr(cat)}" data-old="${escapeAttr(cat)}">
          <span class="cat-count">${rows.length} item${rows.length === 1 ? "" : "s"}</span>
        </div>
        <button class="icon-btn cat-del" title="Delete category and its materials">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z"/></svg>
        </button>
      `;
            head.querySelector(".cat-name").addEventListener("change", (e) => {
                renameCategory(cat, e.target.value.trim() || cat);
            });
            head.querySelector(".cat-del").addEventListener("click", () => {
                if (confirm(`Remove category "${cat}" and its ${rows.length} material(s)?`)) {
                    removeCategory(cat);
                }
            });
            wrap.appendChild(head);

            const table = document.createElement("table");
            const thead = document.createElement("thead");
            thead.innerHTML =
                "<tr>" +
                FIELDS.map(
                    (f, i) =>
                        `<th class="${f.type === "number" ? "num" : ""} ${i > 2 ? "hide-mobile" : ""}">${f.label}</th>`
                ).join("") +
                "<th></th></tr>";
            table.appendChild(thead);

            const tbody = document.createElement("tbody");
            rows.forEach((m) => {
                const tr = document.createElement("tr");
                FIELDS.forEach((f, i) => {
                    const td = document.createElement("td");
                    if (f.type === "number") td.classList.add("numcol");
                    if (i > 2) td.classList.add("hide-mobile");
                    const input = document.createElement("input");
                    input.type = f.type === "number" ? "number" : "text";
                    input.value = m[f.key] ?? (f.type === "number" ? 0 : "");
                    input.className = f.type === "number" ? "numcell" : "";
                    if (f.type === "number") input.step = "any";
                    input.addEventListener("change", (e) => updateField(m._id, f.key, e.target.value, f.type));
                    td.appendChild(input);
                    tr.appendChild(td);
                });
                const actionTd = document.createElement("td");
                actionTd.className = "actions";
                const delBtn = document.createElement("button");
                delBtn.className = "icon-btn";
                delBtn.title = "Remove material";
                delBtn.innerHTML =
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
                delBtn.addEventListener("click", () => removeMaterial(m._id));
                actionTd.appendChild(delBtn);
                tr.appendChild(actionTd);
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            wrap.appendChild(table);

            const foot = document.createElement("div");
            foot.className = "cat-foot";
            const addBtn = document.createElement("button");
            addBtn.className = "add-row-btn";
            addBtn.textContent = "+ Add material to " + cat;
            addBtn.addEventListener("click", () => addMaterial(cat));
            foot.appendChild(addBtn);
            wrap.appendChild(foot);

            board.appendChild(wrap);
        });

        const addCatBtn = document.createElement("button");
        addCatBtn.className = "add-category-btn";
        addCatBtn.textContent = "+ Add new category";
        addCatBtn.addEventListener("click", () => {
            const name = prompt("New category name:", "New Category");
            if (name && name.trim()) addCategory(name.trim());
        });
        board.appendChild(addCatBtn);
    }

    function escapeAttr(s) {
        return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    }

    function exportJson() {
        if (!data) return;
        const clean = materials.map(({ _id, ...rest }) => rest);
        const out = { ...data, materials: clean };
        const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = originalFilename.endsWith(".json") ? originalFilename : originalFilename + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Exported " + a.download);
    }

    // el??????? what is that?
    el("#loadBtn").addEventListener("click", () => fileInput.click());
    el("#dropBrowseBtn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => loadFile(e.target.files[0]));
    exportBtn.addEventListener("click", exportJson);
    searchInput.addEventListener("input", render);
    el("#newFileBtn").addEventListener("click", () => {
        if (confirm("Discard current file and start a new empty one?")) startNew();
    });

    ["dragenter", "dragover"].forEach((evt) => {
        document.body.addEventListener(evt, (e) => {
            e.preventDefault();
            if (!data) dropzone.classList.add("drag");
        });
    });
    ["dragleave", "drop"].forEach((evt) => {
        document.body.addEventListener(evt, (e) => {
            e.preventDefault();
            dropzone.classList.remove("drag");
        });
    });
    document.body.addEventListener("drop", (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
    });
})();
