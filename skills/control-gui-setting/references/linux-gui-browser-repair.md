# Linux GUI Browser Repair

## Fast path

Run these from a terminal opened inside the desktop session:

```bash
dbus-update-activation-environment --systemd DISPLAY WAYLAND_DISPLAY XDG_SESSION_TYPE XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
systemctl --user import-environment DISPLAY WAYLAND_DISPLAY XDG_SESSION_TYPE XDG_RUNTIME_DIR DBUS_SESSION_BUS_ADDRESS
systemctl --user restart openclaw-gateway.service
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw status
```

Expected result:

```text
running: true
browser: chrome
```

## Verification checklist

1. `openclaw gateway status` shows the gateway is running.
2. `openclaw browser status` shows `enabled: true`.
3. `systemctl --user show-environment` includes:
   - `DISPLAY`
   - `WAYLAND_DISPLAY`
   - `XDG_SESSION_TYPE`
   - `XDG_RUNTIME_DIR`
   - `DBUS_SESSION_BUS_ADDRESS`
4. `openclaw browser --browser-profile openclaw start` no longer throws X server / DISPLAY errors.
5. `openclaw browser --browser-profile openclaw status` shows `running: true`.

## If it still fails

Read the browser-related gateway logs:

```bash
grep -nEi 'browser|chrome|chromium|cdp|devtools|playwright|mcp' /tmp/openclaw/openclaw-$(date +%F).log | tail -200
tail -n 160 /tmp/openclaw/openclaw-$(date +%F).log
```

Then classify the failure:

- `Missing X server or $DISPLAY`
  - systemd user env still does not see desktop variables
- `Could not find DevToolsActivePort`
  - existing-session attach problem, often unrelated to managed browser launch
- `running: false` without GUI error
  - inspect Chrome stderr from logs and verify browser binary path
