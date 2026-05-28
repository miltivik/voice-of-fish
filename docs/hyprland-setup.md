# Voice of Fish on Hyprland / Wayland

Voice of Fish is a Tauri v2 desktop app. On Linux it uses the system WebKitGTK/WebView stack and the compositor's normal Wayland/XDG behavior.

## Recommended launch environment

Start with the default environment first. If the window is blank, flickers, or opens through XWayland unexpectedly, try launching from a terminal with:

```sh
GDK_BACKEND=wayland,x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 voice-of-fish-desktop
```

For development:

```sh
GDK_BACKEND=wayland,x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 pnpm dev
```

Notes:

- `GDK_BACKEND=wayland,x11` prefers Wayland and allows GTK to fall back to X11 if the local WebKitGTK stack requires it.
- `WEBKIT_DISABLE_COMPOSITING_MODE=1` can help on compositors/drivers that show blank WebKit windows. Remove it if rendering is already stable.
- Ensure `xdg-desktop-portal-hyprland` is running for native file/folder dialogs.

## Hyprland window rules

The app now sets native decorations, resizable behavior, centering, and minimum size in `apps/desktop/src-tauri/tauri.conf.json`; most users should not need custom rules.

Hyprland rule syntax changes across releases. For Hyprland 0.55+, the official wiki documents Lua-style rules:

```lua
-- Match by title (most reliable across XWayland and native Wayland)
hl.window_rule({
  name = "voice-of-fish-float",
  match = { title = "Voice of Fish" },
  float = true,
})

-- Optional: disable blur if WebKit rendering looks soft.
hl.window_rule({
  name = "voice-of-fish-no-blur",
  match = { title = "Voice of Fish" },
  no_blur = true,
})
```

### Valid identifiers

Tauri v2 derives window identifiers as follows:

- **X11/XWayland WM_CLASS**: `"Voice of Fish"` (from title)
- **Wayland app_id**: `"com.voiceoffish.desktop"` (from bundle identifier)
- **Window label**: `"main"` (explicit in config, default)
- **Window title**: `"Voice of Fish"` (from title)

On X11/XWayland, use `class` in match rules; on Wayland native, use `app_id`. The title `title = "Voice of Fish"` works on both.

To inspect the identifiers while the app is running:

```sh
hyprctl clients | grep -A5 -i voice
```

This shows `title`, `class`, and `initialClass` values you can use in `match`.

### Using class on X11/XWayland

If your Hyprland version still uses legacy hyprlang `windowrulev2`, use:

```
windowrulev2 = float, class:^(Voice of Fish)$
```

After editing Hyprland config:

```sh
hyprctl reload
hyprctl configerrors
```

If your Hyprland version still uses legacy hyprlang `windowrulev2`, consult the matching version of the Hyprland wiki before copying rules; the 0.55+ Lua examples above are not valid for older configs.

## Native file picker notes

Linux `s2.cpp` binaries are often extensionless, for example `s2`, or named `s2.cpp`. The app's Linux binary picker intentionally opens without extension filters so these files remain selectable.
