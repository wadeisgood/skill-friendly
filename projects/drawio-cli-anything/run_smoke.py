import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
PKG_ROOT = BASE

def run(args):
    cmd = [sys.executable, '-m', 'cli_anything.drawio.drawio_cli'] + args
    print('$', ' '.join(cmd))
    env = os.environ.copy()
    env['PYTHONPATH'] = PKG_ROOT + (os.pathsep + env['PYTHONPATH'] if env.get('PYTHONPATH') else '')
    p = subprocess.run(cmd, capture_output=True, text=True, env=env)
    print(p.stdout)
    if p.stderr:
        print(p.stderr, file=sys.stderr)
    if p.returncode != 0:
        raise SystemExit(p.returncode)

run(['--json', 'project', 'presets'])
run(['--json', 'project', 'new', '-o', '/tmp/test-diagram.drawio'])
run(['--json', '--project', '/tmp/test-diagram.drawio', 'shape', 'add', 'rectangle', '--label', 'Server'])
run(['--json', '--project', '/tmp/test-diagram.drawio', 'shape', 'list'])
run(['--json', '--project', '/tmp/test-diagram.drawio', 'export', 'render', '/tmp/test-diagram.xml', '-f', 'xml', '--overwrite'])
