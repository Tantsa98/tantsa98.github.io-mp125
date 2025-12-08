// ==============================
// 1. ЗАВАНТАЖЕННЯ CSV
// ==============================

async function loadCSV() {
  const res = await fetch("BK.csv");
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(row => {
    const cols = row.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
    return obj;
  });
}

// ==============================
// 2. ЗАВАНТАЖЕННЯ ІНДЕКСУ МЕДІА
// ==============================

async function loadMediaIndex() {
  const res = await fetch("Media/media-index.json");
  return await res.json();
}

// ==============================
// 3. РЕНДЕР ФІЛЬТРІВ
// ==============================

function renderFilter(rootElem, items, name) {
  const set = [...new Set(items.filter(x => x && x !== ""))];
  rootElem.innerHTML = "";

  set.forEach(val => {
    const id = `${name}-${val}`.replace(/\s+/g, "_");
    const div = document.createElement("div");

    div.innerHTML = `
      <label>
        <input type="checkbox" value="${val}" id="${id}">
        ${val}
      </label>
    `;

    rootElem.appendChild(div);
  });
}

// ==============================
// 4. РЕНДЕР ГАЛЕРЕЇ
// ==============================

function renderGallery(data, mediaIndex) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  if (data.length === 0) {
    gallery.innerHTML = `<p class="empty">Нічого не знайдено.</p>`;
    return;
  }

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    // Перша картинка по imgId
    const mediaFiles = mediaIndex.filter(m => m.startsWith(item.imgId));
    const preview = mediaFiles.find(f => /\.(png|jpg|jpeg|gif)$/i.test(f));

    const imgSrc = preview ? `Media/${preview}` : "";

    card.innerHTML = `
      <img src="${imgSrc}" alt="">
      <div class="card-body">
        <p class="title">${item.Name}</p>
        <p class="meta">${item.Type}</p>
      </div>
    `;

    card.addEventListener("click", () => openModal(item, mediaFiles));
    gallery.appendChild(card);
  });
}

// ==============================
// 5. МОДАЛЬНЕ ВІКНО
// ==============================

function openModal(item, mediaFiles) {
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("modal");
  const mediaRoot = document.getElementById("mediaGallery");

  document.getElementById("modalName").textContent = item.Name;
  document.getElementById("modalType").textContent = item.Type;
  document.getElementById("modalAff").textContent = item.Affiliation;
  document.getElementById("modalDesc").textContent = item.Desc;

  mediaRoot.innerHTML = "";
  mediaFiles.forEach(f => {
    if (/\.(png|jpg|jpeg|gif)$/i.test(f)) {
      const img = document.createElement("img");
      img.src = `Media/${f}`;
      mediaRoot.appendChild(img);
    } else if (/\.(mp4|webm)$/i.test(f)) {
      const vid = document.createElement("video");
      vid.src = `Media/${f}`;
      vid.controls = true;
      mediaRoot.appendChild(vid);
    }
  });

  overlay.style.display = "flex";
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("overlay").style.display = "none";
});

// Закриття по кліку на фон
document.getElementById("overlay").addEventListener("click", e => {
  if (e.target.id === "overlay") {
    document.getElementById("overlay").style.display = "none";
  }
});

// ==============================
// 6. ФІЛЬТРАЦІЯ
// ==============================

function getChecked(root) {
  return [...root.querySelectorAll("input[type=checkbox]:checked")].map(x => x.value);
}

function applyFilters(data) {
  const types = getChecked(document.getElementById("typeFilter"));
  const affs = getChecked(document.getElementById("affFilter"));

  return data.filter(x => {
    const okType = types.length ? types.includes(x.Type) : true;
    const okAff = affs.length ? affs.includes(x.Affiliation) : true;
    return okType && okAff;
  });
}

// ==============================
// 7. ІНІЦІАЛІЗАЦІЯ
// ==============================

async function main() {
  const data = await loadCSV();
  const mediaIndex = await loadMediaIndex();

  // Рендер фільтрів
  renderFilter(
    document.getElementById("typeFilter"),
    data.map(x => x.Type),
    "type"
  );

  renderFilter(
    document.getElementById("affFilter"),
    data.map(x => x.Affiliation),
    "aff"
  );

  // Рендер початкової галереї
  renderGallery(data, mediaIndex);

  // Обновлення галереї при зміні фільтрів
  document.getElementById("typeFilter").addEventListener("change", () => {
    renderGallery(applyFilters(data), mediaIndex);
  });

  document.getElementById("affFilter").addEventListener("change", () => {
    renderGallery(applyFilters(data), mediaIndex);
  });

  // Кнопки скидання
  document.getElementById("resetType").addEventListener("click", () => {
    document.querySelectorAll("#typeFilter input").forEach(i => (i.checked = false));
    renderGallery(applyFilters(data), mediaIndex);
  });

  document.getElementById("resetAff").addEventListener("click", () => {
    document.querySelectorAll("#affFilter input").forEach(i => (i.checked = false));
    renderGallery(applyFilters(data), mediaIndex);
  });
}

main();
