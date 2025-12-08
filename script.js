// script.js
// модульний код, використовує fetch для BK.csv та media-index.json
// Працює без зовнішніх бібліотек.

const CSV_PATH = 'BK.csv';
const MEDIA_INDEX_PATH = 'media-index.json';
const MEDIA_FOLDER = 'Media/';

const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

async function fetchText(path){
  const res = await fetch(path);
  if(!res.ok) throw new Error(`Не вдалося завантажити ${path}`);
  return await res.text();
}

function parseCSV(text){
  // Простий CSV-парсер: припускаємо що коми як separator, перший рядок — заголовки
  const lines = text.trim().split(/\r?\n/).map(l => l.trim());
  const headers = lines.shift().split(',').map(h => h.trim().replace(/^"|"$/g,''));
  return lines.map(line => {
    // врахуємо коми всередині лапок
    const values = [];
    let cur = '';
    let inQuotes = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch === '"' ){ inQuotes = !inQuotes; continue; }
      if(ch === ',' && !inQuotes){
        values.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    values.push(cur.trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = (values[i]||'').replace(/^"|"$/g,''));
    return obj;
  });
}

function unique(arr){ return Array.from(new Set(arr)).filter(Boolean); }

function createCheckbox(id, name, value){
  const wrapper = document.createElement('label');
  wrapper.className = 'option';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.value = value;
  input.id = `${name}-${value}`;
  const span = document.createElement('span');
  span.textContent = value;
  wrapper.appendChild(input);
  wrapper.appendChild(span);
  return wrapper;
}

function renderFilters(items){
  const types = unique(items.map(i => i.Type)).sort();
  const affs = unique(items.map(i => i.Affiliation)).sort();

  const typeRoot = qs('#typeOptions');
  const affRoot = qs('#affOptions');
  typeRoot.innerHTML = '';
  affRoot.innerHTML = '';

  types.forEach(t => typeRoot.appendChild(createCheckbox(t,'type',t)));
  affs.forEach(a => affRoot.appendChild(createCheckbox(a,'aff',a)));
}

function getCheckedValues(name){
  return qsa(`input[name="${name}"]:checked`).map(i=>i.value);
}

function matchesFilters(item, typesSelected, affSelected){
  const matchType = typesSelected.length === 0 || typesSelected.includes(item.Type);
  const matchAff = affSelected.length === 0 || affSelected.includes(item.Affiliation);
  return matchType && matchAff;
}

function renderGallery(items, mediaIndex){
  const root = qs('#gallery');
  root.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.dataset.id = item.ID;
    card.innerHTML = `<div class="title">${item.Name}</div><div class="type">${item.Type}</div>`;
    card.addEventListener('click', () => openModal(item, mediaIndex));
    card.addEventListener('keypress', (e) => { if(e.key === 'Enter') openModal(item, mediaIndex); });
    root.appendChild(card);
  });
  qs('#count').textContent = items.length;
}

function updateActiveFilters(){
  const types = getCheckedValues('type');
  const affs = getCheckedValues('aff');
  const el = qs('#activeFilters');
  const parts = [];
  if(types.length) parts.push(`Type: ${types.join(', ')}`);
  if(affs.length) parts.push(`Affiliation: ${affs.join(', ')}`);
  el.textContent = parts.join(' • ') || 'Немає вибраних фільтрів';
}

function filterAndRender(allItems, mediaIndex){
  const types = getCheckedValues('type');
  const affs = getCheckedValues('aff');
  const filtered = allItems.filter(it => matchesFilters(it, types, affs));
  renderGallery(filtered, mediaIndex);
  updateActiveFilters();
}

function setupFilterListeners(allItems, mediaIndex){
  document.addEventListener('change', (e)=>{
    if(e.target && (e.target.name === 'type' || e.target.name === 'aff')){
      filterAndRender(allItems, mediaIndex);
    }
  });
  qs('#clearType').addEventListener('click', ()=>{
    qsa('input[name="type"]:checked').forEach(i => i.checked = false);
    filterAndRender(allItems, mediaIndex);
  });
  qs('#clearAff').addEventListener('click', ()=>{
    qsa('input[name="aff"]:checked').forEach(i => i.checked = false);
    filterAndRender(allItems, mediaIndex);
  });
}

function startsWithMatch(name, prefix){
  return name.toLowerCase().startsWith(prefix.toLowerCase());
}

function gatherMediaForItem(item, mediaIndex){
  const prefix = (item.imgId || '').trim();
  if(!prefix) return [];
  // беремо файли з mediaIndex, які починаються на prefix
  return mediaIndex.filter(fname => startsWithMatch(fname, prefix)).map(f => MEDIA_FOLDER + f);
}

/* --- Modal logic --- */
const overlay = qs('#overlay');
const closeModalBtn = qs('#closeModal');
const mName = qs('#mName');
const mType = qs('#mType');
const mAff = qs('#mAff');
const mDesc = qs('#mDesc');
const mediaContainer = qs('#mediaContainer');
const prevBtn = qs('#prevMedia');
const nextBtn = qs('#nextMedia');

let currentMediaList = [];
let currentMediaIndex = 0;

function renderMedia(){
  mediaContainer.innerHTML = '';
  if(currentMediaList.length === 0){
    mediaContainer.textContent = 'Немає медіа';
    return;
  }
  const src = currentMediaList[currentMediaIndex];
  if(src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.ogg')){
    const v = document.createElement('video');
    v.src = src;
    v.controls = true;
    v.autoplay = false;
    mediaContainer.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    mediaContainer.appendChild(img);
  }
}

function openModal(item, mediaIndex){
  mName.textContent = item.Name;
  mType.textContent = item.Type;
  mAff.textContent = item.Affiliation;
  mDesc.textContent = item.Desc || '';
  currentMediaList = gatherMediaForItem(item, mediaIndex);
  currentMediaIndex = 0;
  renderMedia();
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(){
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

/* media nav */
prevBtn.addEventListener('click', ()=>{
  if(currentMediaList.length === 0) return;
  currentMediaIndex = (currentMediaIndex - 1 + currentMediaList.length) % currentMediaList.length;
  renderMedia();
});
nextBtn.addEventListener('click', ()=>{
  if(currentMediaList.length === 0) return;
  currentMediaIndex = (currentMediaIndex + 1) % currentMediaList.length;
  renderMedia();
});

closeModalBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', (e)=>{
  if(e.target === overlay) closeModal();
});

/* --- Init --- */
async function init(){
  try{
    const [csvText, mediaIndexText] = await Promise.all([
      fetchText(CSV_PATH),
      fetchText(MEDIA_INDEX_PATH).catch(_=> '[]')
    ]);
    const items = parseCSV(csvText);
    let mediaIndex = [];
    try { mediaIndex = JSON.parse(mediaIndexText); } catch(e){ mediaIndex = []; }

    renderFilters(items);
    renderGallery(items, mediaIndex);
    setupFilterListeners(items, mediaIndex);
    updateActiveFilters();
  } catch(err){
    console.error(err);
    qs('#gallery').innerHTML = `<div style="padding:18px;background:rgba(255,255,255,0.02);border-radius:12px;">Помилка завантаження даних: ${err.message}</div>`;
  }
}

init();
