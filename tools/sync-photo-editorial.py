"""Generate the browser manifest from the reviewed canonical captions."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'content/photo-editorial.json').read_text(encoding='utf-8'))
schools = {s['id'] for s in data['schools']}
for key, photo in data['photos'].items():
    assert key == photo['id']
    assert (root / photo['src']).is_file(), photo['src']
    assert photo['status'] in ('pending', 'confirmed')
    if photo['status'] == 'confirmed':
        assert photo['caption'].strip(), key
        if photo['boardId'] == '02':
            assert photo['schoolId'] in schools, key
(root / 'js/photo-editorial.js').write_text(
    'window.PHOTO_EDITORIAL = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
activity_path = root / 'js/activities.js'
prefix, raw = activity_path.read_text(encoding='utf-8').split('window.ACTIVITIES = ', 1)
activities = json.loads(raw.strip().removesuffix(';'))
for activity in activities:
    for photo in activity['photos']:
        reviewed = data['photos'].get(Path(photo['src']).stem)
        if reviewed and reviewed['status'] == 'confirmed':
            photo['alt'] = reviewed['caption'].rstrip('。')
activity_path.write_text(prefix + 'window.ACTIVITIES = ' + json.dumps(activities, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f"Synced {sum(p['status'] == 'confirmed' for p in data['photos'].values())}/{len(data['photos'])} confirmed captions")
