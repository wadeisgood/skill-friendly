#!/usr/bin/env python3
import json
import subprocess
import time
from pathlib import Path

OUT_DIR = Path('/tmp/menu-probe')
OUT_DIR.mkdir(parents=True, exist_ok=True)


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return {
        'cmd': cmd,
        'returncode': p.returncode,
        'stdout': p.stdout,
        'stderr': p.stderr,
    }


def gnome_shell_screenshot(method, *args):
    cmd = [
        'gdbus', 'call', '--session',
        '--dest', 'org.gnome.Shell.Screenshot',
        '--object-path', '/org/gnome/Shell/Screenshot',
        '--method', f'org.gnome.Shell.Screenshot.{method}',
    ] + [str(a) for a in args]
    return run(cmd)


def parse_call_success(stdout: str):
    s = stdout.strip()
    return {'raw': s, 'success': 'true' in s.lower()}


def capture_fullscreen(name: str):
    path = OUT_DIR / name
    res = gnome_shell_screenshot('Screenshot', 'false', 'false', str(path))
    meta = parse_call_success(res['stdout'])
    meta['path'] = str(path)
    meta['exists'] = path.exists()
    meta['size'] = path.stat().st_size if path.exists() else None
    return {'call': res, 'meta': meta}


def capture_window(name: str):
    path = OUT_DIR / name
    res = gnome_shell_screenshot('ScreenshotWindow', 'true', 'false', 'false', str(path))
    meta = parse_call_success(res['stdout'])
    meta['path'] = str(path)
    meta['exists'] = path.exists()
    meta['size'] = path.stat().st_size if path.exists() else None
    return {'call': res, 'meta': meta}


def capture_area(name: str, x: int, y: int, w: int, h: int):
    path = OUT_DIR / name
    res = gnome_shell_screenshot('ScreenshotArea', x, y, w, h, 'false', str(path))
    meta = parse_call_success(res['stdout'])
    meta.update({'path': str(path), 'x': x, 'y': y, 'w': w, 'h': h})
    meta['exists'] = path.exists()
    meta['size'] = path.stat().st_size if path.exists() else None
    return {'call': res, 'meta': meta}


def ocr_image(path: str):
    txt_base = str(Path(path).with_suffix(''))
    res = run(['tesseract', path, txt_base, '-l', 'chi_tra+eng'])
    txt_path = Path(txt_base + '.txt')
    text = txt_path.read_text(errors='replace') if txt_path.exists() else ''
    return {
        'call': res,
        'text_path': str(txt_path),
        'text_exists': txt_path.exists(),
        'text': text,
    }


def image_diff(before: str, after: str, diff_out: str):
    return run(['python3', '-c', "from PIL import Image, ImageChops; import sys; b=Image.open(sys.argv[1]).convert('RGB'); a=Image.open(sys.argv[2]).convert('RGB'); d=ImageChops.difference(b,a); d.save(sys.argv[3]); print(d.getbbox())", before, after, diff_out])


def crop_image(src: str, dst: str, x: int, y: int, w: int, h: int):
    return run(['python3', '-c', "from PIL import Image; import sys; img=Image.open(sys.argv[1]); x,y,w,h=map(int, sys.argv[3:7]); img.crop((x,y,x+w,y+h)).save(sys.argv[2])", src, dst, str(x), str(y), str(w), str(h)])


def parse_bbox(stdout: str):
    s = stdout.strip()
    if s == 'None' or not s:
        return None
    s = s.strip('()')
    parts = [p.strip() for p in s.split(',')]
    if len(parts) != 4:
        return None
    x1, y1, x2, y2 = map(int, parts)
    return {'x': x1, 'y': y1, 'w': x2 - x1, 'h': y2 - y1}


def before_after_probe(delay_ms: int = 600):
    before = capture_fullscreen('before.png')
    time.sleep(delay_ms / 1000)
    after = capture_fullscreen('after.png')
    diff_path = OUT_DIR / 'diff.png'
    diff = image_diff(before['meta']['path'], after['meta']['path'], str(diff_path))
    bbox = parse_bbox(diff['stdout'])
    result = {
        'before': before,
        'after': after,
        'diff_call': diff,
        'diff_path': str(diff_path),
        'diff_exists': diff_path.exists(),
        'bbox': bbox,
    }
    if bbox:
        crop_path = OUT_DIR / 'menu-crop.png'
        crop = crop_image(after['meta']['path'], str(crop_path), bbox['x'], bbox['y'], bbox['w'], bbox['h'])
        result['crop_call'] = crop
        result['crop_path'] = str(crop_path)
        result['crop_exists'] = crop_path.exists()
        if crop_path.exists():
            result['crop_ocr'] = ocr_image(str(crop_path))
    return result


def main():
    report = {
        'fullscreen': capture_fullscreen('sanity-fullscreen.png'),
        'window': capture_window('sanity-window.png'),
        'area': capture_area('sanity-area.png', 100, 100, 800, 600),
        'before_after_probe': before_after_probe(),
    }

    if report['fullscreen']['meta']['exists']:
        report['fullscreen_ocr'] = ocr_image(report['fullscreen']['meta']['path'])

    out = OUT_DIR / 'report.json'
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(str(out))


if __name__ == '__main__':
    main()
