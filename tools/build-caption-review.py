"""Build numbered contact sheets, without changing caption approval states."""
import json
import math
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'content/photo-editorial.json').read_text(encoding='utf-8'))
pending = sorted((p for p in data['photos'].values() if p['status'] != 'confirmed'),
                 key=lambda p: tuple(map(int, p['id'].split('-'))))
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 24)
out = root / 'docs/caption-review'
lines = ['# 待确认照片注释', '', '按照片编号的数字顺序排列。以下拟注释尚未发布；可按编号修改，并统一确认其余内容。', '']
for batch, start in enumerate(range(0, len(pending), 12), 1):
    photos = pending[start:start + 12]
    canvas = Image.new('RGB', (1440, math.ceil(len(photos)/3)*340), '#edf1f4')
    draw = ImageDraw.Draw(canvas)
    lines += [f'## 总览 {batch}', '', f'![照片总览 {batch}](ordered-pending-{batch}.jpg)', '']
    for i, p in enumerate(photos):
        x, y = (i % 3)*480, (i // 3)*340
        im = ImageOps.exif_transpose(Image.open(root / p['src'])).convert('RGB')
        im.thumbnail((456, 278))
        canvas.paste(im, (x+12+(456-im.width)//2, y+44+(278-im.height)//2))
        draw.text((x+14, y+7), p['id'], font=font, fill='#123755')
        lines.append(f"- **{p['id']}**｜{p['proposedCaption']}")
    canvas.save(out / f'ordered-pending-{batch}.jpg', quality=90)
    lines.append('')
(out / 'pending-captions.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
print(f'Built {math.ceil(len(pending)/12)} sheets for {len(pending)} pending captions in numeric photo order')
