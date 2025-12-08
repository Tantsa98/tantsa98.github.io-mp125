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

  // initial carousel element (may be replaced)
  let carouselEl = document.getElementById('carouselImg');

  let currentImages = [];
  let currentIndex = 0;

  let mediaIndex = null;

  /* --- Load media index (data/media-index.json) --- */
  async function loadMediaIndex(){
    if (mediaIndex) return mediaIndex;
    try {
      const res = await fetch('data/media-index.json', { cache: 'no-store' });
      if(!res.ok) throw new Error('media-index.json not found: ' + res.status);
      mediaIndex = await res.json();
      return mediaIndex;
    } catch (e){
      console.error("Не вдалося завантажити media-index.json", e);
      mediaIndex = [];
      return mediaIndex;
    }
  }

  /* --- Find media files that start with imgId + "#" --- */
  async function findMediaByImgId(imgId){
    if(!imgId) return [];
    const all = await loadMediaIndex();
    return all.filter(name => name.startsWith(imgId + "#"));
  }

  /* --- Body lock (prevent background scroll) --- */
  function lockBody(){
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  function unlockBody(){
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  /* --- Show / hide overlay and manage body lock --- */
  function setOverlayVisible(visible){
    if(!overlay) return;
    if(visible){
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden','false');
      lockBody();
      // optional: focus trap could be added
    } else {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden','true');
      unlockBody();
    }
  }

  /* --- RENDER FILTERS --- */
  function renderFilters(types){
    if(!filtersRoot) return;
    filtersRoot.innerHTML = '';
    if(!types || !types.length){
      filtersRoot.innerHTML = '<p class="muted">Немає варіантів</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    types.forEach(t => {
      const id = 'f_' + t.replace(/\s+/g,'_');
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

  function filterData(data, selected){
    if(!selected || selected.length === 0) return data;
    return data.filter(d => selected.includes(d.Type));
  }

  /* --- RENDER GALLERY --- */
  function renderGallery(data){
    if(!galleryRoot) return;
    galleryRoot.innerHTML = '';
    if(!data.length){
      galleryRoot.innerHTML = '<p class="muted">Нічого не знайдено</p>';
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
      card.addEventListener('keydown', e => { if(e.key === 'Enter') openModal(item); });
      frag.appendChild(card);
    });
    galleryRoot.appendChild(frag);
  }

  /* --- MODAL OPEN --- */
  async function openModal(item){
    if(!item) return;
    mName.textContent = item.Name || '';
    mType.textContent = item.Type || '';
    mAff.textContent = item.Affiliation || '';
    mDesc.textContent = item.Desc || '';

    const imgId = (item.imgId || '').trim();
    currentImages = await findMediaByImgId(imgId);

    currentIndex = 0;
    updateCarousel();
    setOverlayVisible(true);

    // enable swipe on carousel container after DOM updated
    enableSwipeOnCarousel();
  }

  /* --- Update carousel: replace media element with new one --- */
  function updateCarousel(){
    // ensure carousel container exists
    const carouselContainer = document.getElementById('imageCarousel');
    if(!carouselContainer){
      console.warn('No carousel container found');
      return;
    }

    if(!currentImages || !currentImages.length){
      // clear image
      const placeholder = document.createElement('div');
      placeholder.id = 'carouselImg';
      placeholder.textContent = 'Немає зображень';
      placeholder.style.minHeight = '160px';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      if(carouselEl && carouselEl.parentNode){
        carouselEl.replaceWith(placeholder);
      } else {
        carouselContainer.appendChild(placeholder);
      }
      carouselEl = document.getElementById('carouselImg');
      imgCount.textContent = '0 / 0';
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
    }

    const file = currentImages[currentIndex];
    const ext = (file.split('.').pop() || '').toLowerCase();
    const encoded = encodeURIComponent(file);
    const url = 'media/' + encoded;

    let media;
    if(['mp4','mov','webm'].includes(ext)){
      media = document.createElement('video');
      media.controls = true;
      media.setAttribute('playsinline','');
      media.preload = 'metadata';
    } else {
      media = document.createElement('img');
      media.alt = file;
    }

    media.id = 'carouselImg';
    media.src = url;
    media.style.opacity = '0';
    media.style.maxWidth = '100%';
    media.style.display = 'block';

    // handle load / error
    media.onerror = function(e){
      console.error('media load error', url, e);
      imgCount.textContent = 'error';
    };
    media.onload = function(){
      // no-op for img (video has different event)
    };

    // replace previous element
    if(carouselEl && carouselEl.parentNode){
      carouselEl.replaceWith(media);
    } else {
      const container = document.getElementById('imageCarousel');
      container.appendChild(media);
    }
    carouselEl = document.getElementById('carouselImg');

    // fade in
    requestAnimationFrame(() => {
      media.style.transition = 'opacity .22s';
      media.style.opacity = '1';
    });

    imgCount.textContent = (currentIndex + 1) + ' / ' + currentImages.length;

    const show = currentImages.length > 1;
    prevBtn.style.display = show ? 'block' : 'none';
    nextBtn.style.display = show ? 'block' : 'none';
  }

  /* --- Prev / Next --- */
  function prev(){
    if(!currentImages.length) return;
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateCarousel();
  }
  function next(){
    if(!currentImages.length) return;
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateCarousel();
  }

  /* --- SWIPE: attach to carousel container only --- */
  let swipeState = { startX: 0, startY: 0, active:false };
  function enableSwipeOnCarousel(){
    // remove previous handlers by cloning node (safe)
    const container = document.getElementById('imageCarousel');
    if(!container) return;
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);

    let startX = 0;
    let startY = 0;
    let isTouching = false;

    newContainer.addEventListener('touchstart', (e) => {
      if(e.touches && e.touches.length === 1){
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isTouching = true;
      }
    }, { passive: true });

    newContainer.addEventListener('touchmove', (e) => {
      // if user is scrolling vertically, don't prevent default
      if(!isTouching) return;
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      // if horizontal gesture is larger than vertical, prevent page scroll to allow swipe
      if(dx > dy && dx > 10){
        e.preventDefault(); // prevent page from moving
      }
    }, { passive: false });

    newContainer.addEventListener('touchend', (e) => {
      if(!isTouching) return;
      isTouching = false;
      const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : 0;
      const dx = endX - startX;
      const threshold = 50; // minimal px to be considered swipe
      if(Math.abs(dx) < threshold) return;
      if(dx < 0) next();
      else prev();
    }, { passive: true });
  }

  /* --- EVENTS --- */
  function attachEvents(){
    // filters change
    if(filtersRoot){
      filtersRoot.addEventListener('change', () => {
        renderGallery(filterData(categoryData, getSelectedTypes()));
      });
    }

    // clear button
    if(clearBtn){
      clearBtn.addEventListener('click', () => {
        const inputs = filtersRoot.querySelectorAll('input');
        inputs.forEach(i => i.checked = false);
        renderGallery(categoryData);
      });
    }

    // close modal
    if(closeModal){
      closeModal.addEventListener('click', () => {
        setOverlayVisible(false);
      });
    }

    // overlay click outside modal closes
    if(overlay){
      overlay.addEventListener('click', (e) => {
        // click only closes if clicked directly on overlay, not inside modal
        if(e.target === overlay){
          setOverlayVisible(false);
        }
      });
    }

    // prev/next buttons
    if(prevBtn) prevBtn.addEventListener('click', prev);
    if(nextBtn) nextBtn.addEventListener('click', next);
  }

  /* --- INIT --- */
  let categoryData = [];
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
