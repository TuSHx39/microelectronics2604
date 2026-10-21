"""Rebuild phase-two text/photos from local originals and the existing ID mapping.

Requires Pillow; does not change the supplied DOCX or original photo directory.
Run from any directory. Editorial metadata is kept out of page copy.
"""
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from PIL import Image, ImageOps

SITE = Path(__file__).resolve().parents[1]
INPUT = SITE.parent
DATA = SITE / 'js/activities.js'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
SOURCE = '微电子2604班最佳团日策划案（第二版）.docx'

# Descriptions are observations from the supplied images, in sourceId order.
ALT_TEXT = {
    1: ['延安站前，四位同学手持南洋书院院旗合影。', '宝塔前，同学们展开团日活动横幅合影。', '红旗旁，参与研学的同学在户外合影。'],
    2: ['跨校交流中留存的手写明信片。', '上海交通大学主题明信片与邮寄信封。', '校园拱门前，两位同学展示书法作品。', '校园拱门前展示的手写交流信件。', '校园拱门前，两位同学手持明信片合影。', '北京交通大学校名标识前，同学展示交流信件。', '传统门楼前展示的手写书信。', '传统门楼前展示的另一封交流信件。', '西安交通大学校名标识前展示的交流书信。', '西南交通大学校名石前展示的手写信件。', '西南交通大学校名石前，两位同学展开书法作品。', '校庆主题标识前，同学们展开书法作品合影。'],
    3: ['西安事变纪念馆入口，同学们手持班旗合影。', '纪念馆展厅内的历史图片与文字展陈。'],
    4: ['电子信息科学研究院楼前，同学们手持班旗集体合影。', '实验室内，同学们沿工作台参观学习。'],
    5: ['室内大厅中设置的爱心雨伞与收纳伞架。', '爱心雨伞旁，三位身穿蓝色志愿马甲的同学合影。'],
    6: ['校园建筑前，参与联合活动的同学集体合影。', '展板前，同学们围在一起听取介绍。'],
    7: ['校园人物塑像前，两位同学合影留念。', '绿树环绕的校园纪念雕塑与景观。'],
    8: ['户外体验区域，四位同学穿戴装备合影。', '树荫下，同学在指导中体验瞄准操作。'],
    9: ['操场上，同学们参与趣味充气球项目。', '运动场上，同学们围绕趣味项目协作。'],
    10: ['夜间操场上，同学们展开团日横幅与班旗合影。', '夜间操场上，同学们列队参与集体舞活动。'],
    11: ['教室内，讲解者介绍舞龙舞狮与传统文化。', '室内训练场，同学们共同举起龙具体验舞龙。'],
    12: ['园林建筑前，身穿志愿马甲的同学携清扫工具合影。', '步道旁，志愿者沿绿化区域开展清理。'],
    13: ['上下对比拼图记录餐前与餐后的餐碗。', '餐桌上摆放的主食与菜品。', '上下对比拼图记录面食餐前与餐后的餐盘。'],
    14: ['教室前方，分享者结合投影开展竞赛经验交流。', '黑板前，竞赛交流参与同学合影。'],
    15: ['讲台前，分享者结合投影介绍人工智能与大模型。', '教室内，分享者与同学围绕电脑交流。'],
    16: ['蓝天下的交通大学西迁博物馆入口。', '西迁博物馆展厅内，同学们集体合影。'],
    17: ['阅览室内，观影活动参与同学手持班旗合影。', '投影银幕前，同学参与影片片段演绎。'],
    18: ['阅览室内，同学围绕红色经典开展分享。', '投影银幕前，同学参与经典片段交流与演绎。'],
    19: ['校园楼旁，同学用清扫工具整理步道。', '楼前台阶旁，同学清扫地面与边角。'],
    20: ['校园盲道上，同学使用簸箕与扫帚清理杂物。', '盲道旁，同学整理占道的共享单车。'],
    21: ['校园绿地旁，同学们手持班旗集体合影。', '夜间跑道上，同学们结伴跑步。'],
    22: ['运动场上，同学们参与集体体育活动。', '操场上，两位同学手持球拍交流。', '运动场上，同学抬手击打空中的球。', '树荫下，同学们分组挥拍活动。'],
    23: ['教室内，分享者围绕理想信念主题开展宣讲。'],
}
COVERS = {2: 11, 5: 1, 11: 1, 13: 1, 16: 1, 21: 1}
FIXES = {
    '持续迁建体魄': '持续强健体魄',
    '精神之钙学习强国': '精神之钙',
    '一次一次性的': '一次性的',
    '（10.210.20）': '（10月2日—10月20日）',
    '准备垃圾袋、；': '准备垃圾袋；',
    '报备手续西安交通大学南洋书院团委': '报备手续',
    '物资准备准备': '物资准备：准备',
    '埃德加.斯诺': '埃德加·斯诺',
    '你是怎一个人': '你是怎样一个人',
}


def clean(value):
    for old, new in FIXES.items():
        value = value.replace(old, new)
    value = re.sub(r'\s+', ' ', value).strip()
    # Keep exhibition copy free of the quotation marks removed in phase one.
    return re.sub(r'“\s*最佳团日\s*”', '最佳团日', value)


