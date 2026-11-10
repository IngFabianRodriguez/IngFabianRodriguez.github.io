import type { Vec3 } from "@/domain/flyover/camera";
import type { Ribbon } from "@/domain/flyover/ribbon";
import type { TerrainMesh } from "@/domain/flyover/terrainMesh";

export interface DrawFrame {
  mesh: TerrainMesh;
  ribbon: Ribbon;
  viewProjection: Float32Array;
  eye: Vec3;
  /** Distances from the camera between which the ground fades into the haze. */
  fogNear: number;
  fogFar: number;
  /** Colour of the haze and of the sky, red, green and blue from 0 to 1. */
  haze: [number, number, number];
}

export interface FlyoverRenderer {
  /** Replaces the picture of the ground that is draped over the terrain. */
  setGroundTexture(source: TexImageSource): void;
  draw(frame: DrawFrame): void;
  dispose(): void;
}

const GROUND_VERTEX = `#version 300 es
in vec3 aPos;
in vec2 aUv;
in float aShade;
uniform mat4 uViewProjection;
uniform vec3 uEye;
out vec2 vUv;
out float vShade;
out float vDist;
void main() {
  vUv = aUv;
  vShade = aShade;
  vDist = distance(aPos, uEye);
  gl_Position = uViewProjection * vec4(aPos, 1.0);
}`;

const GROUND_FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uGround;
uniform vec3 uHaze;
uniform vec2 uFogRange;
in vec2 vUv;
in float vShade;
in float vDist;
out vec4 outColor;
void main() {
  vec3 color = texture(uGround, vUv).rgb * vShade;
  float fog = smoothstep(uFogRange.x, uFogRange.y, vDist);
  outColor = vec4(mix(color, uHaze, fog), 1.0);
}`;

const RIBBON_VERTEX = `#version 300 es
in vec3 aPos;
in vec4 aColor;
uniform mat4 uViewProjection;
uniform vec3 uEye;
out vec4 vColor;
out float vDist;
void main() {
  vColor = aColor;
  vDist = distance(aPos, uEye);
  gl_Position = uViewProjection * vec4(aPos, 1.0);
}`;

const RIBBON_FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 uHaze;
uniform vec2 uFogRange;
in vec4 vColor;
in float vDist;
out vec4 outColor;
void main() {
  float fog = smoothstep(uFogRange.x, uFogRange.y, vDist);
  outColor = vec4(mix(vColor.rgb, uHaze, fog), vColor.a * (1.0 - fog));
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL could not create a shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader error: ${gl.getShaderInfoLog(shader) ?? "unknown"}`);
  }
  return shader;
}

function program(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const linked = gl.createProgram();
  if (!linked) throw new Error("WebGL could not create a program.");
  gl.attachShader(linked, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(linked, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(linked);
  if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) {
    throw new Error(`Program error: ${gl.getProgramInfoLog(linked) ?? "unknown"}`);
  }
  return linked;
}

/**
 * Draws the terrain, the picture of the ground draped over it and the ribbon of the route with
 * WebGL 2. It keeps no scene of its own: every call is given the whole frame to draw. Null when
 * the browser has no WebGL 2.
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  indices: Uint32Array,
): FlyoverRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    // The frame is copied out right after it is drawn; keeping it makes that safe at any time.
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  const groundProgram = program(gl, GROUND_VERTEX, GROUND_FRAGMENT);
  const ribbonProgram = program(gl, RIBBON_VERTEX, RIBBON_FRAGMENT);

  const buffer = () => {
    const created = gl.createBuffer();
    if (!created) throw new Error("WebGL could not create a buffer.");
    return created;
  };
  const positions = buffer();
  const uvs = buffer();
  const shade = buffer();
  const indexBuffer = buffer();
  const ribbonPositions = buffer();
  const ribbonColors = buffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const groundVao = gl.createVertexArray();
  const ribbonVao = gl.createVertexArray();
  const attribute = (
    vao: WebGLVertexArrayObject | null,
    prog: WebGLProgram,
    name: string,
    source: WebGLBuffer,
    size: number,
  ) => {
    gl.bindVertexArray(vao);
    const at = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, source);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, size, gl.FLOAT, false, 0, 0);
  };
  attribute(groundVao, groundProgram, "aPos", positions, 3);
  attribute(groundVao, groundProgram, "aUv", uvs, 2);
  attribute(groundVao, groundProgram, "aShade", shade, 1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  attribute(ribbonVao, ribbonProgram, "aPos", ribbonPositions, 3);
  attribute(ribbonVao, ribbonProgram, "aColor", ribbonColors, 4);
  gl.bindVertexArray(null);

  const texture = gl.createTexture();
  const anisotropy = gl.getExtension("EXT_texture_filter_anisotropic");

  const uniform = (prog: WebGLProgram, name: string) => gl.getUniformLocation(prog, name);

  return {
    setGroundTexture(source) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (anisotropy) {
        const max = gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
        gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, max));
      }
    },

    draw(frame) {
      const { mesh, ribbon, haze } = frame;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(haze[0], haze[1], haze[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.useProgram(groundProgram);
      gl.uniformMatrix4fv(uniform(groundProgram, "uViewProjection"), false, frame.viewProjection);
      gl.uniform3f(uniform(groundProgram, "uEye"), frame.eye.x, frame.eye.y, frame.eye.z);
      gl.uniform3f(uniform(groundProgram, "uHaze"), haze[0], haze[1], haze[2]);
      gl.uniform2f(uniform(groundProgram, "uFogRange"), frame.fogNear, frame.fogFar);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniform(groundProgram, "uGround"), 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvs);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, shade);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.shade, gl.DYNAMIC_DRAW);
      gl.bindVertexArray(groundVao);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);

      if (ribbon.vertexCount > 0) {
        gl.useProgram(ribbonProgram);
        gl.uniformMatrix4fv(uniform(ribbonProgram, "uViewProjection"), false, frame.viewProjection);
        gl.uniform3f(uniform(ribbonProgram, "uEye"), frame.eye.x, frame.eye.y, frame.eye.z);
        gl.uniform3f(uniform(ribbonProgram, "uHaze"), haze[0], haze[1], haze[2]);
        gl.uniform2f(uniform(ribbonProgram, "uFogRange"), frame.fogNear, frame.fogFar);
        gl.bindBuffer(gl.ARRAY_BUFFER, ribbonPositions);
        gl.bufferData(gl.ARRAY_BUFFER, ribbon.positions, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, ribbonColors);
        gl.bufferData(gl.ARRAY_BUFFER, ribbon.colors, gl.DYNAMIC_DRAW);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        // A little nearer than the ground it lies on, so the two do not fight for the pixels.
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-2, -2);
        gl.bindVertexArray(ribbonVao);
        gl.drawArrays(gl.TRIANGLES, 0, ribbon.vertexCount);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      gl.bindVertexArray(null);
    },

    dispose() {
      for (const b of [positions, uvs, shade, indexBuffer, ribbonPositions, ribbonColors]) {
        gl.deleteBuffer(b);
      }
      gl.deleteTexture(texture);
      gl.deleteProgram(groundProgram);
      gl.deleteProgram(ribbonProgram);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
