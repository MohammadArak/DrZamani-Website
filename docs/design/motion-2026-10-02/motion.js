/* Standalone design study: no API calls, persistence, or patient data. */
'use strict';
const root = document.documentElement;
root.classList.add('js');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = document.querySelector('#motion-toggle');
let motionManuallyStopped = false;
function syncMotion() {
  const off = motionManuallyStopped || reducedMotion.matches;
  root.dataset.motion = off ? 'off' : 'on';
  motionToggle.setAttribute('aria-pressed', String(off));
  motionToggle.textContent = off ? 'حرکت خاموش' : 'توقف حرکت';
  motionToggle.disabled = reducedMotion.matches;
  motionToggle.title = reducedMotion.matches ? 'طبق تنظیم کاهش حرکت دستگاه' : '';
}
syncMotion();
reducedMotion.addEventListener('change', syncMotion);
motionToggle.addEventListener('click', () => { motionManuallyStopped = !motionManuallyStopped; syncMotion(); });
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
const mainNav = document.querySelector('#main-nav');
const menuToggle = document.querySelector('.menu-toggle');
function closeMenu(returnFocus = false) {
  mainNav.dataset.open = 'false'; menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'بازکردن منو');
  if (returnFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  mainNav.dataset.open = String(open); menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'بستن منو' : 'بازکردن منو');
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && mainNav.dataset.open === 'true') closeMenu(true); });
const navLinks = [...mainNav.querySelectorAll('a')];
const navSections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
const progress = document.querySelector('.read-progress');
let scrollQueued = false;
function updateScroll() {
  const max = root.scrollHeight - innerHeight;
  progress.style.width = `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`;
  let active = -1;
  navSections.forEach((section, index) => { if (section.getBoundingClientRect().top <= 180) active = index; });
  navLinks.forEach((link, index) => { if (index === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  scrollQueued = false;
}
addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }, { passive: true });
addEventListener('resize', updateScroll);
updateScroll();
function animateContent(element) {
  element.classList.remove('swapping');
  void element.offsetWidth;
  element.classList.add('swapping');
}
const services = {
  nose: { title: 'رینوپلاستی', english: 'RHINOPLASTY', description: 'آشنایی با حوزه جراحی و فرم بینی. پرسش‌ها و انتظارات خود را در جلسه ارزیابی مطرح کنید.' },
  eye: { title: 'بلفاروپلاستی', english: 'BLEPHAROPLASTY', description: 'آشنایی با حوزه جراحی پلک. برای بررسی درخواست خود و اطلاع از شرایط مراجعه، با مطب هماهنگ کنید.' },
  face: { title: 'لیفت صورت', english: 'FACE LIFT', description: 'آشنایی با حوزه جراحی صورت. جلسه ارزیابی فرصتی برای مطرح‌کردن پرسش‌ها و انتظارات شماست.' },
  chin: { title: 'منتوپلاستی', english: 'MENTOPLASTY', description: 'آشنایی با حوزه جراحی چانه. برای هماهنگی ارزیابی و دریافت اطلاعات مراجعه، با مطب تماس بگیرید.' }
};
let selectedService = 'nose';
const serviceDescription = document.querySelector('#service-description');
const serviceMore = document.querySelector('#service-more');
document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => {
  selectedService = button.dataset.select;
  const service = services[selectedService];
  document.querySelectorAll('[data-select]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.select === selectedService)));
  document.querySelector('.anatomy').dataset.service = selectedService;
  document.querySelector('#anatomy-label').textContent = service.english;
  serviceDescription.textContent = service.description;
  serviceMore.firstChild.textContent = `آشنایی بیشتر با ${service.title} `;
  animateContent(document.querySelector('.service-detail'));
}));
const steps = [
  ['پیش از هماهنگی', 'پرسش‌هایتان را جمع کنید.', 'با خدمات آشنا شوید و موضوعاتی را که می‌خواهید با پزشک مطرح کنید، یادداشت کنید.'],
  ['هماهنگی با مطب', 'زمان مراجعه را هماهنگ کنید.', 'روزهای کاری، با هماهنگی قبلی مراجعه کنید. برای اطلاع از زمان مراجعه با مطب تماس بگیرید.'],
  ['در جلسه ارزیابی', 'درباره انتظاراتتان صحبت کنید.', 'پرسش‌ها و انتظارات خود را با پزشک در میان بگذارید؛ تصمیم درباره شرایط و روش درمان به ارزیابی پزشکی نیاز دارد.']
];
let selectedStep = 0;
function chooseStep(index) {
  selectedStep = index;
  document.querySelectorAll('[data-step]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.step) === index)));
  ['#step-kicker', '#step-title', '#step-body'].forEach((selector, i) => { document.querySelector(selector).textContent = steps[index][i]; });
  document.querySelector('.step-watermark').textContent = `0${index + 1}`;
  document.querySelector('.journey-track span').style.width = `${(index + 1) / 3 * 100}%`;
  document.querySelector('#next-step').firstChild.textContent = index === 2 ? 'راه‌های ارتباط با مطب ' : 'قدم بعد ';
  animateContent(document.querySelector('.step-content'));
}
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => chooseStep(Number(button.dataset.step))));
document.querySelector('#next-step').addEventListener('click', () => {
  if (selectedStep < 2) chooseStep(selectedStep + 1);
  else { document.querySelector('#contact').scrollIntoView({ behavior: root.dataset.motion === 'off' ? 'instant' : 'smooth' }); document.querySelector('.contact-call').focus({ preventScroll: true }); }
});
const dialog = document.querySelector('#info-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogContent = document.querySelector('#dialog-content');
function openDialog(title, content) {
  dialogTitle.textContent = title;
  dialogContent.replaceChildren(...content);
  dialog.showModal();
}
function paragraph(text) { const p = document.createElement('p'); p.textContent = text; return p; }
function callLink() { const a = document.createElement('a'); a.href = 'tel:08633146179'; a.className = 'button dark'; a.textContent = 'تماس با مطب ↗'; return a; }
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
  openDialog('رزرو نوبت', [paragraph('رزرو آنلاین نوبت فعلاً غیرفعال است. برای هماهنگی با مطب تماس بگیرید.'), callLink()]);
}));
serviceMore.addEventListener('click', () => {
  const service = services[selectedService];
  openDialog(service.title, [paragraph(service.description), paragraph('این پیش‌نمایش، الگوی نمایش خدمات است. توضیحات کامل، شرایط و محدودیت‌های هر خدمت در نسخه نهایی باید توسط پزشک بازبینی شود.'), callLink()]);
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
const checklistState = [false, false, false];
document.querySelector('#open-checklist').addEventListener('click', () => {
  const list = document.createElement('div'); list.className = 'checklist';
  const count = document.createElement('p'); count.className = 'check-count'; count.setAttribute('aria-live', 'polite');
  function updateCount() { count.textContent = `${checklistState.filter(Boolean).length.toLocaleString('fa-IR')} از ۳ مورد آماده است`; }
  ['پرسش‌هایم را یادداشت کرده‌ام.', 'انتظاراتم را برای گفت‌وگو مشخص کرده‌ام.', 'زمان مراجعه را با مطب هماهنگ کرده‌ام.'].forEach((text, index) => {
    const label = document.createElement('label'); const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = checklistState[index];
    input.addEventListener('change', () => { checklistState[index] = input.checked; updateCount(); });
    label.append(input, document.createTextNode(text)); list.append(label);
  });
  updateCount();
  openDialog('آماده برای گفت‌وگو', [paragraph('این فهرست فقط تا بازبودن همین صفحه باقی می‌ماند و اطلاعاتی ارسال نمی‌کند.'), list, count]);
});