def paragraphs(value):
    # Word sources 09 and 20 contain adjacent list items in a single paragraph.
    value = re.sub(r'(?<!\d)(\d{1,2}[.．、])(?=[\u4e00-\u9fff])', r'\n\1', value)
    chunks = []
    for raw in value.splitlines():
        part = clean(raw)
        if not part:
            continue
        # Long Word paragraphs become readable paragraphs without changing tense.
        if len(part) > 280:
            sentences = re.split(r'(?<=。)', part)
            block = ''
            for sentence in sentences:
                if len(block) + len(sentence) > 240 and block:
                    chunks.append(block.strip())
                    block = ''
                block += sentence
            if block:
                chunks.append(block.strip())
        else:
            chunks.append(part)
    return chunks


def apply_stories(data):
    stories = json.loads((SITE / 'content/stories.json').read_text(encoding='utf-8'))
    editorial_path = SITE / 'content/photo-editorial.json'
    editorial = json.loads(editorial_path.read_text(encoding='utf-8'))['photos'] if editorial_path.exists() else {}
    for activity in data:
        story = stories[activity['sourceId']]
        assert all(story.get(key) for key in ('aim', 'why', 'actions', 'takeaway'))
        activity['story'] = story
        activity['summary'] = story['aim']
        activity['source']['presentationBasis'] = '按原文与现场照片整理的活动叙事；收获为定性思考，未增加成果统计。'
        for photo in activity['photos']:
            photo['caption'] = ''
            reviewed = editorial.get(Path(photo['src']).stem)
            if reviewed and reviewed['status'] == 'confirmed':
                photo['alt'] = reviewed['caption'].rstrip('。')


def write_data(data):
    apply_stories(data)
    DATA.write_text('// Activity stories are curated in content/stories.json; original plan details are retained as development reference.\nwindow.ACTIVITIES = '
                    + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')


def main():
    data = json.loads(DATA.read_text(encoding='utf-8').split('=', 1)[1].strip().rstrip(';'))
    if '--stories-only' in sys.argv:
        write_data(data)
        print(f'Updated {len(data)} activity stories; photos unchanged.')
        return
    with ZipFile(INPUT / SOURCE) as document:
        root = ET.fromstring(document.read('word/document.xml'))
    text = '\n'.join(''.join(t.text or '' for t in p.findall('.//w:t', NS))
                     for p in root.findall('w:body/w:p', NS))
    parts = re.split(r'(?m)^活动[一二三四五六七八九十]+[：:]\s*$', text)
    assert len(parts) == 24, 'Expected exactly 23 source activities'
    total_before = total_after = 0
    for activity in data:
        sid = int(activity['sourceId'])
        block = re.split(r'\n八、活动预期', parts[sid])[0]
        sections = re.split(r'(活动目的|前期准备|实施阶段|后期工作)\s*[：:]', block)
        assert len(sections) == 9, f'Unexpected section labels: source {sid}'
        raw = dict(zip(sections[1::2], sections[2::2]))
        activity['details'].update({key: paragraphs(raw[label]) for key, label in [
            ('purpose', '活动目的'), ('preparation', '前期准备'),
            ('implementation', '实施阶段'), ('followUp', '后期工作')]})
        # The supplied document is a plan. Actual outcome evidence was not supplied.
        # Do not derive results from dates or convert planned tasks into results.
        activity['source']['detailsBasis'] = '正式第二版活动流程，按sourceId提取；保留原文时态，不作为实际成果证明。'
        activity['source']['editorialFixes'] = [f'{old} → {new}' for old, new in FIXES.items() if old in block]
        activity['source']['outcomeEvidence'] = '未提供经确认的成果材料，results保留为空。'
        if sid in (16, 19):
            activity['source']['reviewNote'] = '原文“23名团员”保留，未推断为“2—3名”。'
        activity['date'] = re.sub(r'\s+', '', activity['date'])
        activity['coverIndex'] = COVERS.get(sid, 0)
        assert len(activity['photos']) == len(ALT_TEXT[sid])
        for i, photo in enumerate(activity['photos']):
            website_name = Path(photo['src']).name
            # User-confirmed correction: raw groups 14 and 15 are interchanged.
            source_name = website_name
            if sid in (14, 15):
                source_name = f'{29-sid}-{i+1}.jpg'
            original = INPUT / '活动图片' / source_name
            destination = SITE / photo['src']
            with Image.open(original) as source_image:
                picture = ImageOps.exif_transpose(source_image).convert('RGB')
                picture.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                if destination.suffix.lower() == '.png':
                    picture.save(destination, optimize=True)
                else:
                    picture.save(destination, quality=85, optimize=True, progressive=True)
                photo.update(width=picture.width, height=picture.height,
                             alt=ALT_TEXT[sid][i].rstrip('。'), caption='',
                             fit='contain' if sid == 13 else 'cover', position='center')
            photo['sourceFile'] = f'活动图片/{source_name}'
            if sid == 7:
                photo['position'] = 'center 40%'
            if sid in (1, 4, 6, 14, 16):
                photo['position'] = 'center 60%'
            total_before += original.stat().st_size
            total_after += destination.stat().st_size
    write_data(data)
    print(json.dumps({'activities': len(data), 'photos': sum(len(a['photos']) for a in data),
                      'originalBytes': total_before, 'optimizedBytes': total_after}, ensure_ascii=False))


if __name__ == '__main__':
    main()
