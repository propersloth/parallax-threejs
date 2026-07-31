// Pure decision logic extracted from post-edit.js specifically so it's
// unit-testable without stdin mocking or file-I/O fixtures — ESM so both
// Node (post-edit.js, via dynamic import) and Deno (the test file) can
// import it directly with no build step and no dual-package friction.

export const RENDER_RELEVANT = /\.(js|ts|jsx|tsx|glsl|vert|frag)$/;
export const RENDER_DIRS = /(materials|shaders|lighting|scene|geometry)\//;

export function isRenderRelevant(path) {
  return RENDER_RELEVANT.test(path) && RENDER_DIRS.test(path);
}
