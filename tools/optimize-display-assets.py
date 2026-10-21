"""Rebuild local display derivatives; preserve original photos, logos and TTF."""
from pathlib import Path
import json
from PIL import Image, ImageOps
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
metrics = []
opening = root / 'assets/opening'
opening.mkdir(exist_ok=True)

def derivative(source, destination, edge, quality):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        image.save(destination, 'WEBP', quality=quality, method=6)
    metrics.append({'source': str(source.relative_to(root)), 'output': str(destination.relative_to(root)), 'before': source.stat().st_size, 'after': destination.stat().st_size})

for name in ['1-1', '2-1', '4-1', '19-1']:
    derivative(root / ('assets/photos/' + name + '.jpg'), opening / (name + '.webp'), 480, 80)
for name in ['class', 'university', 'college']:
    derivative(root / ('assets/logos/' + name + '.png'), root / ('assets/logos/' + name + '-display.webp'), 360, 90)
with Image.open(root / 'assets/logos/class.png') as image:
    image.thumbnail((64, 64), Image.Resampling.LANCZOS)
    image.save(root / 'assets/logos/favicon.png', optimize=True)

# Include all current copy, not only the opening title. Future new characters
# fall back to system fonts until this development tool is run again.
text = ''.join(chr(i) for i in range(32, 127))
for name in ['index.html', 'js/main.js', 'js/activities.js', 'content/stories.json']:
    text += (root / name).read_text(encoding='utf-8-sig')
source = root / 'assets/fonts/MaShanZheng-Regular.ttf'
destination = root / 'assets/fonts/MaShanZheng-display.woff2'
font = TTFont(source)
options = subset.Options()
options.flavor = 'woff2'
options.desubroutinize = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
font.flavor = 'woff2'
font.save(destination)
metrics.append({'source': str(source.relative_to(root)), 'output': str(destination.relative_to(root)), 'before': source.stat().st_size, 'after': destination.stat().st_size})
report = {'resources': metrics, 'before': sum(x['before'] for x in metrics), 'after': sum(x['after'] for x in metrics)}
(root / 'docs/opening-assets.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
