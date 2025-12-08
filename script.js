/* script.js
  Задача:
  - Завантажити BK.csv та media-index.json
  - Побудувати унікальні фільтри по Type та Affiliation
  - Фільтрувати галерею (checkboxes, multi-select)
  - Показувати попап з даними та медіа (media filenames matched by startsWith(imgId))
*/

const CSV_PATH = 'BK.csv';
const MEDIA_INDEX_PATH = 'media-index.json'; // масив імен файлів в папці Media/
const MEDIA_BASE = 'Media/';

let items = []; // parsed BK entries
let mediaIndex = []; // filenames

// util: parse CSV (simple)
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    // naive split - assume no commas inside fields
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h,i) => obj[h] = cols[i] || '');
    return obj;
  });
}

function unique(arr){ return Array.from(new Set(arr)).filter(Boolean) }

function buildFilterOptions(){
  const types = unique(items.map(i => i.Type));
  const affs = unique(items.map(i => i.Affiliation));

  const typeRoot = document.getElementById('typeOptions');
  const affRoot = document.getElementById('affOptions');
  typeRoot.innerHTML = '';
  affRoot.innerHTML = '';

  types.forEach(t => {
    const id = `type_${CSS.escape(t)}`;
    const row = document.createElement('label');
    row.className = 'option-row';
    row.innerHTML = `<input type="checkbox" name="type" value="${t}" id="${id}"> <span>${t}</span>`;
    typeRoot.appendChild(row);
  });

  affs.forEach(a => {
    const id = `aff_${CSS.escape(a)}`;
    const row = document.createElement('label');
    row.className = 'option-row';
    row.innerHTML = `<input type="checkbox" name="aff" value="${a}" id="${id}"> <span>${a}</span>`;
    affRoot.appendChild(row);
  });

  // attach listeners
  const checkboxes = document.querySelectorAll('#filters input[type="checkbox"]');
  checkboxes.forEach(cb => cb.addEventListener('change', renderGallery));

  document.getElementById('resetType').addEventListener('click', ()=>{
    document.querySelectorAll('#typeOptions input[type="checkbox"]').forEach(c=>c.checked=false);
    renderGallery();
  });
  document.getElementById('resetAff').addEventListener('click', ()=>{
    document.querySelectorAll('#affOptions input[type="checkbox"]').forEach(c=>c.checked=false);
    renderGallery();
  });

  // mobile toggle
  document.getElementById('toggleFilters').addEventListener('click', ()=>{
    const f = document.getElementById('filters');
    f.style.display = f.style.display === 'block' ? 'none' : 'block';
    window.scrollTo({top:0,behavior:'smooth'});
  });
}

function getActiveFilters(){
  const types = Array.from(document.querySelectorAll('#typeOptions input[type="checkbox"]:checked')).map(i=>i.value);
  const affs = Array.from(document.querySelectorAll('#affOptions input[type="checkbox"]:checked')).map(i=>i.value);
  return { types, affs };
}

function renderGallery(){
  const { types, affs } = getActiveFilters();
  const root = document.getElementById('gallery');
  root.innerHTML = '';

  let filtered = items.filter(it=>{
    const passType = types.length ? types.includes(it.Type) : true;
    const passAff = affs.length ? affs.includes(it.Affiliation) : true;
    return passType && passAff;
  });

  document.getElementById('noResults').hidden = filtered.length > 0;

  filtered.forEach(it=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="title">${escapeHtml(it.Name)}</div>
      <div class="type">${escapeHtml(it.Type)}</div>
    `;
    card.addEventListener('click', () => openModal(it));
    card.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') openModal(it) });
    root.appendChild(card);
  });
}

function openModal(item){
  const overlay = document.getElementById('overlay');
  overlay.hidden = false;

  document.getElementById('modalTitle').textContent = item.Name;
  document.getElementById('modalType').textContent = item.Type;
  document.getElementById('modalAff').textContent = item.Affiliation;
  document.getElementById('modalDesc').textContent = item.Desc;

  // build media gallery
  const mg = document.getElementById('mediaGallery');
  mg.innerHTML = '';

  // find media files that startWith imgId
  const id = item.imgId || '';
  const matches = mediaIndex.filter(fn => fn.startsWith(id));

  matches.forEach(fn=>{
    const ext = fn.split('.').pop().toLowerCase();
    const src = MEDIA_BASE + fn;
    if(['mp4','webm','ogg'].includes(ext)){
      const v = document.createElement('video');
      v.src = src;
      v.controls = true;
      v.setAttribute('playsinline','');
      v.loading = 'lazy';
      mg.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = item.Name + ' — медіа';
      img.loading = 'lazy';
      mg.appendChild(img);
    }
  });

  // if no media found, show placeholder text
  if(matches.length === 0){
    mg.innerHTML = `<p style="color:#444">Медіа не знайдено для imgId: <strong>${escapeHtml(id)}</strong></p>`;
  }
}

// close modal
function closeModal(){
  document.getElementById('overlay').hidden = true;
  document.getElementById('mediaGallery').innerHTML = '';
}

// simple escape
function escapeHtml(s){ return (s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') }

document.getElementById('closeModal')?.addEventListener('click', closeModal);
document.getElementById('closeModalBottom')?.addEventListener('click', closeModal);
document.getElementById('overlay')?.addEventListener('click', (e)=>{
  if(e.target.id === 'overlay') closeModal();
});

// initial load
async function init(){
  try {
    const [csvResp, mediaResp] = await Promise.all([
      fetch(CSV_PATH),
      fetch(MEDIA_INDEX_PATH)
    ]);
    if(!csvResp.ok) throw new Error('Не вдалося завантажити ' + CSV_PATH);
    if(!mediaResp.ok) throw new Error('Не вдалося завантажити ' + MEDIA_INDEX_PATH);

    const csvText = await csvResp.text();
    items = parseCSV(csvText).map(it=>{
      // ensure expected fields exist
      return {
        ID: it.ID || '',
        Name: it.Name || '',
        Type: it.Type || '',
        Affiliation: it.Affiliation || '',
        Desc: it.Desc || '',
        imgId: it.imgId || ''
      };
    });

    mediaIndex = await mediaResp.json(); // ["fab851.png","fab852.png","fab853.mp4", ...]
    buildFilterOptions();
    renderGallery();

  } catch (err){
    console.error(err);
    const root = document.getElementById('gallery');
    root.innerHTML = `<div class="no-results">Помилка завантаження даних: ${escapeHtml(err.message)}</div>`;
  }
}

init();
