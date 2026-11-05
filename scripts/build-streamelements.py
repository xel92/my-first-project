from pathlib import Path
import json, re, base64
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
out = root.parent / 'Dragon-StreamElements'
out.mkdir(exist_ok=True)
page = (root / 'index.html').read_text()
html = page[page.index('<main'):page.index('</main>') + 7]
images = {'sleepImage': 'dragon-sleep.png', 'middleImage': 'dragon-drowsy.png', 'awakeImage': 'dragon-awake.png', 'cloudImage': 'follower-cloud.png'}
embedded = html
for key, filename in images.items():
    embedded = embedded.replace('assets/' + filename, 'data:image/png;base64,' + base64.b64encode((root / 'assets' / filename).read_bytes()).decode())
    html = html.replace('src="assets/' + filename + '"', 'data-image-field="' + key + '"')
css = (root / 'styles.css').read_text() + '''
/* StreamElements: transparent overlay, no preview controls. */
html, body { background: transparent !important; width: 100%; height: 100%; }
.preview { display: block; padding: 0; min-height: 0; }
.widget { width: 100vw; height: 100vh; aspect-ratio: auto; }
.controls { display: none !important; }
'''
js = (root / 'app.js').read_text()
js = js[:js.index("window.addEventListener('onEventReceived'")]
js += '''
let fields = {};
window.addEventListener('onWidgetLoad', (message) => {
  fields = message.detail?.fieldData || {};
  document.querySelectorAll('[data-image-field]').forEach(image => {
    const url = fields[image.dataset.imageField];
    if (typeof url === 'string' && url) image.src = url;
  });
  document.querySelector('.greeting').textContent = fields.greetingText || 'Добро пожаловать в стаю!';
  fitNickname();
});
window.addEventListener('onEventReceived', (message) => {
  const detail = message.detail || {};
  const event = detail.event || {};
  if (detail.listener === 'follower-latest') {
    triggerFollower(event.displayName || event.name || 'Новый фолловер');
  } else if (detail.listener === 'widget-button' && event.field === 'testFollower') {
    triggerFollower(fields.testName || 'DragonFriend_2026');
  }
});
window.addEventListener('resize', fitNickname);
document.fonts?.ready.then(fitNickname);
'''
fields = {}
for key, filename in images.items():
    fields[key] = {'type': 'image-input', 'label': filename, 'value': '', 'group': 'Изображения дракона'}
fields.update({
    'greetingText': {'type': 'text', 'label': 'Приветствие', 'value': 'Добро пожаловать в стаю!'},
    'testName': {'type': 'text', 'label': 'Тестовый никнейм', 'value': 'DragonFriend_2026'},
    'testFollower': {'type': 'button', 'label': 'Проверить нового фолловера', 'value': 'Запустить'},
})
files = {'HTML.txt': html, 'CSS.txt': css, 'JS.txt': js, 'FIELDS.json': json.dumps(fields, ensure_ascii=False, indent=2), 'DATA.json': '{}', 'HTML-embedded.txt': embedded}
files['ИНСТРУКЦИЯ.txt'] = '''УСТАНОВКА В STREAMELEMENTS

1. Войдите в StreamElements через нужный Twitch-аккаунт.
2. Streaming tools → My overlays → New overlay. Выберите 1920 × 1080.
3. Добавьте Custom widget (обычно + → Static / Custom → Custom widget).
4. Откройте Open Editor. Полностью замените содержимое вкладок:
   HTML ← HTML.txt, CSS ← CSS.txt, JS ← JS.txt,
   FIELDS ← FIELDS.json, DATA ← DATA.json. Нажмите Done.
5. В настройках виджета откройте «Изображения дракона».
   В каждом из четырёх полей загрузите соответствующий PNG из assets.
   Имена полей совпадают с именами файлов. Это загрузка в медиатеку SE.
6. Задайте размер самого Custom Widget 1200 × 600, расположите на overlay.
7. Введите тестовый ник и нажмите «Проверить нового фолловера».
   Также проверьте Emulate → Follower event в редакторе overlay.
8. Save. Скопируйте URL overlay. В OBS добавьте источник «Браузер»,
   вставьте URL, задайте 1920 × 1080 и 60 FPS.

ZIP не импортируется целиком: его нужно распаковать, вставить текст
в пять вкладок редактора и загрузить четыре картинки.

Необязательный вариант: HTML-embedded.txt вместо HTML.txt содержит
встроенные картинки, поэтому шаг 5 не нужен. Он большой (~4 МБ);
если редактор не сохраняет его, используйте обычный HTML.txt и медиатеку.

На настоящего фолловера реагирует событие follower-latest.
Повторные уведомления стоят в очереди. Ник выводится безопасно как текст.
Полностью появившееся облачко держится 5,2 секунды.
Рык визуальный, без звука. Анимация использует три позы с переходами.
Названия пунктов интерфейса могут отличаться в разных версиях SE.
Не публикуйте URL своего overlay: используйте его только в OBS.
'''
for name, content in files.items():
    (out / name).write_text(content, encoding='utf-8')
with ZipFile(root.parent / 'Dragon-StreamElements.zip', 'w', ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(out / name, 'Dragon-StreamElements/' + name)
    for filename in images.values():
        archive.write(root / 'assets' / filename, 'Dragon-StreamElements/assets/' + filename)
print(out)
