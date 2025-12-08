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
    return Array.from(filtersRoot.querySelectorAll('input:checked')).map(i => i.value);
  }

  function filterByTypes(data, selected){
    if(!selected || selected.length===0) return data;
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
      card.addEventListener('keydown', (e) => { if(e.key==='Enter') openModal(item); });
      frag.appendChild(card);
    });
    galleryRoot.appendChild(frag);
  }

  function openModal(item){
    // populate text fields
    mName.textContent = item.Name || '';
    mType.textContent = item.Type || '';
    mAff.textContent = item.Affiliation || '';
    mDesc.textContent = item.Desc || '';

    // images
    const imgsRaw = item.imgId || '';
    currentImages = imgsRaw.split(';').map(s => s.trim()).filter(Boolean);
    currentIndex = 0;
    updateCarousel();
    setOverlayVisible(true);
  }

  function updateCarousel(){
    if(!currentImages.length){
      carouselImg.src = '';
      carouselImg.alt = 'Без зображень';
      imgCount.textContent = '0 / 0';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
    }
    // By default images are in /images/
    const src = 'images/' + currentImages[currentIndex];
    carouselImg.src = src;
    carouselImg.alt = currentImages[currentIndex];
    imgCount.textContent = (currentIndex+1) + ' / ' + currentImages.length;
    prevBtn.style.display = (currentImages.length>1 ? 'block' : 'none');
    nextBtn.style.display = (currentImages.length>1 ? 'block' : 'none');
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
    if(overlay) overlay.addEventListener('click', (e) => { if(e.target === overlay) setOverlayVisible(false); });

    if(prevBtn) prevBtn.addEventListener('click', prevImage);
    if(nextBtn) nextBtn.addEventListener('click', nextImage);
  }

  async function init(){
    attachEvents();
    const all = await window.App.loadCSV();
    // filter by Affiliation equal to category (exact match)
    //categoryData = all.filter(it => (it.Affiliation||'').trim().toLowerCase() === (category||'').trim().toLowerCase());
    categoryData = all.filter(it =>
      (it.Affiliation || '').trim().toLowerCase().includes((category || '').trim().toLowerCase())
    );
    // obtain unique Types from categoryData
    const types = window.App.utils.unique(categoryData.map(d => d.Type));
    renderFilters(types);
    renderGallery(categoryData);
  }

  // start
  init();
})();
