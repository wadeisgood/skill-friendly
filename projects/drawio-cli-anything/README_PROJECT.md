# Draw.io CLI-Anything Harness

This project contains a CLI-Anything-style harness for draw.io / diagrams.net.

## Included

- stateful CLI for manipulating `.drawio` files
- shape, connector, page, project, session, and export commands
- editable Python package via `setup.py`
- tests for core and end-to-end flows

## Quick start

```bash
cd projects/drawio-cli-anything
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e . pytest
cli-anything-drawio --json project presets
```

## Current status

- Core CLI functionality works
- Editable install works
- Core tests pass
- XML export works
- PNG/PDF/SVG desktop export may fail depending on the local draw.io desktop runtime environment, especially Snap/headless OpenGL setups
