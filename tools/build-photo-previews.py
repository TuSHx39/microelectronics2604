"""Rebuild card previews from the corrected site photos; retain gallery originals."""
from pathlib import Path
import json
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
destination = root / 'assets/previews'
destination.mkdir(exist_ok=True)
records = []
for source in sorted((root / 'assets/photos').iterdir()):
    if source.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
        continue
    output = destination / (source.stem + '.webp')
    with Image.open(source) as original:
        preview = ImageOps.exif_transpose(original).convert('RGB')
        preview.thumbnail((800, 800), Image.Resampling.LANCZOS)
        preview.save(output, 'WEBP', quality=78, method=4)
    records.append({'source': source.name, 'preview': output.name,
                    'before': source.stat().st_size, 'after': output.stat().st_size})
report = {'count': len(records), 'originalBytes': sum(r['before'] for r in records),
          'previewBytes': sum(r['after'] for r in records), 'files': records}
(root / 'docs/photo-previews.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'files'}))
