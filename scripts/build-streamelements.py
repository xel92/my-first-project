from pathlib import Path
import json, re, base64
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
out = root.parent / 'Dragon-StreamElements'
out.mkdir(exist_ok=True)
page = (root / 'index.html').read_text()
html = page[page.index('<main'):page.index('</main>') + 7]
images = {'cloudImage': 'follower-cloud.png'}
embedded = html
for key, filename in images.items():
    embedded = embedded.replace('assets/' + filename, 'data:image/png;base64,' + base64.b64encode((root / 'assets' / filename).read_bytes()).decode())
    html = html.replace('src="assets/' + filename + '"', 'data-image-field="' + key + '"')
css = (root / 'styles.css').read_text() + '''
/* StreamElements: transparent overlay, no preview controls. */
:root { color-scheme: normal !important; }
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
  configureFollowerSound(fields);
  document.querySelectorAll('[data-image-field]').forEach(image => {
    const url = fields[image.dataset.imageField];
    if (typeof url === 'string' && url) image.src = url;
  });
  document.querySelector('.greeting').textContent = fields.greetingText || 'Добро пожаловать в стаю!';
  configureFollowerText(fields);
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
    'followerSound': {'type': 'sound-input', 'label': 'Звук нового фолловера', 'value': '', 'group': 'Звук'},
    'soundVolume': {'type': 'slider', 'label': 'Громкость (%)', 'value': 70, 'min': 0, 'max': 100, 'step': 1, 'group': 'Звук'},
    'greetingText': {'type': 'text', 'label': 'Приветствие', 'value': 'Добро пожаловать в стаю!'},
    'testName': {'type': 'text', 'label': 'Тестовый никнейм', 'value': 'DragonFriend_2026'},
    'testFollower': {'type': 'button', 'label': 'Проверить нового фолловера', 'value': 'Запустить'},
})
for prefix, group, size, color in [('nickname', 'Оформление никнейма', 76, '#355f58'), ('greeting', 'Оформление приветствия', 22, '#8b663b')]:
    fields.update({
        prefix + 'Font': {'type': 'dropdown', 'label': 'Шрифт', 'group': group, 'value': 'Trebuchet MS, sans-serif', 'options': {'Trebuchet MS, sans-serif': 'Trebuchet MS', 'Arial, sans-serif': 'Arial', 'Verdana, sans-serif': 'Verdana', 'Georgia, serif': 'Georgia', 'Times New Roman, serif': 'Times New Roman', 'Courier New, monospace': 'Courier New', 'Comic Sans MS, cursive': 'Comic Sans MS'}},
        prefix + 'Size': {'type': 'slider', 'label': 'Размер (px при ширине виджета 1200)', 'group': group, 'value': size, 'min': 8, 'max': 120, 'step': 1},
        prefix + 'Color': {'type': 'colorpicker', 'label': 'Цвет', 'group': group, 'value': color},
        prefix + 'Weight': {'type': 'dropdown', 'label': 'Жирность', 'group': group, 'value': '900', 'options': {'400': 'Обычный', '700': 'Жирный', '900': 'Очень жирный'}},
        prefix + 'Italic': {'type': 'checkbox', 'label': 'Курсив', 'group': group, 'value': False},
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
   В поле follower-cloud.png загрузите соответствующий PNG из assets.
   Имена полей совпадают с именами файлов. Это загрузка в медиатеку SE.
6. Задайте размер самого Custom Widget 1200 × 600, расположите на overlay.
7. Введите тестовый ник и нажмите «Проверить нового фолловера».
   Также проверьте Emulate → Follower event в редакторе overlay.
8. Save. Скопируйте URL overlay. В OBS добавьте источник «Браузер»,
   вставьте URL, задайте 1920 × 1080 и 60 FPS.

ZIP не импортируется целиком: его нужно распаковать, вставить текст
в пять вкладок редактора и загрузить картинку облачка. Дракон встроен как SVG.

Необязательный вариант: HTML-embedded.txt вместо HTML.txt содержит
встроенные картинки, поэтому шаг 5 не нужен. Он большой;
если редактор не сохраняет его, используйте обычный HTML.txt и медиатеку.

На настоящего фолловера реагирует событие follower-latest.
Повторные уведомления стоят в очереди. Ник выводится безопасно как текст.
Полностью появившееся облачко держится 5,2 секунды.
ЗВУК
В разделе «Звук» выберите файл через медиатеку StreamElements или
загрузите свой аудиофайл. Ползунок «Громкость (%)» регулирует уровень
от 0 до 100. Нажмите Done → Save, чтобы сохранить выбор и громкость.
Пустое поле звука или громкость 0 отключают аудио.
Звук запускается в начале пробуждения, включая тестовую кнопку.
Длинный файл останавливается, когда дракон засыпает. События в очереди
получают свой звук при начале анимации, без наложения.
Если звук не слышен, проверьте микшер OBS и разрешение браузера на аудио.
ОФОРМЛЕНИЕ ТЕКСТА
Разделы «Оформление никнейма» и «Оформление приветствия»: шрифт,
размер, цвет, жирность и курсив задаются независимо. Размер — максимум;
длинные строки автоматически уменьшаются, чтобы помещаться в облачке.
Шрифты используются из системы браузера OBS; если выбранного шрифта
нет на компьютере, браузер подставит запасной шрифт.
Сохраните настройки через Done → Save.
ОБНОВЛЕНИЕ: замените JS и FIELDS, DATA не очищайте — там настройки.
Анимация использует SVG-слои: голова, веки, челюсть, шея, тело и крыло.
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
