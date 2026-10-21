# 四校校徽与照片注释

校徽使用以下学校官方来源：

- 西安交通大学：[校徽规范](https://vi.xjtu.edu.cn/jcbf/xhgf.htm)，沿用项目已有校徽素材。
- 上海交通大学：[基础系统](https://vi.sjtu.edu.cn/index.php/articles/base/1)，图片 https://vi.sjtu.edu.cn/img/base/Logo.png
- 北京交通大学：[学校标志](https://bjtu.edu.cn/xxgk/xxbz/index.htm)，图片 https://bjtu.edu.cn/images/2024-11/0d4cb3bdd27a4088ae62c36f75d98738.png
- 西南交通大学：[视觉形象识别系统](https://xcb.swjtu.edu.cn/newdDetails.jsp?urltype=news.NewsContentUrl&wbnewsid=2279&wbtreeid=1733)，图片 https://xcb.swjtu.edu.cn/__local/8/71/9F/C1EB1DC15BB238A2E88FCFEE4DC_EC3ED835_12E57.png

照片编号沿用素材文件名，与展板活动序号可能不同。学校归类以用户指定为准，不根据照片中明信片的图案自动判定。

确认记录：59张照片已通过聊天逐图核对并应用用户修改，完整文字见 `confirmed-captions.md`。其中 1-3 为爬宝塔山合影；四校交流中的书法作品是同一份原件邮寄周游四校后返回。

旗帜更正：只有延安站前的1-1为院旗，其余照片均按班旗描述。总览及本地核对页按图片编号的数字顺序排列。第二轮44张按用户逐条修改保存，未提到的遵循用户先前说明保留原注释。

`content/photo-editorial.json` 保存逐图状态。只有 `confirmed` 注释才进入展示页；`proposedCaption` 为待核对草稿。运行 `python tools/sync-photo-editorial.py` 同步浏览器数据。活动重建工具不会覆盖该独立文件。

`index.html` 为可选的本地逐图核对页，保存浏览器草稿并可导出勾选确认的记录。独立打开时默认显示59张已确认记录；用户再次编辑某张时会撤销该张的本地勾选，便于继续修改。
