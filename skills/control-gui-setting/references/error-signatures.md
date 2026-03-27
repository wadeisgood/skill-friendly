# Error Signatures

## `Missing X server or $DISPLAY`

Meaning:
- Chrome launch attempted from OpenClaw service context
- service cannot access GUI display variables

Likely fix:
- import GUI environment into `systemd --user`
- restart `openclaw-gateway.service`

## `The platform failed to initialize. Exiting.`

Meaning:
- browser process started but failed before UI initialization
- often paired with missing X/Wayland display access

Likely fix:
- same as above; verify GUI session exists and service env contains `DISPLAY` or `WAYLAND_DISPLAY`

## `Could not find DevToolsActivePort`

Meaning:
- OpenClaw could not attach to an existing Chrome session
- usually affects `user` / existing-session attach flow

Likely fix:
- prefer validating the managed `openclaw` profile first
- only debug `user` attach after managed browser works

## `running: false` while browser is detected

Meaning:
- browser feature is enabled and a browser binary is present
- launch path still failed

Likely fix:
- inspect logs, not installation
- check environment propagation, then profile-specific issues
