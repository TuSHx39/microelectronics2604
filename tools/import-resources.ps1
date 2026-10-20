# Development-only importer. Run from any directory; no dependency at runtime.
param([switch]$Force)
$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path $PSScriptRoot -Parent
$sourceRoot = Split-Path $siteRoot -Parent
if ((Test-Path -LiteralPath (Join-Path $siteRoot 'js/activities.js')) -and -not $Force) {
    throw '已有编辑后的活动数据，已停止导入以保护正文和压缩资源。仅重建第一阶段原始数据时使用 -Force；第二阶段请使用 tools/complete-content.py。'
}
foreach ($folder in @('assets/logos', 'assets/photos', 'js', 'css')) {
    New-Item -ItemType Directory -Path (Join-Path $siteRoot $folder) -Force | Out-Null
}
foreach ($logo in @(@('校徽.png','university.png'), @('院徽.png','college.png'), @('班徽.png','class.png'))) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot $logo[0]) -Destination (Join-Path $siteRoot "assets/logos/$($logo[1])")
}
$photoFiles = @(Get-ChildItem -LiteralPath (Join-Path $sourceRoot '活动图片') -File | Where-Object { $_.Name -match '^\d+-\d+\.(jpg|jpeg|png|webp)$' })
foreach ($photo in $photoFiles) {
    Copy-Item -LiteralPath $photo.FullName -Destination (Join-Path $siteRoot "assets/photos/$($photo.Name)")
}
# User correction: the raw 14/15 groups contain each other's images.
# Correct website copies only; preserve the board/source mapping and originals.
foreach ($number in 1,2) {
    Copy-Item -LiteralPath (Join-Path $sourceRoot "活动图片/15-$number.jpg") -Destination (Join-Path $siteRoot "assets/photos/14-$number.jpg")
    Copy-Item -LiteralPath (Join-Path $sourceRoot "活动图片/14-$number.jpg") -Destination (Join-Path $siteRoot "assets/photos/15-$number.jpg")
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead((Join-Path $sourceRoot '微电子2604班最佳团日策划案（第二版）.docx'))
$reader = [IO.StreamReader]::new($zip.GetEntry('word/document.xml').Open())
[xml]$doc = $reader.ReadToEnd()
$reader.Dispose()
$zip.Dispose()
$ns = [Xml.XmlNamespaceManager]::new($doc.NameTable)
$ns.AddNamespace('w','http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$paragraphs = @($doc.SelectNodes('//w:body/w:p',$ns) | ForEach-Object {
    ($_.SelectNodes('.//w:t',$ns) | ForEach-Object { $_.'#text' }) -join ''
})
$parts = [regex]::Split(($paragraphs -join "`n"), '(?m)^活动[一二三四五六七八九十]+[：:]\s*$')

