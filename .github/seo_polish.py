from pathlib import Path


def rw(path, fn):
    p=Path(path)
    s=p.read_text(encoding='utf-8')
    n=fn(s)
    if n!=s:
        p.write_text(n,encoding='utf-8')
        print('updated',path)
    else:
        print('unchanged',path)


def polish_index(s):
    # Existing language-routing.js already shows a localized suggestion only to non-Japanese visitors.
    start='<div class="visitor-english" role="note">\n  <a href="/en/" data-track="visitor_english">Visiting Japan? <strong>English massage menu, booking &amp; directions</strong> →</a>\n</div>\n'
    s=s.replace(start,'')
    s=s.replace('.visitor-english{padding:9px 16px;text-align:center;background:#183a33;color:#fff;font-size:.86rem;line-height:1.5}.visitor-english a{color:#fff;text-decoration:none}.visitor-english strong{color:#f3dca6}.visitor-english a:hover{text-decoration:underline;text-underline-offset:3px}\n','')
    s=s.replace('ドライヘッドスパを提供するリラクゼーションサロン','ドライヘッドケアを提供するリラクゼーションサロン')
    s=s.replace('アロマ・ドライヘッドスパ、11:00〜翌2:00。','アロマ・ヘッドケア、11:00〜翌2:00。')
    s=s.replace('<article class="recommend-card"><h3>ドライヘッドスパ</h3><p>首肩まわりと合わせて、頭まわりをゆったりケアしたい方へ。</p><div class="cta-row"><a href="headspa-kamata.html" class="btn-secondary">ヘッドスパを見る</a></div></article>', '<article class="recommend-card"><h3>ヘッドケア</h3><p>ヘッドスパを探している方へ。当店は髪を濡らさない10分のドライヘッドケアをご用意しています。</p><div class="cta-row"><a href="headspa-kamata.html" class="btn-secondary">ヘッドケアを見る</a></div></article>')
    return s


def polish_menu(s):
    misplaced='<p style="margin:14px 0 0;"><a href="ashitsubo-fukurahagi.html" style="font-weight:800;color:#2F4438;">足裏・ふくらはぎケアの詳しい選び方 →</a></p>\n        '
    s=s.replace(misplaced,'',1)
    marker='''          <tr><th>60分</th><td>4,980円</td></tr>\n        </table>\n        <div class="menu-actions">'''
    repl='''          <tr><th>60分</th><td>4,980円</td></tr>\n        </table>\n        <p style="margin:14px 0 0;"><a href="ashitsubo-fukurahagi.html" style="font-weight:800;color:#2F4438;">足裏・ふくらはぎケアの詳しい選び方 →</a></p>\n        <div class="menu-actions">'''
    if marker in s:
        s=s.replace(marker,repl,1)
    return s


def polish_head(s):
    s=s.replace('<title>蒲田のドライヘッドスパ｜首肩と合わせたリラクゼーション｜身悠晏</title>', '<title>蒲田でヘッドスパを探している方へ｜ドライヘッドケア10分｜身悠晏</title>')
    s=s.replace('content="蒲田駅東口徒歩1分。身悠晏のドライヘッドスパと首肩まわりのリラクゼーション。整体・足裏・アロマとの組み合わせも可能。11:00〜翌2:00。"', 'content="蒲田駅東口徒歩1分。ヘッドスパを探している方へ。身悠晏では髪を濡らさない目まわり・ドライヘッドケア10分1,000円をご用意。整体・足裏との組み合わせも可能。"')
    s=s.replace('蒲田のドライヘッドスパ｜首肩と合わせたリラクゼーション｜身悠晏', '蒲田でヘッドスパを探している方へ｜ドライヘッドケア10分｜身悠晏')
    s=s.replace('"name":"蒲田のドライヘッドスパ"', '"name":"蒲田のドライヘッドケア"')
    s=s.replace('<span>›</span>蒲田のドライヘッドスパ</nav>', '<span>›</span>蒲田のドライヘッドケア</nav>')
    s=s.replace('<h1>蒲田のドライヘッドスパ</h1><p class="section-lead" style="text-align:left">頭まわりをゆったり休めたい日や、首肩まわりと合わせて受けたい方へ。ドライで行うため、髪を濡らさず受けられます。</p>', '<h1>蒲田でヘッドスパを探している方へ｜ドライヘッドケア</h1><p class="section-lead" style="text-align:left">当店は美容室型の洗髪ヘッドスパではなく、髪を濡らさない「目まわり・ヘッドケア」をご提供しています。10分1,000円で、整体や足裏などに組み合わせて利用できます。</p>')
    s=s.replace('<img src="assets/img/shop-room.jpg" alt="蒲田のドライヘッドスパ" fetchpriority="high">', '<img src="assets/img/shop-room.jpg" alt="身悠晏の落ち着いた施術スペース" fetchpriority="high">')
    s=s.replace('<h2>ドライヘッドスパとは</h2><p>水やシャンプーを使わず、頭まわりをゆったりケアするリラクゼーションメニューです。美容室の洗髪を伴うヘッドスパとは内容が異なります。</p>', '<h2>当店のヘッドケアについて</h2><p>水やシャンプーを使わず、目まわり・頭まわりをゆったりケアする10分のリラクゼーションメニューです。料金は1,000円。美容室の洗髪を伴うヘッドスパとは内容が異なります。</p>')
    s=s.replace('ヘッドスパの対応時間・組み合わせはコースにより異なります。', 'ヘッドケアの組み合わせ可否はコースにより異なります。')
    return s

rw('index.html',polish_index)
rw('menu.html',polish_menu)
rw('headspa-kamata.html',polish_head)

# Basic post-polish assertions
idx=Path('index.html').read_text(encoding='utf-8')
assert 'visitor-english' not in idx
menu=Path('menu.html').read_text(encoding='utf-8')
foot=menu.split('id="foot"',1)[1].split('id="bodycare"',1)[0]
assert 'ashitsubo-fukurahagi.html' in foot
head=Path('headspa-kamata.html').read_text(encoding='utf-8')
assert '10分1,000円' in head and '美容室型' in head
print('polish checks passed')
