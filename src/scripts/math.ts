// Math helpers for the particle stage. Stage coordinates: origin at the viewport centre, x right, y up, z toward the viewer

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

// An orbit is an ellipse in 3D: center + cos(angle) * axisU + sin(angle) * axisV
export interface Orbit {
  center: Vec3
  axisU: Vec3
  axisV: Vec3
}

export const TAU = Math.PI * 2
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export const smoothstep = (t: number) => t * t * (3 - 2 * t)

// Shortest signed angle, in -PI..PI
export const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))

// Fraction to move toward a target this frame, so easing looks the same at any frame rate
export const damp = (rate: number, dt: number) => 1 - Math.exp(-dt * rate)

// 3D only; written out because the scene builder calls it once per letter particle
export const normalize = ([x, y, z]: Vec3): Vec3 => {
  const length = Math.hypot(x, y, z)

  return [x / length, y / length, z / length]
}

// Perspective scale of a point at depth z
export const perspective = (z: number, cameraDistance: number) => cameraDistance / (cameraDistance - z)

// Same rotation as the shader's tilt(): yaw then pitch, around a horizontal axis at height pivotY
export function tiltPoint([x, y, z]: Vec3, [yaw, pitch]: Vec2, pivotY: number): Vec3 {
  y -= pivotY
  ;[x, z] = [Math.cos(yaw) * x + Math.sin(yaw) * z, -Math.sin(yaw) * x + Math.cos(yaw) * z]
  ;[y, z] = [Math.cos(pitch) * y - Math.sin(pitch) * z, Math.sin(pitch) * y + Math.cos(pitch) * z]

  return [x, y + pivotY, z]
}

export const pointOnOrbit = ({ center, axisU, axisV }: Orbit, angle: number): Vec3 => [
  center[0] + Math.cos(angle) * axisU[0] + Math.sin(angle) * axisV[0],
  center[1] + Math.cos(angle) * axisU[1] + Math.sin(angle) * axisV[1],
  center[2] + Math.cos(angle) * axisU[2] + Math.sin(angle) * axisV[2]
]

// Orbit angle whose screen projection lies toward `point` from the orbit centre. Inverting the projected ellipse
// (instead of using the plain screen angle) keeps the result from flipping as the point crosses the centre.
export function orbitAngleToward({ center, axisU, axisV }: Orbit, point: Vec2) {
  const dx = point[0] - center[0]
  const dy = point[1] - center[1]
  const determinant = axisU[0] * axisV[1] - axisU[1] * axisV[0]
  const cos = (dx * axisV[1] - dy * axisV[0]) / determinant
  const sin = (axisU[0] * dy - axisU[1] * dx) / determinant

  return Math.atan2(sin, cos)
}
