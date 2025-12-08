// category.js
(function(){
  const category = document.documentElement.getAttribute('data-category') || document.body.getAttribute('data-category');

  const filtersRoot = document.getElementById('filters');
  const galleryRoot = document.getElementById('gallery');
  const clearBtn = document.getElementById('clearFilters');

  const overlay = document.getElementById('overlay');
  const closeModal = document.getElementById('closeModal');
  const mName = document.getElementById('mName');
  const mType = document.getElementById('mType');
  const mAff = document.getElementById('mAff');
  const mDesc = document.getElementById('mDesc');

  // carousel elements
  const carouselImg = document.getElementById('carouselImg');
  const prevBtn = document.getElementById('prevImg');
  const nextBtn = document.getElementById('nextImg');
  const imgCount = document.getElementById('imgCount');

  let currentImages = [];
  let currentIndex = 0;
  let categoryData = [];
  let allMedia = [];

  // ------------------------------
  // LOAD LIST OF FILES FROM /images/
  // ------------------------------
  /*async function loadMediaList() {
    try {
      const r = await fetch("images/"); // GitHub Pages дає HTML-лістинг
      const text = await r.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");

      return [...doc.querySelectorAll("a")]
        .map(a => a.getAttribute("href"))
        .filter(f => f && f.match(/\.(png|jpg|jpeg|webp|mp4)$/i));
    } catch (e) {
      console.error("Помилка завантаження списку медіа:", e);
      return [];
    }
  }*/
  async function loadMediaList() {
  try {
    const r = await fetch("data/media-index.json");
    return await r.json();
  } catch (e) {
    console.error("Помилка завантаження media-index.json:", e);
    return [];
  }
}



  // ------------------------------
  // SHOW / HIDE POPUP
  // ------------------------------
  function setOverlayVisible(visible){
    if(visible){
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden','false');
    } else {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
    }
  }


  // ------------------------------
  // FILTERS
  // ------------------------------
  function renderFilters(types){
    if(!filtersRoot) return;
    filtersRoot.innerHTML = '';
    if(!types.length){
      filtersRoot.innerHTML = '<p class="muted">Немає варіантів</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    types.forEach(t => {
      const id = 'f_'+t.replace(/\s+/g,'_');
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${t}" id="${id}"> ${t}`;
      frag.appendChild(label);
    });
    filtersRoot.appendChild(frag);
  }

  function getSelectedTypes(){
    if(!filtersRoot) return [];
    return Array.from(filtersRoot.querySelectorAll('input:checked')).map(i => i.value);
  }

  function filterByTypes(data, selected){
    if(!selected || selected.length===0) return data;
    return data.filter(d => selected.includes(d.Type));
  }


  // ------------------------------
  // GALLERY
  // ------------------------------
  function renderGallery(data){
    galleryRoot.innerHTML = '';
    if(!data.length){
      galleryRoot.innerHTML = '<p class="muted">Нічого не знайдено.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card-item';
      card.tabIndex = 0;
      card.setAttribute('role','button');
      card.innerHTML = `<h3>${item.Name}</h3><p class="type">${item.Type}</p>`;
      card.addEventListener('click', () => openModal(item));
      card.addEventListener('keydown', e => { if(e.key==='Enter') openModal(item); });
      frag.appendChild(card);
    });
    galleryRoot.appendChild(frag);
  }


  // ------------------------------
  // OPEN MODAL & LOAD IMAGES
  // ------------------------------
  async function openModal(item){
    if (!allMedia.length) allMedia = await loadMediaList();

    mName.textContent = item.Name || '';
    mType.textContent = item.Type || '';
    mAff.textContent = item.Affiliation || '';
    mDesc.textContent = item.Desc || '';

    const imgId = (item.imgId || "").trim().toLowerCase();

    // вибір файлів: prefix === imgId
    currentImages = allMedia.filter(filename => {
      const lower = filename.toLowerCase();
      if (!lower.includes("#")) return false;
      const prefix = lower.split("#")[0];
      return prefix === imgId;
    });

    currentIndex = 0;
    updateCarousel();
    setOverlayVisible(true);
  }


  // ------------------------------
  // CAROUSEL
  // ------------------------------
  function updateCarousel(){
    if(!currentImages.length){
      carouselImg.src = '';
      carouselImg.alt = 'Без медіа';
      imgCount.textContent = '0 / 0';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
    }

    const src = 'images/' + currentImages[currentIndex];
    carouselImg.src = src;
    carouselImg.alt = currentImages[currentIndex];

    imgCount.textContent = (currentIndex+1) + ' / ' + currentImages.length;

    prevBtn.style.display = currentImages.length > 1 ? 'block' : 'none';
    nextBtn.style.display = currentImages.length > 1 ? 'block' : 'none';
  }

  function prevImage(){
    if(!currentImages.length) return;
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateCarousel();
  }

  function nextImage(){
    if(!currentImages.length) return;
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateCarousel();
  }


  // ------------------------------
  // EVENTS
  // ------------------------------
  function attachEvents(){
    if(!filtersRoot) return;

    filtersRoot.addEventListener('change', () => {
      const selected = getSelectedTypes();
      const filtered = filterByTypes(categoryData, selected);
      renderGallery(filtered);
    });

    if(clearBtn) clearBtn.addEventListener('click', () => {
      Array.from(filtersRoot.querySelectorAll('input')).forEach(i => i.checked = false);
      renderGallery(categoryData);
    });

    if(closeModal) closeModal.addEventListener('click', () => setOverlayVisible(false));
    if(overlay) overlay.addEventListener('click', e => { if(e.target === overlay) setOverlayVisible(false); });

    prevBtn.addEventListener('click', prevImage);
    nextBtn.addEventListener('click', nextImage);
  }


  // ------------------------------
  // INIT
  // ------------------------------
  async function init(){
    attachEvents();

    const all = await window.App.loadCSV();

    // фільтруємо БК за категорією
    categoryData = all.filter(it =>
      (it.Affiliation || '').trim().toLowerCase().includes((category || '').trim().toLowerCase())
    );

    const types = window.App.utils.unique(categoryData.map(d => d.Type));

    renderFilters(types);
    renderGallery(categoryData);
  }

  init();
})();