# These titles and mappings are the supplied board specification.
$mapping = @'
01|01|赓续红色血脉，厚植家国情怀|roots
02|02|聚四校同心，传西迁薪火|resonance
03|03|回望时局转折，赓续爱国初心|roots
04|23|筑牢信仰根基，补足精神之钙|roots
05|04|探科研前沿，立强芯新志|chips
06|16|访西迁来时路，立科技报国志|roots
07|06|重走长征路，笃行少年志|resonance
08|07|寻思源景事，承西迁薪火|roots
09|08|砺强军之志，担青春之责|practice
10|09|赛场扬意气，逐梦正当时|resonance
11|10|欢歌燃青春，起舞竞芳华|resonance
12|11|舞龙狮之韵，传华夏之美|resonance
13|12|低碳赴新行，青春护青绿|practice
14|13|惜盘中粒米，树节约新风|practice
15|14|问竞赛之道，砺创新之志|chips
16|15|识智能浪潮，启跨界新思|chips
17|05|爱心撑雨伞，温情护同学|practice
18|17|观长征风云，续青春征程|roots
19|18|读百本经典，养青春文心|roots
20|19|践行青春誓言，彰显担当本色|practice
21|20|扫盲道之障，护通行之路|practice
22|21|逐七秩荧光，续西迁薪火|practice
23|22|持续强健青春体魄，锤炼筋骨使命担当|practice
'@
# Summaries follow sourceId order, paraphrasing only the formal plan's purposes.
$summaries = @(
    '以宝塔山、枣园革命旧址和延安革命纪念馆为研学现场，联系延安创业历程、西迁精神与微电子专业责任。'
    '通过书信、书法绘画、明信片与线上交流，连接四所交通大学的青年学子，共同回望校史与西迁精神。'
    '走进西安事变纪念馆，学习历史转折中的家国担当，并将研学素材用于支部集体学习。'
    '参观创新港光电实验室、无人机实验室与微电子学院公共测试平台，认识科研环境与专业前沿。'
    '以爱心雨伞借用、文明使用宣传和志愿服务，回应校园雨天出行需求，培养互助与服务意识。'
    '联合不同学院的四个团支部，了解各学科西迁后的发展历程，在交流中学习校史。'
    '通过史料查阅、实地寻访和口述采访，挖掘交大“思源景事”，整理有来源的校史故事。'
    '联合强军先锋队开展国防知识学习、激光打靶与真人CS体验，在规范操作和团队协作中增强国防观念。'
    '通过趣味运动会的集体项目，丰富课余生活，增进同学交流，培养团队协作与集体荣誉感。'
    '与体操社团合作开展集体舞会与韵律活动，在运动和协作中增进情谊、强健体魄。'
    '与舞龙舞狮社团合作，通过观看训练、参与体验和理论学习，认识传统体育的历史与文化。'
    '联合校青协与周边社区开展环境清理、环保科普和绿色宣传，引导团员参与生态文明实践。'
    '在校园食堂开展节约粮食主题实践，倡导理性取餐与光盘行动，反思日常就餐习惯。'
    '邀请科创竞赛获奖者分享经验，认识科学问题研究、团队协作与反复探索的价值。'
    '邀请人工智能专业学长开展讲座，认识AI基础知识与应用场景，思考智能技术和微电子学习的结合。'
    '参观西迁博物馆，回望先辈响应国家号召、扎根西北的历程，思考专业学习与国家科技发展的联系。'
    '围绕长征主题开展红色观影，并安排趣味配音与剧本演绎，加深对革命先辈坚定信念的认识。'
    '以《红星照耀中国》为阅读载体，通过读书笔记、片段诵读与情节演绎，品读红色经典。'
    '依托书院划定的校园劳动包干区域开展集体劳动，体会劳动价值，培养服务集体与校园的意识。'
    '排查并清理校园盲道障碍，关注无障碍通行需求，在志愿实践中培养同理心和公共关怀。'
    '将趣味荧光夜跑与日常自主跑步结合，以全班累计130公里为策划目标，纪念建校130周年与西迁70周年。'
    '以乒乓球、羽毛球等体育交流丰富课余生活，在协作对战中增进情谊，培养坚持与拼搏精神。'
    '邀请书院学生党支部同学开展专题宣讲，学习重要著作与新时代思想，结合西迁精神思考科技青年的责任。'
)
$activities = @($mapping.Trim() -split '\r?\n' | ForEach-Object {
    $fields = $_ -split '\|'
    $sourceId = [int]$fields[1]
    $part = $parts[$sourceId]
    $dateRaw = [regex]::Match($part, '时间[：:]\s*([^\r\n]*?)(?=道具[：:]|参加人员[：:]|\r?$)', 'Multiline').Groups[1].Value.Trim()
    $location = [regex]::Match($part, '场地[：:]\s*([\s\S]*?)(?=\s*时间[：:])').Groups[1].Value.Trim()
    $purpose = [regex]::Match($part, '活动目的[：:]\s*([\s\S]*?)(?=前期准备[：:])').Groups[1].Value.Trim()
    $photos = @($photoFiles | Where-Object { [int]($_.BaseName.Split('-')[0]) -eq $sourceId } |
        Sort-Object { [int]($_.BaseName.Split('-')[1]) } | ForEach-Object {
            [ordered]@{ src = "assets/photos/$($_.Name)"; alt = "$($fields[2]) · 照片 $($_.BaseName.Split('-')[1])"; caption = ''; position = 'center' }
        })
    [ordered]@{
        boardId = $fields[0]; sourceId = $fields[1]; title = $fields[2]; chapter = $fields[3]
        date = ($dateRaw -replace '2026月', '2026年' -replace '\s+', ' ')
        location = ($location -replace '\s+', ' ')
        summary = $summaries[$sourceId-1]; photos = $photos
        contentStatus = 'plan'; coverIndex = 0
        details = [ordered]@{ purpose = $purpose; preparation = @(); implementation = @(); followUp = @(); results = @() }
        source = [ordered]@{ document = '微电子2604班最佳团日策划案（第二版）.docx'; dateRaw = $dateRaw; notes = $(if($sourceId -eq 6){'原文日期“2026月10月17日”，仅补正缺失的“年”。'}else{''}) }
    }
})
$json = ConvertTo-Json -InputObject $activities -Depth 8
$output = "// Generated from the formal second-edition plan. Photos use sourceId, never boardId.`nwindow.ACTIVITIES = $json;`n"
[IO.File]::WriteAllText((Join-Path $siteRoot 'js/activities.js'), $output, [Text.UTF8Encoding]::new($false))
Write-Output "已写入活动数据与静态资源：$($activities.Count) 项活动、$($photoFiles.Count) 张原图、3 枚徽章。"
