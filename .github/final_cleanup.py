from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('足裏リフレ・整体ボディケア・アロマ・ドライヘッドスパのリラクゼーションサロン身悠晏。','足裏リフレ・整体ボディケア・アロマ・ヘッドケアのリラクゼーションサロン身悠晏。')
s=s.replace('<h3>アロマ・ヘッドスパ</h3>','<h3>アロマ・ヘッドケア</h3>')
p.write_text(s,encoding='utf-8')
assert 'ドライヘッドスパのリラクゼーションサロン' not in s
print('final consistency cleanup passed')
