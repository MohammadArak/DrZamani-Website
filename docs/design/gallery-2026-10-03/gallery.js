'use strict';
// Public assets already used by the site. No inferred patient/clinical metadata.
const items = [
  { id: 1, angle: 'profile' }, { id: 2, angle: 'front' },
  { id: 3, angle: 'profile' }, { id: 4, angle: 'profile' },
  { id: 8, angle: 'oblique' }, { id: 12, angle: 'front' }
];
const angleNames = { all: 'همه نماها', profile: 'نیم‌رخ', front: 'روبه‌رو', oblique: 'سه‌رخ' };
const grid = document.querySelector('#gallery-grid');
const saved = new Set();
const digits = number => number.toLocaleString('fa-IR');
const imagePath = id => `../../../public/img/samples/${id}.jpg`;
let activeFilter = 'all';
let onlySaved = false;
let view = 'grid';
let viewerItems = [];
let viewerIndex = 0;
let activeTransition = null;
let manualMotionOff = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('#motion-toggle');
function syncMotion() {
  const off = manualMotionOff || reducedMotion.matches;
  document.documentElement.dataset.motion = off ? 'off' : 'on';
  motionButton.setAttribute('aria-pressed', String(off));
  motionButton.textContent = off ? 'حرکت خاموش' : 'توقف حرکت';
  motionButton.disabled = reducedMotion.matches;
}
motionButton.addEventListener('click', () => { manualMotionOff = !manualMotionOff; syncMotion(); });
reducedMotion.addEventListener('change', syncMotion);
syncMotion();
function filteredItems() { return items.filter(item => (activeFilter === 'all' || item.angle === activeFilter) && (!onlySaved || saved.has(item.id))); }
function bookmarkIcon() { return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg>'; }
function renderGrid() {
  const visible = filteredItems();
  grid.dataset.view = view;
  grid.innerHTML = visible.map((item, index) => `<article class="gallery-card" style="--i:${index};view-transition-name:photo-${item.id}"><button class="photo-open" data-open="${item.id}" aria-label="بازکردن تصویر ${digits(item.id)}، نمای ${angleNames[item.angle]}"><img src="${imagePath(item.id)}" width="614" height="768" alt="تصویر قبل و بعد ${digits(item.id)} از گالری موجود؛ نمای ${angleNames[item.angle]}" loading="${index < 3 ? 'eager' : 'lazy'}"><span class="open-caption"><span class="caption-text">دیدن تصویر کامل</span><span aria-hidden="true">↗</span></span></button><div class="card-meta"><div class="card-name"><span class="card-index" aria-hidden="true">${String(item.id).padStart(2, '0')}</span><div><h3>تصویر ${digits(item.id)}</h3><p>نمای ${angleNames[item.angle]}</p></div></div><button class="bookmark" data-save="${item.id}" aria-label="نشان‌کردن تصویر ${digits(item.id)}" aria-pressed="${saved.has(item.id)}">${bookmarkIcon()}</button></div></article>`).join('');
  document.querySelector('#empty-state').hidden = visible.length > 0;
  document.querySelector('.collection-end').hidden = visible.length === 0;
  document.querySelector('#result-status').textContent = `${digits(visible.length)} تصویر · ${angleNames[activeFilter]}${onlySaved ? ' · نشان‌شده‌ها' : ''}`;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
  document.querySelectorAll('.view-controls [data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  document.querySelector('#saved-filter').setAttribute('aria-pressed', String(onlySaved));
}
function updateGrid() {
  if (activeTransition) activeTransition.skipTransition();
  if (document.startViewTransition && document.documentElement.dataset.motion !== 'off') {
    grid.setAttribute('aria-busy', 'true');
    const transition = document.startViewTransition(renderGrid);
    activeTransition = transition;
    transition.finished.catch(() => {}).finally(() => {
      if (activeTransition === transition) { activeTransition = null; grid.setAttribute('aria-busy', 'false'); }
    });
  } else { renderGrid(); grid.setAttribute('aria-busy', 'false'); }
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; updateGrid(); }));
document.querySelectorAll('.view-controls [data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view; updateGrid(); }));
document.querySelector('#saved-filter').addEventListener('click', () => { onlySaved = !onlySaved; updateGrid(); });
document.querySelector('#reset-filters').addEventListener('click', () => { activeFilter = 'all'; onlySaved = false; renderGrid(); document.querySelector('[data-filter=all]').focus(); });
document.querySelectorAll('[data-show-saved]').forEach(button => button.addEventListener('click', () => {
  activeFilter = 'all'; onlySaved = true; renderGrid();
  document.querySelector('#collection').scrollIntoView({ behavior: document.documentElement.dataset.motion === 'off' ? 'instant' : 'smooth' });
  document.querySelector('#saved-filter').focus({ preventScroll: true });
}));
function syncSaved() {
  document.querySelectorAll('.saved-count').forEach(el => { el.textContent = digits(saved.size); });
  document.querySelectorAll('[data-save]').forEach(button => button.setAttribute('aria-pressed', String(saved.has(Number(button.dataset.save)))));
  document.querySelector('#save-tray').hidden = saved.size === 0;
  document.body.classList.toggle('has-saved', saved.size > 0);
  document.querySelector('.tray-thumbs').innerHTML = [...saved].slice(0, 3).map(id => `<img src="${imagePath(id)}" alt="" width="32" height="39">`).join('');
  if (viewer.open) syncViewerSave();
}
function toggleSaved(id) {
  if (saved.has(id)) saved.delete(id); else saved.add(id);
  document.querySelector('#save-announcement').textContent = `تصویر ${digits(id)} ${saved.has(id) ? 'نشان شد' : 'از نشان‌شده‌ها برداشته شد'}.`;
  syncSaved();
  if (onlySaved && !viewer.open) { renderGrid(); document.querySelector('#saved-filter').focus({ preventScroll: true }); }
}
grid.addEventListener('click', event => {
  const saveButton = event.target.closest('[data-save]');
  const openButton = event.target.closest('[data-open]');
  if (saveButton) toggleSaved(Number(saveButton.dataset.save));
  if (openButton) openViewer(Number(openButton.dataset.open));
});
const viewer = document.querySelector('#viewer');
const viewerImage = document.querySelector('#viewer-image');
const viewerSave = document.querySelector('#viewer-save');
const previous = document.querySelector('#previous-image');
const next = document.querySelector('#next-image');
const zoom = document.querySelector('#zoom-toggle');
const canvas = document.querySelector('#photo-canvas');
const photoStage = document.querySelector('#photo-stage');
function resetZoom() {
  canvas.classList.remove('zoomed'); zoom.setAttribute('aria-pressed', 'false');
  zoom.firstChild.textContent = 'بزرگ‌نمایی '; zoom.querySelector('span').textContent = '＋';
  document.querySelector('#zoom-hint').textContent = 'تصویر کامل';
  photoStage.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}
function syncViewerSave() {
  const marked = saved.has(viewerItems[viewerIndex].id);
  viewerSave.setAttribute('aria-pressed', String(marked));
  viewerSave.querySelector('span').textContent = marked ? 'نشان شده' : 'نشان‌کردن تصویر';
}
function renderViewer() {
  const item = viewerItems[viewerIndex];
  resetZoom();
  viewerImage.src = imagePath(item.id);
  viewerImage.alt = `تصویر کامل قبل و بعد ${digits(item.id)}؛ نمای ${angleNames[item.angle]}`;
  document.querySelector('#viewer-title').textContent = `تصویر ${digits(item.id)}`;
  document.querySelector('#viewer-angle').textContent = `نمای ${angleNames[item.angle]}`;
  document.querySelector('#viewer-counter').textContent = `${digits(viewerIndex + 1)} از ${digits(viewerItems.length)}`;
  previous.disabled = viewerIndex === 0; next.disabled = viewerIndex === viewerItems.length - 1;
  document.querySelector('#viewer-thumbs').innerHTML = viewerItems.map((entry, index) => `<button data-thumb="${index}" aria-label="دیدن تصویر ${digits(entry.id)}" ${index === viewerIndex ? 'aria-current="true"' : ''}><img src="${imagePath(entry.id)}" width="614" height="768" alt=""></button>`).join('');
  syncViewerSave();
  viewerImage.classList.remove('changing'); void viewerImage.offsetWidth; viewerImage.classList.add('changing');
}
let openerId = null;
function openViewer(id) {
  viewerItems = filteredItems(); viewerIndex = viewerItems.findIndex(item => item.id === id);
  openerId = id;
  renderViewer(); viewer.showModal();
}
function navigateImage(delta) {
  const index = viewerIndex + delta;
  if (index >= 0 && index < viewerItems.length) { viewerIndex = index; renderViewer(); }
}
previous.addEventListener('click', () => navigateImage(-1));
next.addEventListener('click', () => navigateImage(1));
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); navigateImage(1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); navigateImage(-1); }
});
document.querySelector('#viewer-thumbs').addEventListener('click', event => {
  const button = event.target.closest('[data-thumb]');
  if (button) { viewerIndex = Number(button.dataset.thumb); renderViewer(); document.querySelector(`[data-thumb="${viewerIndex}"]`).focus(); }
});
viewerSave.addEventListener('click', () => toggleSaved(viewerItems[viewerIndex].id));
zoom.addEventListener('click', () => {
  const enlarged = !canvas.classList.contains('zoomed');
  if (!enlarged) { resetZoom(); return; }
  canvas.classList.add('zoomed'); zoom.setAttribute('aria-pressed', 'true');
  zoom.firstChild.textContent = 'نمای کامل '; zoom.querySelector('span').textContent = '−';
  document.querySelector('#zoom-hint').textContent = '۲× · برای دیدن جزئیات اسکرول کنید';
  photoStage.scrollTo({ top: photoStage.clientHeight / 2, left: photoStage.clientWidth / 2, behavior: 'instant' });
});
document.querySelector('#close-viewer').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => {
  resetZoom();
  if (onlySaved) renderGrid();
  const opener = document.querySelector(`[data-open="${openerId}"]`);
  (opener || document.querySelector('#saved-filter')).focus({ preventScroll: true });
});
const contact = document.querySelector('#contact-dialog');
document.querySelectorAll('#contact-trigger,#guide-contact').forEach(button => button.addEventListener('click', () => contact.showModal()));
document.querySelector('#close-contact').addEventListener('click', () => contact.close());
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));
renderGrid();
