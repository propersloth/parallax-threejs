---
type: Slash Command
description: Set the camera to a specific, named, or previously-used view
---

Arguments: $ARGUMENTS — a named view (if any have been saved this session) or explicit position/target coordinates.

1. If $ARGUMENTS names a previously saved view, set camera.position and camera.target to those exact values via threejs-devtools-mcp.
2. If given explicit coordinates, set them directly.
3. If neither, ask which — don't default to "front of the scene" silently, since the entire point of this command is that both parties are looking at the same, deliberately chosen framing.
4. Confirm the applied position/target back to the person in one line so there's no ambiguity about what "synced" means right now.

Prerequisite: expose `window.__THREE_CAMERA__ = camera` — threejs-devtools-mcp's bridge only discovers the active camera two ways: this global, or traversing the scene graph for the first object with `.isCamera` set. A camera that's never added as a scene child (an ordinary, valid three.js pattern) is invisible to the traversal fallback, and `camera_details`/`set_camera` report "No camera found in scene" even though everything else is fine (UAT finding #10). If `set_camera` fails with that error, ask the person to add `window.__THREE_CAMERA__ = camera` rather than assuming the scene itself is broken.
