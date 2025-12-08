// app.js — vanilla JS
const CSV_PATH = 'data/BK.csv';
const MEDIA_MANIFEST = 'data/media.json';

// utils: simple CSV parser (no complex quoted commas)
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    // naive splitting — assumes no commas inside fields
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h]=cols[i] ?? '');
    return obj;
  });
}

let allItems = [];
let mediaList = [];

// DOM refs
const galleryRoot = document.getElementById('gallery');
const filterTypeRoot = document.getElementById('filter-type');
const filterAffRoot = document.getElementById('filter-aff');
const resetBtn = document.getElementById('resetFilters');

const overlay = document.getElementById('overlay');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalType = document.getElementById('modalType');
const modalAff = document.getElementById('modalAff');
const modalDesc = document.getElementById('modalDesc');
const carouselViewport = document.getElementById('carouselViewport');
const prevBtn = document.getElementById('prevMedia');
const nextBtn = document.getElementById('nextMedia');

let currentCarousel = {items:[], index:0};

function fetchData(){
  return Promise.all([
    fetch(CSV_PATH).then(r=> {
      if(!r.ok) throw new Error('Не вдалося завантажити BK.csv');
      return r.text();
    }),
    fetch(MEDIA_MANIFEST).then(r=> {
      if(!r.ok) return [];
      return r.json();
    })
  ]).then(([csvText, media])=>{
    allItems = parseCSV(csvText);
    mediaList = Array.isArray(media) ? media : [];
    initFilters();
    renderGallery(allItems);
  }).catch(err=>{
    console.error(err);
    galleryRoot.innerHTML = `<div class="card">Помилка завантаження даних: ${err.message}</div>`;
  });
}

function uniqueValues(arr, key){
  const s = new Set(arr.map(i => (i[key]||'').trim()).filter(Boolean));
  return Array.from(s).sort();
}

function initFilters(){
  const types = uniqueValues(allItems, 'Type');
  const affs = uniqueValues(allItems, 'Affiliation');

  filterTypeRoot.innerHTML = types.map(t => {
    const id = `type_${escapeId(t)}`;
    return `<label><input type="checkbox" data-filter="Type" value="${escapeHtml(t)}" id="${id}"> ${escapeHtml(t)}</label>`;
  }).join('');

  filterAffRoot.innerHTML = affs.map(a=>{
    const id = `aff_${escapeId(a)}`;
    return `<label><input type="checkbox" data-filter="Affiliation" value="${escapeHtml(a)}" id="${id}"> ${escapeHtml(a)}</label>`;
  }).join('');

  // attach event listeners
  document.querySelectorAll('#filters input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', applyFilters);
  });

  resetBtn.addEventListener('click', ()=>{
    document.querySelectorAll('#filters input[type="checkbox"]').forEach(cb=> cb.checked = false);
    applyFilters();
  });
}

function applyFilters(){
  const checkedTypes = Array.from(document.querySelectorAll('#filter-type input:checked')).map(i=>i.value);
  const checkedAffs = Array.from(document.querySelectorAll('#filter-aff input:checked')).map(i=>i.value);

  let filtered = allItems.filter(item=>{
    const t = (item.Type||'').trim();
    const a = (item.Affiliation||'').trim();

    const typeOk = checkedTypes.length ? checkedTypes.includes(t) : true;
    const affOk = checkedAffs.length ? checkedAffs.includes(a) : true;
    return typeOk && affOk;
  });

  renderGallery(filtered);
}

function renderGallery(items){
  if(!items.length){
    galleryRoot.innerHTML = `<div class="card">Нічого не знайдено.</div>`;
    return;
  }
  galleryRoot.innerHTML = '';
  items.forEach(it=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.innerHTML = `<h4>${escapeHtml(it.Name)}</h4><p>${escapeHtml(it.Type)}</p>`;
    card.addEventListener('click', ()=> openModal(it));
    card.addEventListener('keypress', (e)=> { if(e.key === 'Enter') openModal(it)});
    galleryRoot.appendChild(card);
  });
}

function openModal(item){
  modalTitle.textContent = item.Name || '';
  modalType.textContent = item.Type || '';
  modalAff.textContent = item.Affiliation || '';
  modalDesc.textContent = item.Desc || '';
/*
  // build media array: files whose filename.startsWith(imgId)
  const id = (item.imgId||'').trim();
  const matched = mediaList.filter(fn => fn.startsWith(id));
  // convert to objects with type
  const mediaObjs = matched.map(fn=>{
    const lower = fn.toLowerCase();
    const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
    return {src:`Media/${fn}`, type: isVideo ? 'video' : 'image'};
  });
*/
// Normalize id
let id = (item.imgId || '').trim();
id = id.replace(/^Media\//i, '');        // remove Media/
id = id.replace(/\.[a-z0-9]+$/i, '');    // remove extension

// Match media filenames
const matched = mediaList.filter(fn => {
  const plain = fn.replace(/^Media\//i, '');
  return plain.startsWith(id);
});

// Convert to usable objects
const mediaObjs = matched.map(fn => {
  const file = fn.startsWith('Media/') ? fn : `Media/${fn}`;
  const lower = file.toLowerCase();
  const isVideo =
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogg');

  return { src: file, type: isVideo ? 'video' : 'image' };
});

// Insert into carousel
currentCarousel.items = mediaObjs;
currentCarousel.index = 0;
renderCarousel();

//

  currentCarousel.items = mediaObjs;
  currentCarousel.index = 0;
  renderCarousel();
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');
}

function closeModalFunc(){
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden','true');
  carouselViewport.innerHTML = '';
  currentCarousel.items = [];
  currentCarousel.index = 0;
}

closeModal.addEventListener('click', closeModalFunc);
overlay.addEventListener('click', (e)=>{
  if(e.target === overlay) closeModalFunc();
});
document.addEventListener('keydown', (e)=> {
  if(e.key === 'Escape') closeModalFunc();
});

function renderCarousel(){
  const items = currentCarousel.items;
  const index = currentCarousel.index;
  carouselViewport.innerHTML = '';

  if(!items.length){
    carouselViewport.innerHTML = '<div style="opacity:0.7">Медіа відсутні</div>';
    return;
  }

  const m = items[index];
  if(m.type === 'image'){
    const img = document.createElement('img');
    img.src = m.src;
    img.alt = '';
    carouselViewport.appendChild(img);
  } else if(m.type === 'video'){
    const v = document.createElement('video');
    v.src = m.src;
    v.controls = true;
    v.preload = 'metadata';
    carouselViewport.appendChild(v);
  }
}

prevBtn.addEventListener('click', ()=> {
  if(!currentCarousel.items.length) return;
  currentCarousel.index = (currentCarousel.index - 1 + currentCarousel.items.length) % currentCarousel.items.length;
  renderCarousel();
});
nextBtn.addEventListener('click', ()=> {
  if(!currentCarousel.items.length) return;
  currentCarousel.index = (currentCarousel.index + 1) % currentCarousel.items.length;
  renderCarousel();
});

// small helpers
function escapeHtml(s){ return String(s || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function escapeId(s){ return encodeURIComponent(String(s||'').replace(/\s+/g,'_')) }

fetchData();
