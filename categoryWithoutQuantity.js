// category.js
(function(){

  const category = document.documentElement.getAttribute('data-category')
    || document.body.getAttribute('data-category');

  const filtersRoot = document.getElementById('filters');
  const galleryRoot = document.getElementById('gallery');
  const clearBtn = document.getElementById('clearFilters');

  const overlay = document.getElementById('overlay');
  const closeModal = document.getElementById('closeModal');
  const mName = document.getElementById('mName');
  const mType = document.getElementById('mType');
  const mAff = document.getElementById('mAff');
  const mDesc = document.getElementById('mDesc');

  const prevBtn = document.getElementById('prevImg');
  const nextBtn = document.getElementById('nextImg');
  const imgCount = document.getElementById('imgCount');
  let carouselEl = document.getElementById('carouselImg');

  let currentImages = [];
  let currentIndex = 0;
  let categoryData = [];

  let mediaIndex = null;

  async function loadMediaIndex(){
    if (mediaIndex) return mediaIndex;
    try {
      const res = await fetch('data/media-index.json');
      mediaIndex = await res.json();
      return mediaIndex;
    } catch (e){
      console.error("Не вдалося завантажити media-index.json", e);
      mediaIndex = [];
      return mediaIndex;
    }
  }

  async function findMediaByImgId(imgId){
    const all = await loadMediaIndex();
    return all.filter(name => name.startsWith(imgId + "#"));
  }

  function setOverlayVisible(visible){
    if(visible){
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden','false');
    } else {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
    }
  }

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
    return Array.from(filtersRoot.querySelectorAll('input:checked'))
      .map(i => i.value);
  }

  function filterByTypes(data, selected){
    if(!selected.length) return data;
    return data.filter(d => selected.includes(d.Type));
  }

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
      card.addEventListener('keydown', e => { 
        if(e.key === 'Enter') openModal(item);
      });

      frag.appendChild(card);
    });

    galleryRoot.appendChild(frag);
  }

  async function openModal(item){
    mName.textContent = item.Name || '';
    mType.textContent = item.Type || '';
    mAff.textContent = item.Affiliation || '';
    mDesc.textContent = item.Desc || '';

    const imgId = (item.imgId || '').trim();
    currentImages = await findMediaByImgId(imgId);

    currentIndex = 0;
    updateCarousel();
    setOverlayVisible(true);
  }

  function updateCarousel(){
    if(!currentImages.length){
      carouselEl.replaceWith(carouselEl.cloneNode());
      carouselEl = document.getElementById('carouselImg');
      imgCount.textContent = '0 / 0';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
    }

    const file = currentImages[currentIndex];
    const ext = file.split('.').pop().toLowerCase();
    const url = 'media/' + encodeURIComponent(file);

    let newEl;

    if(['mp4','webm','mov'].includes(ext)){
      newEl = document.createElement('video');
      newEl.controls = true;
    } else {
      newEl = document.createElement('img');
      newEl.alt = file;

      // 🔥 Додаємо справжній lazy loading
      newEl.loading = "lazy";
      newEl.decoding = "async";
      newEl.classList.add("fade-in");
    }

    newEl.id = 'carouselImg';
    newEl.src = url;

    carouselEl.replaceWith(newEl);
    carouselEl = newEl;

    imgCount.textContent = (currentIndex+1)+' / '+currentImages.length;

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

  function attachEvents(){
    if(filtersRoot){
      filtersRoot.addEventListener('change', () => {
        const selected = getSelectedTypes();
        renderGallery(filterByTypes(categoryData, selected));
      });
    }

    if(clearBtn){
      clearBtn.addEventListener('click', () => {
        Array.from(filtersRoot.querySelectorAll('input')).forEach(i => i.checked = false);
        renderGallery(categoryData);
      });
    }

    if(closeModal) closeModal.addEventListener('click', () => setOverlayVisible(false));
    if(overlay) overlay.addEventListener('click', e => { 
      if(e.target === overlay) setOverlayVisible(false); 
    });

    prevBtn.addEventListener('click', prevImage);
    nextBtn.addEventListener('click', nextImage);
  }

  async function init(){
    attachEvents();

    const all = await window.App.loadCSV();

    categoryData = all.filter(it =>
      (it.Affiliation || '').trim().toLowerCase()
        .includes((category || '').trim().toLowerCase())
    );

    const types = window.App.utils.unique(categoryData.map(d => d.Type));

    renderFilters(types);
    renderGallery(categoryData);
  }

  init();
})();
