"""Render a storyboard with the real ShortGPT CoreEditingEngine, using local assets only."""
import json
import os
import sys
from pathlib import Path

os.environ.setdefault('IMAGEIO_FFMPEG_EXE', '/opt/homebrew/bin/ffmpeg')
upstream, manifest, output = sys.argv[1:4]
sys.path.insert(0, upstream)
from PIL import Image, ImageDraw, ImageFont
from shortGPT.editing_framework.core_editing_engine import CoreEditingEngine

data = json.loads(Path(manifest).read_text())
palette = json.loads((Path(__file__).resolve().parents[1] / 'design/tokens.resolved.json').read_text())
width, height = (960, 540) if data['format'] == 'youtube' else (540, 960)
font_path = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
font = ImageFont.truetype(font_path, 25)
small = ImageFont.truetype(font_path, 18)
schema = {'visual_assets': {}, 'audio_assets': {}}
cursor = 0

def wrap(text, limit):
    lines, line = [], ''
    for char in text:
        if char == '\n' or font.getlength(line + char) > limit:
            lines.append(line)
            line = '' if char == '\n' else char
        else:
            line += char
    return lines + ([line] if line else [])

for index, cut in enumerate(data['cuts']):
    image = Image.new('RGB', (width, height), palette['color-background'])
    drawing = ImageDraw.Draw(image)
    drawing.text((30, 25), f"Snowlink Team Studio / CUT {index + 1:02d}", font=small, fill=palette['color-accent'])
    source = cut.get('image')
    if source:
        photo = Image.open(source).convert('RGB')
        photo.thumbnail((width - 60, height // 2))
        image.paste(photo, ((width - photo.width) // 2, 85))
    else:
        drawing.rounded_rectangle((30, 85, width - 30, height // 2 + 70), radius=15, fill=palette['color-info-soft'])
        drawing.text((55, 110), '장면 이미지 미등록', font=font, fill=palette['color-info'])
    y = height // 2 + 100
    lines = wrap(cut['title'] + '\n' + (cut['narration'] or cut['visual']), width - 65)
    for line in lines:
        if y > height - 45:
            break
        drawing.text((32, y), line, font=font, fill=palette['color-text'])
        y += 36
    frame = str(Path(output).with_name(f'{index:02d}.png'))
    image.save(frame)
    schema['visual_assets'][f'cut_{index}'] = {'type': 'image', 'z': index, 'parameters': {'url': frame}, 'actions': [
        {'type': 'set_time_start', 'param': cursor}, {'type': 'set_time_end', 'param': cursor + cut['duration']}]}
    cursor += cut['duration']

CoreEditingEngine().generate_video(schema, output, force_duration=cursor, threads=2)
print(json.dumps({'output': output, 'duration': cursor}))
