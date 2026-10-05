// Minimal WebGL plumbing for the particle stage

function compileShader(gl: WebGLRenderingContext, type: GLenum, source: string) {
  const shader = gl.createShader(type)

  if (!shader) throw new Error('Could not create a shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? '')

  return shader
}

// Compiles and links a program; throws with the driver's log when either step fails
export function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const program = gl.createProgram()

  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? '')

  return program
}

export const getUniformLocations = <Name extends string>(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  names: readonly Name[]
) =>
  Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<
    Name,
    WebGLUniformLocation | null
  >

export const getAttributeLocations = <Name extends string>(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  names: readonly Name[]
) => Object.fromEntries(names.map((name) => [name, gl.getAttribLocation(program, name)])) as Record<Name, number>

// Uploads one per-point attribute. `buffers` caches a buffer per name so rebuilds reuse it.
export function uploadAttribute(
  gl: WebGLRenderingContext,
  buffers: Partial<Record<string, WebGLBuffer>>,
  location: number,
  name: string,
  data: Float32Array,
  size: number
) {
  buffers[name] ??= gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name])
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
}
