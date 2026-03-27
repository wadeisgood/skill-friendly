---
name: control-gui-setting
description: Diagnose and fix OpenClaw GUI browser control on Linux desktops, especially when agent-controlled browser launch fails with errors like "Missing X server or $DISPLAY", Chrome CDP startup failure, or a systemd --user OpenClaw gateway that cannot open a visible browser window despite a working GNOME/KDE desktop session. Use when setting up controllable browser windows, repairing DISPLAY/WAYLAND/XDG environment propagation, or validating that OpenClaw-managed Chrome can launch under a desktop login session.
---

# Control GUI Setting

Use this skill to make OpenClaw's managed browser work on a real Linux desktop with a visible browser window.

## Quick diagnosis

Run these in order:

```bash
openclaw gateway status
openclaw browser status
openclaw browser --browser-profile openclaw start
```

Interpretation:

- If `browser status` says `enabled: true` and detects Chrome/Brave, the browser feature is installed.
- If `start` fails with errors containing `Missing X server or $DISPLAY`, the usual root cause is **not** "no desktop installed". It is usually that the `openclaw-gateway.service` user service did not inherit the desktop session environment.
- If `user` profile attach fails with `Could not find DevToolsActivePort`, that means attaching to the existing Chrome session is not ready; prefer fixing the managed `openclaw` profile first.

## Workflow

### 1. Confirm the browser feature itself is available

Run:

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile user status
```

Healthy signs:

- `enabled: true`
- a detected browser path such as `/usr/bin/google-chrome-stable`
- profile `openclaw` exists

If those appear, do **not** jump to reinstalling Chrome or OpenClaw.

### 2. Read the real failure from logs

Inspect the gateway log:

```bash
grep -nEi 'browser|chrome|chromium|cdp|devtools|playwright|mcp' /tmp/openclaw/openclaw-$(date +%F).log | tail -200
tail -n 160 /tmp/openclaw/openclaw-$(date +%F).log
```

Key signatures and meaning:

- `Missing X server or $DISPLAY`
  - Desktop GUI variables are missing from the OpenClaw service environment.
- `The platform failed to initialize. Exiting.`
  - Chrome tried to launch but could not access a display server.
- `Could not find DevToolsActivePort`
  - Existing Chrome attach failed; not necessarily the managed browser path.

### 3. Verify whether the machine actually has a desktop session

Check from a shell:

```bash
loginctl list-sessions --no-legend
loginctl user-status "$USER"
```

Look for evidence of a live desktop, for example:

- `org.gnome.Shell@wayland.service`
- `Xwayland :0`
- desktop portals or GNOME/KDE user services

If these exist, the machine **does** have a working GUI session. The issue is environment propagation into systemd user services.

### 4. Compare shell env vs systemd --user env

Run:

```bash
printf 'DISPLAY=%s\n' "$DISPLAY"
printf 'WAYLAND_DISPLAY=%s\n' "$WAYLAND_DISPLAY"
printf 'XDG_SESSION_TYPE=%s\n' "$XDG_SESSION_TYPE"
printf 'XDG_RUNTIME_DIR=%s\n' "$XDG_RUNTIME_DIR"
printf 'DBUS_SESSION_BUS_ADDRESS=%s\n' "$DBUS_SESSION_BUS_ADDRESS"

systemctl --user show-environment | grep -E '^(DISPLAY|WAYLAND_DISPLAY|XDG_SESSION_TYPE|XDG_RUNTIME_DIR|DBUS_SESSION_BUS_ADDRESS)='
```

Expected healthy `systemd --user` environment on GNOME Wayland often includes something like:

```text
DISPLAY=:0
WAYLAND_DISPLAY=wayland-0
XDG_SESSION_TYPE=wayland
XDG_RUNTIME_DIR=/run/user/1000
DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
```

If `DISPLAY` / `WAYLAND_DISPLAY` are missing in `systemctl --user show-environment`, that is the main bug.

### 5. Import the desktop session environment into systemd --user

Run from a **desktop terminal inside the logged-in GUI session**:

```bash
dbus-update-activation-environment --systemd DISPLAY WAYLAND_DISPLAY XDG_SESSION_TYPE XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
systemctl --user import-environment DISPLAY WAYLAND_DISPLAY XDG_SESSION_TYPE XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
systemctl --user restart openclaw-gateway.service
```

Notes:

- Restarting `openclaw-gateway.service` may interrupt the current chat/control session. That is expected.
- If the shell already lacks `DISPLAY`/`WAYLAND_DISPLAY`, import from that shell will not help. Use a terminal that is definitely opened from the live desktop session.

### 6. Validate the repair

After the gateway restarts, run:

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw status
```

Success looks like:

```text
running: true
browser: chrome
```

At that point, the managed browser is ready and the machine-side setup is fixed.

## Decision guide

### Prefer the managed `openclaw` browser when:

- you want the most reliable automation path
- you do not need your normal daily browser profile
- you want a clean, agent-only browser window

### Prefer the `user` profile only when:

- you specifically need existing logged-in sessions
- you understand that existing-session attach is more fragile
- the user is present to approve attach prompts if needed

## Common mistakes

- Reinstalling Chrome before checking `systemctl --user show-environment`
- Assuming `Missing X server or $DISPLAY` means the whole machine has no desktop
- Trying to fix `user` attach first when the managed `openclaw` browser is still broken
- Restarting the gateway remotely and being surprised when the current control session drops

## Minimal repair recipe

Use this when the machine clearly has a live GNOME/KDE desktop but OpenClaw cannot open a visible browser window:

```bash
dbus-update-activation-environment --systemd DISPLAY WAYLAND_DISPLAY XDG_SESSION_TYPE XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
systemctl --user import-environment DISPLAY WAYLAND_DISPLAY XDG_SESSION_TYPE XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
systemctl --user restart openclaw-gateway.service
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw status
```

## Reference files

- For a copy-paste troubleshooting flow, read `references/linux-gui-browser-repair.md`.
- For symptom-to-cause mapping, read `references/error-signatures.md`.
