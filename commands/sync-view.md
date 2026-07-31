---
type: Slash Command
description: Set the camera to a specific, named, or previously-used view
---

Arguments: $ARGUMENTS — a named view (if any have been saved this session) or explicit position/target coordinates.

1. If $ARGUMENTS names a previously saved view, set camera.position and camera.target to those exact values via threejs-devtools-mcp.
2. If given explicit coordinates, set them directly.
3. If neither, ask which — don't default to "front of the scene" silently, since the entire point of this command is that both parties are looking at the same, deliberately chosen framing.
4. Confirm the applied position/target back to the person in one line so there's no ambiguity about what "synced" means right now.
