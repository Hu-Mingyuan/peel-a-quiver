"""Build the static site with one URL per language.

    python3 tools/build_site.py [out_dir]      (default: _site)

web/index.html stays the single source. The build writes
  out/en/index.html, out/zh/index.html  the game with its language fixed (window.PEEL_LANG)
  out/index.html                        redirect to the last used language, or the browser's
  out/*.js (quiver.js; demo-strip.js is loaded from ../ when the demo opens)
Hashes (#level-3, #q=..., #rules) are kept by every redirect, so old links keep working.
"""
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REDIRECT = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Peel a quiver</title>
<script>
{js}
</script>
</head>
<body style="font: 15px/1.5 -apple-system, 'PingFang SC', Arial, sans-serif; padding: 16px;">
<p><a href="{prefix}en/">English</a> · <a href="{prefix}zh/">中文</a></p>
</body>
</html>
"""
ROOT_JS = """var l = null;
try { l = localStorage.getItem('peel-a-quiver-lang'); } catch (e) { /* storage blocked */ }
if (l !== 'en' && l !== 'zh') l = (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
location.replace(l + '/' + location.hash);"""


def build(out):
    src = open(os.path.join(ROOT, 'web', 'index.html'), encoding='utf-8').read()
    tag = '<script src="quiver.js"></script>'
    assert src.count(tag) == 1 and src.count('<html lang="en">') == 1
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for f in os.listdir(os.path.join(ROOT, 'web')):          # quiver.js, demo-strip.js, ...
        if f.endswith('.js'):
            shutil.copy(os.path.join(ROOT, 'web', f), os.path.join(out, f))
    for lang, html_lang in (('en', 'en'), ('zh', 'zh-CN')):
        page = src.replace(tag, f"<script>window.PEEL_LANG = '{lang}';</script>\n<script src=\"../quiver.js\"></script>")
        page = page.replace('<html lang="en">', f'<html lang="{html_lang}">')
        os.makedirs(os.path.join(out, lang))
        open(os.path.join(out, lang, 'index.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(REDIRECT.format(js=ROOT_JS, prefix=''))


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '_site'))
