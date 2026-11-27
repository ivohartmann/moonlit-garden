# 月下庭园

一夜的庭园塔防。墨蛾、影兽、银翅、玄甲之后，还有纸鹤、游灯与墨蛟，最后是月噬。你用石灯、竹林、梅霜、泉眼和朱印，守住二十二波月华。画面全部由代码绘制，声音由程序实时生成，没有账号，也没有需要联网的内容（字体随游戏一起打包）。

## 在线游玩

浏览器打开：[https://ivohartmann.github.io/moonlit-garden/](https://ivohartmann.github.io/moonlit-garden/)

## 本地运行

需要 Node.js 18 或更新版本。

```bash
npm install
npm run dev
```

本地开发地址是 http://127.0.0.1:8731 。这只在你自己的电脑上有效。

## 如何打包

```bash
npm run build
npm run preview
```

`dist/` 是静态站点，资源使用相对路径，可以直接作为 HTML 游戏上传到 itch.io。

平衡试跑（不打开浏览器）：

```bash
npm run sim
```

## 操作

- 点下方的庭器，再点石台放置。点已经放好的庭器，可以升级或出售。
- 空格：提前迎接下一波，并得到少量铜钱。
- U：升级所选庭器。X 或右键：出售。
- Esc：暂停。F：常速 / 疾行。M：静音。
- 1 到 5：选择石灯、竹林、梅霜、泉眼、朱印。

弯道通常照得到更长的一段路。银翅很快，竹林能拖住它们；纸鹤几乎不受竹叶影响。玄甲很厚，梅霜能让伤害透进去。游灯会自己愈合，石灯升到第三阶的灼烧能止住它。墨蛟漏过园门会多损月华。第二十二波的月噬如果走到东侧月门，这一夜就结束。

铜钱是庭中的通货，牌面做成旧铜钱的样子：方孔、铜绿、磨损的边。

## 字体与声音

界面使用 [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC) 与 [Ma Shan Zheng](https://fonts.google.com/specimen/Ma+Shan+Zheng)，二者皆为 SIL Open Font License。许可证全文见 `LICENSES/`。声音是原创的程序生成音色，游戏内可以静音。
