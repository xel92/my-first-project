const widget = document.querySelector('#widget');
const nickname = document.querySelector('#nickname');
const controls = document.querySelector('#controls');
const nameInput = document.querySelector('#name');
const statusText = document.querySelector('#status');

const queue = [];
let playing = false;
let textSettings = {};

function configureFollowerText(settings = {}) {
  textSettings = settings;
  for (const [prefix, element] of [['nickname', nickname], ['greeting', document.querySelector('.greeting')]]) {
    element.style.fontFamily = settings[prefix + 'Font'] || 'Trebuchet MS, sans-serif';
    element.style.fontWeight = settings[prefix + 'Weight'] || '900';
    element.style.fontStyle = settings[prefix + 'Italic'] === true || settings[prefix + 'Italic'] === 'true' ? 'italic' : 'normal';
    element.style.color = settings[prefix + 'Color'] || (prefix === 'nickname' ? '#355f58' : '#8b663b');
  }
  fitNickname();
}
const followerAudio = new Audio();
followerAudio.preload = 'auto';
let soundEnabled = false;

function configureFollowerSound(settings = {}) {
  followerAudio.pause();
  const url = typeof settings.followerSound === 'string' ? settings.followerSound.trim() : '';
  soundEnabled = Boolean(url);
  if (url) followerAudio.src = url;
  else followerAudio.removeAttribute('src');
  const volume = Number(settings.soundVolume ?? 70);
  followerAudio.volume = Math.max(0, Math.min(100, Number.isFinite(volume) ? volume : 70)) / 100;
}

function playFollowerSound() {
  if (!soundEnabled || followerAudio.volume === 0) return;
  followerAudio.currentTime = 0;
  followerAudio.play()?.catch(error => console.warn('Follower sound could not play:', error.message));
}

const timing = Object.freeze({
  pose: 210,
  loweringPause: 325,
  roar: 425,
  cloudIn: 800,
  hold: 5200,
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function setState(state, message) {
  widget.className = `widget ${state}`;
  if (statusText && message) statusText.textContent = message;
}

function normalizeName(value) {
  const clean = String(value ?? '').replace(/[<>]/g, '').trim();
  return clean.slice(0, 50) || 'Новый фолловер';
}

function fitNickname() {
  const scale = Math.min(widget.clientWidth / 1200, 1);
  for (const [prefix, element, fallback] of [['nickname', nickname, 76], ['greeting', document.querySelector('.greeting'), 22]]) {
    const context = document.createElement('canvas').getContext('2d');
    const style = getComputedStyle(element);
    context.font = `${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`;
    const metrics = context.measureText(element.textContent);
    const measured = Math.max(metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0), 1);
    const available = nickname.clientWidth * .9;
    const requested = Number(textSettings[prefix + 'Size'] ?? fallback);
    const size = Number.isFinite(requested) ? Math.max(8, Math.min(120, requested)) : fallback;
    element.style.fontSize = `${Math.min(size * scale, available / measured * 100)}px`;
  }
}

async function playFollowerAlert(followerName) {
  const safeName = normalizeName(followerName);
  nickname.textContent = safeName;
  fitNickname();

  playFollowerSound();
  setState('is-waking', `Дракон просыпается для ${safeName}…`);
  for (const pose of ['step1', 'middle', 'step2', 'step3', 'step4', 'step5', 'alert']) {
    widget.dataset.pose = pose;
    await wait(timing.pose);
  }

  setState('is-roaring', `Дракон приветствует ${safeName}!`);
  await wait(timing.roar);

  setState('is-alert', `${safeName} — добро пожаловать в стаю!`);
  await wait(timing.cloudIn + timing.hold);

  setState('is-lowering', 'Дракон опускает голову…');
  await wait(timing.loweringPause);
  for (const pose of ['step5', 'step4', 'step3', 'step2', 'middle', 'step1', 'sleep']) {
    widget.dataset.pose = pose;
    await wait(timing.pose);
  }

  setState('is-sleeping', 'Дракон спит. Можно запустить следующую проверку.');
  followerAudio.pause();
}

async function drainQueue() {
  if (playing) return;
  playing = true;
  while (queue.length) await playFollowerAlert(queue.shift());
  playing = false;
}

function triggerFollower(name) {
  queue.push(normalizeName(name));
  drainQueue();
}

controls?.addEventListener('submit', (event) => {
  event.preventDefault();
  triggerFollower(nameInput.value);
});

let remoteFields = {};
window.addEventListener('onEventReceived', (event) => {
  const detail = event.detail ?? {};
  if (detail.listener === 'widget-button' && detail.event?.field === 'testFollower') {
    triggerFollower(remoteFields.testName || 'DragonFriend_2026');
    return;
  }
  if (detail.listener !== 'follower-latest') return;
  triggerFollower(detail.event?.displayName || detail.event?.name);
});

window.addEventListener('onWidgetLoad', (message) => {
  remoteFields = message.detail?.fieldData || {};
  configureFollowerSound(remoteFields);
  document.querySelector('.greeting').textContent = remoteFields.greetingText || 'Добро пожаловать в стаю!';
  configureFollowerText(remoteFields);
});

const params = new URLSearchParams(location.search);
if (params.has('overlay') || params.has('obs')) document.body.classList.add('overlay');
if (params.has('demo')) setTimeout(() => triggerFollower(params.get('demo')), 500);
if (params.has('se') && window.parent !== window) {
  window.addEventListener('message', (message) => {
    if (message.source !== window.parent || message.data?.channel !== 'dragon-se-v1') return;
    if (!['onWidgetLoad', 'onEventReceived'].includes(message.data.type)) return;
    window.dispatchEvent(new CustomEvent(message.data.type, {detail: message.data.detail}));
  });
  window.parent.postMessage({channel:'dragon-se-v1', type:'ready'}, '*');
}

window.dragonAlert = triggerFollower;
window.addEventListener('resize', fitNickname);
document.fonts?.ready.then(fitNickname);
statusText.textContent = 'Готово. Введите имя и нажмите «Новый фолловер».';
