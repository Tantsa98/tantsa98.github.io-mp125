// =====================================
//      CATEGORY PAGE MAIN SCRIPT
// =====================================

async function loadCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length);

  const headers = lines[0].split(",");
  const data = lines.slice(1).map(line => {
    const cols = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h] = cols[i]);
    return obj;
  });

  return data;
}

async function loadJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

// =====================================
//      DETECT CURRENT PAGE CATEGORY
// =====================================
function detectCategory() {
  const page = document.body.dataset.page;
  if (!page) {
    console.warn("⚠ data-page не встановлено у <body>");
  }
  return page; // rozvidka / bombers / fpv
}

// =====================================
//      APPLY CLOUD DATA TO NAMES
// =====================================
function mergeCloudCounts(items, cloudData) {
  if (!cloudData) return items;

  return items.map(item => {
    const name = item.Name;
    if (cloudData[name] !== undefined) {
      item.Name = `${name} (${cloudData[name]})`;
    }
    return item;
  });
}

// =====================================
//              MAIN
// =====================================
async function initCategoryPage() {
  const category = detectCategory();

  const [items, mediaIndex, cloud] = await Promise.all([
    loadCSV("data/BK.csv"),
    loadJSON("data/media-index.json"),
    loadJSON("https://old-fog-c80a.tantsa98.workers.dev")
  ]);

  // Вибираємо відповідний об’єкт з Cloudflare
  const cloudData = cloud?.[category] ?? null;

  // Фільтруємо BK.csv за категорією сторінки
  const filtered = items.filter(x => x.Category === category);

  // Додаємо кількість (409), (395) і т.д.
  const merged = mergeCloudCounts(filtered, cloudData);

  // Рендеримо елементи
  renderGallery(merged, mediaIndex);
}

function renderGallery(items, mediaIndex) {
  const gallery = document.querySelector(".gallery");
  gallery.innerHTML = "";

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "card-item";
    div.dataset.id = item.ID;

    const imgs = mediaIndex[item.ID] || [];
    const cover = imgs.length ? `media/${imgs[0]}` : "";

    div.innerHTML = `
      ${cover ? `<img src="${cover}" class="fade-in" loading="lazy">` : ""}
      <h3>${item.Name}</h3>
      <p class="type">${item.Type}</p>
    `;

    div.addEventListener("click", () => openModal(item, mediaIndex));
    gallery.appendChild(div);
  });
}

// =====================================
//      MODAL HANDLING (твоя логіка)
// =====================================
function openModal(item, mediaIndex) {
  const modal = document.getElementById("modal");
  const overlay = document.getElementById("overlay");
  const title = document.getElementById("modalTitle");
  const type = document.getElementById("modalType");
  const list = document.getElementById("carousel");

  title.textContent = item.Name;
  type.textContent = item.Type;

  while (list.firstChild) list.removeChild(list.firstChild);

  const files = mediaIndex[item.ID] || [];

  files.forEach(file => {
    let el;
    if (file.endsWith(".mp4")) {
      el = document.createElement("video");
      el.src = "media/" + file;
      el.controls = true;
    } else {
      el = document.createElement("img");
      el.src = "media/" + file;
    }
    list.appendChild(el);
  });

  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

document.getElementById("modalClose").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("overlay").classList.add("hidden");
});

// запуск
initCategoryPage();
