// Particle shaders. Every point has three positions (logotype scene, globe, wave field) and the scroll blends them.
// aKind values match PARTICLE_KIND in scene.ts.

export const ATTRIBUTE_NAMES = ['aText', 'aSphere', 'aLand', 'aField', 'aNormal', 'aRand', 'aKind'] as const

export type AttributeName = (typeof ATTRIBUTE_NAMES)[number]

export const UNIFORM_NAMES = [
  'uResolution',
  'uCanvasHeight',
  'uViewportOffset',
  'uTime',
  'uIntro',
  'uScroll',
  'uDpr',
  'uBrightness',
  'uScrollSpeed',
  'uToSphere',
  'uToField',
  'uMouse',
  'uMouseInfluence',
  'uMouseSpeed',
  'uTilt',
  'uSun',
  'uRingProgress',
  'uRingSpin',
  'uOrbitAlpha',
  'uSphereCenter',
  'uSphereRadius',
  'uGlobeSpin',
  'uCameraDistance',
  'uPivot',
  'uExtrusion',
  'uScale',
  'uPlanet',
  'uDotRest',
  'uEclipticU',
  'uEclipticV',
  'uBowlA',
  'uBowlB',
  'uRingRadius',
  'uOrbitCenter',
  'uOrbitU',
  'uOrbitV'
] as const

export type UniformName = (typeof UNIFORM_NAMES)[number]

export const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  // Share of the intro each point spends settling; the latest start (.35 + .15) plus this ends at 1
  const float INTRO_SETTLE = .5;
  // A long lens for the globe, so the map is not magnified in the middle and squeezed at the rim; globe-pins.ts matches
  const float GLOBE_FOCAL = 2400.;

  // Per point
  attribute vec3 aText;   // position in the logotype scene (orbit path points: x = angle, y = orbit index)
  attribute vec3 aSphere; // position on the unit globe (second scroll stage)
  attribute float aLand;  // 1 where the globe point is on land, 0 at sea
  attribute vec3 aField;  // position on the wave field (third scroll stage)
  attribute vec3 aNormal; // surface normal (stars: x = drift and twinkle phase)
  attribute float aRand;  // random seed, 0..1
  attribute float aKind;  // PARTICLE_KIND

  // Per frame
  uniform vec2 uResolution;           // viewport size; the stage works in viewport coordinates, origin at its centre
  uniform float uCanvasHeight;        // the canvas is taller than the viewport (see Stage.astro)
  uniform float uViewportOffset;      // height of the viewport centre above the canvas centre
  uniform float uTime, uIntro, uScroll, uDpr;
  uniform float uBrightness;          // overall dimming (careers section, stage transitions)
  uniform float uScrollSpeed;         // eased scroll velocity, shakes the points
  uniform float uToSphere, uToField;  // scroll morph 0..1: logotype -> globe, globe -> wave field
  uniform vec2 uMouse;                // pointer in stage coordinates
  uniform float uMouseInfluence;      // 0..1, fades the pointer push in and out
  uniform float uMouseSpeed;          // 0..1, a fast pointer pushes further
  uniform vec2 uTilt;                 // ambient sway: yaw, pitch
  uniform vec3 uSun;                  // sun position on its orbit
  uniform vec2 uRingProgress;         // key animation progress of the "a" ring (x) and "b" ring (y)
  uniform float uRingSpin;            // spin of the docked rings
  uniform vec2 uOrbitAlpha;           // opacity of the sun orbit path (x) and the ring orbit paths (y)
  uniform vec2 uSphereCenter;
  uniform float uSphereRadius;
  uniform float uGlobeSpin;           // globe turn, shared with the market pins in globe-pins.ts

  // Layout, set on each build
  uniform float uCameraDistance;
  uniform float uPivot;               // height of the tilt axis (the logotype centre)
  uniform float uExtrusion;           // depth of the 3D letters
  uniform float uScale;               // logo units to pixels
  uniform vec3 uPlanet, uDotRest;     // centre of the "o" and the i-dot at rest
  uniform vec3 uEclipticU, uEclipticV; // unit axes of the sun's orbital plane
  uniform vec2 uBowlA, uBowlB;        // bowl centres of "a" and "b"
  uniform vec2 uRingRadius;           // docked radius of the "a" and "b" rings
  uniform vec3 uOrbitCenter[3], uOrbitU[3], uOrbitV[3]; // orbits: 0 sun, 1 ring "a", 2 ring "b"

  varying vec3 vColor;
  varying float vAlpha;

  vec3 rotateY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z); }
  vec3 rotateX(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(v.x, c*v.y - s*v.z, s*v.y + c*v.z); }
  vec3 rotateTilt(vec3 v){ return rotateX(rotateY(v, uTilt.x), uTilt.y); }
  vec3 tilt(vec3 v){ v.y -= uPivot; v = rotateTilt(v); v.y += uPivot; return v; }

  // Key animation: a bowl streams off its letter, arcs toward the viewer and docks round the planet as a ring on the
  // sun's orbital plane, so the sun lights it as it passes. Also sets ringBlend and ringAngle for the colouring.
  float ringBlend = 0., ringAngle = 0.;
  vec3 ringDock(vec2 bowl, float progress, float radius, float spin, float lane){
    vec2 fromBowl = aText.xy - bowl;
    float bowlRadius = length(fromBowl), angle = atan(fromBowl.y, fromBowl.x);
    // points leave in angle order, so the bowl peels off as one ribbon
    float k = clamp(progress*1.36 - fract(angle/6.28318 + lane)*.3 - aRand*.06, 0., 1.);
    k = k*k*(3. - 2.*k);
    float dockedAngle = angle + spin*k;
    float dockedRadius = radius + (bowlRadius - 8.45*uScale)*.28; // 8.45: mean bowl radius in logo units
    vec3 docked = uPlanet + (cos(dockedAngle)*uEclipticU + sin(dockedAngle)*uEclipticV)*dockedRadius
                + cross(uEclipticU, uEclipticV)*aText.z*.12;
    vec3 arcControl = (aText + docked)*.5 + vec3(0., 7.*uScale, 34.*uScale);
    ringBlend = k;
    ringAngle = dockedAngle;
    return mix(mix(aText, arcControl, k), mix(arcControl, docked, k), k); // quadratic Bezier
  }

  void main(){
    float t = uTime;

    float isPlanet = step(.5, aKind)*step(aKind, 1.5);
    float isSun = step(1.5, aKind)*step(aKind, 2.5);
    float isRingA = step(2.5, aKind)*step(aKind, 3.75);
    float isRingB = step(3.75, aKind)*step(aKind, 4.75);
    float isStar = step(4.75, aKind)*step(aKind, 5.5);
    float isOrbitPath = step(5.5, aKind);
    float isRingCopy = step(.25, fract(aKind)); // bowl point that stays on its letter and shows once the ring has left
    float isLogo = 1. - isPlanet - isSun - isStar - isOrbitPath; // letters and rings

    // Globe (second stage), slowly turning, seen from a little above the equator since most markets are northern
    vec3 globeNormal = rotateX(rotateY(aSphere, uGlobeSpin), .38);
    vec3 globePos = globeNormal*uSphereRadius;
    globePos.xy += uSphereCenter;

    // Logotype scene in local space (before tilt and scroll)
    vec3 local = aText + isSun*(uSun - uDotRest); // the i-dot IS the sun: it travels with it
    if (isRingA > .5) local = ringDock(uBowlA, uRingProgress.x, uRingRadius.x, uRingSpin, .5);
    else if (isRingB > .5) local = ringDock(uBowlB, uRingProgress.y, uRingRadius.y, -uRingSpin*.7, 0.);
    // stars drift slowly, each on its own phase, so the sky never freezes
    local += isStar*vec3(sin(t*.41 + aNormal.x*2.3)*7., sin(t*.53 + aNormal.x*1.3)*10., sin(t*.37 + aNormal.x)*14.);
    float onOrbit1 = step(.5, aText.y), onOrbit2 = step(1.5, aText.y);
    vec3 orbitCenter = mix(mix(uOrbitCenter[0], uOrbitCenter[1], onOrbit1), uOrbitCenter[2], onOrbit2);
    vec3 orbitU = mix(mix(uOrbitU[0], uOrbitU[1], onOrbit1), uOrbitU[2], onOrbit2);
    vec3 orbitV = mix(mix(uOrbitV[0], uOrbitV[1], onOrbit1), uOrbitV[2], onOrbit2);
    local = mix(local, orbitCenter + cos(aText.x)*orbitU + sin(aText.x)*orbitV, isOrbitPath);

    // Intro: a focus pull. Each point starts a little in front of its place, slightly scattered and faint, and settles
    // back into it. The settling sweeps across the logotype from left to right, with a little jitter so it is not a line.
    float acrossLogo = clamp(local.x/uResolution.x + .5, 0., 1.); // 0 at the left edge, 1 at the right
    float introStart = acrossLogo*.35 + aRand*.15;
    float introT = clamp((uIntro - introStart)/INTRO_SETTLE, 0., 1.);
    float introEase = 1. - pow(1. - introT, 3.);
    float introFade = smoothstep(0., .6, introT);
    vec3 introOffset = vec3(
      (fract(aRand*3.17) - .5)*60. - 30.,
      (fract(aRand*5.71) - .5)*60.,
      150. + 350.*fract(aRand*13.7)
    );
    vec3 logoPos = tilt(local + introOffset*(1. - introEase));
    logoPos.y += uScroll;

    // The pointer pushes logo points out of a small circle round it (a bit further while it moves fast)
    vec2 fromMouse = logoPos.xy - uMouse;
    float pushRadius = clamp(8.*uScale, 48., 96.);
    float mouseDistance = length(fromMouse);
    float push = exp(-mouseDistance*mouseDistance/(pushRadius*pushRadius))*uMouseInfluence*isLogo;
    logoPos.xy += normalize(fromMouse + .0001)*push*pushRadius*(.55 + .35*uMouseSpeed);

    // Wave field (third stage)
    vec3 fieldPos = aField;
    float wave = sin(fieldPos.x*.0055 + t*.6)*30. + sin(fieldPos.z*.009 - t*.8)*24.
               + sin((fieldPos.x + fieldPos.z)*.0035 + t*.35)*36.;
    fieldPos.y += wave;

    // Blend the stages; points scatter between stages and shake with scroll speed
    float wLogo = 1. - uToSphere, wGlobe = uToSphere*(1. - uToField), wField = uToField;
    vec3 p = logoPos*wLogo + globePos*wGlobe + fieldPos*wField;
    float scatter = sin(3.14159*uToSphere)*(1. - uToField) + sin(3.14159*uToField);
    p += vec3(sin(aRand*41. + t*.8), cos(aRand*29. + t*1.1), sin(aRand*17. + t))*scatter*160.*aRand;
    p.xy += vec2(sin(aRand*93. + t*4.), cos(aRand*71. + t*4.))*uScrollSpeed*18.*aRand;

    float focal = uCameraDistance*wLogo + GLOBE_FOCAL*wGlobe + 900.*wField;
    float persp = focal/max(focal - p.z, 60.);
    vec2 projected = p.xy*persp;
    gl_Position = vec4(
      projected.x/(uResolution.x*.5),
      (projected.y + uViewportOffset)/(uCanvasHeight*.5),
      clamp(-p.z/4000., -1., 1.),
      1.
    );
    float sea = wGlobe*(1. - aLand), land = wGlobe*aLand;
    float pointSize = min((1.25 + aRand*1.25 + (isSun + isStar)*.6 - isOrbitPath*.55 - sea*.5 + land*.4)*uDpr*persp, 7.*uDpr);

    vec3 navy = vec3(.04, .13, .32), cool = vec3(.80, .87, 1.), day = vec3(.95, .965, .985), gold = vec3(.996, .765, .129);

    // Letters and rings: white on navy like the logotype, warming next to the sun, darker toward the back
    vec3 toSun = normalize(uSun + vec3(0., 0., 240.) - local);
    float sunFalloff = 1./(1. + pow(length(uSun.xy - local.xy)/(uResolution.x*.32), 2.));
    float letterLight = .42 + max(dot(aNormal, toSun), 0.)*(.4 + 1.3*sunFalloff);
    vec3 letterColor = mix(navy*1.3, day, smoothstep(0., .7, letterLight));
    letterColor = mix(letterColor, gold, smoothstep(1.1, 1.6, letterLight)*.3);
    letterColor *= mix(.5, 1., smoothstep(-uExtrusion*.5, uExtrusion*.5, aText.z));
    letterColor *= mix(1., .72 + .28*sin(ringAngle*3.), ringBlend); // banding on docked rings so their spin reads

    // The "o" is a planet lit by the sun: half lit at rest (the logo), full when the sun is in front, new when behind
    float planetLit = smoothstep(-.05, .05, dot(aNormal, normalize(uSun - uPlanet)));
    float facesViewer = smoothstep(-.02, .12, dot(rotateTilt(aNormal), normalize(vec3(-logoPos.xy, focal - logoPos.z))));
    vec3 planetColor = mix(navy*.8, gold, planetLit);

    vec3 logoColor = letterColor*isLogo + planetColor*isPlanet + gold*1.1*isSun + gold*isStar + cool*.9*isOrbitPath;
    logoColor += gold*push*.2;
    float twinkle = .8 + .2*sin(t*1.7 + aNormal.x*6.);
    float logoAlpha = isLogo*mix(1., smoothstep(0., .15, ringBlend), isRingCopy*(isRingA + isRingB))
                    + isPlanet*mix(.1, 1., planetLit)*facesViewer
                    + isSun
                    + isStar*twinkle
                    + isOrbitPath*mix(uOrbitAlpha.x, uOrbitAlpha.y, onOrbit1);
    logoAlpha *= introFade;

    // Globe: land bright and sea faint, lit from the upper left, back half dimmed, gold rim, city lights in gold on
    // the night side. Night land stays a soft grey, so the continents there still read as land and not as sea.
    vec3 globeLightDir = normalize(vec3(-.56, .83, .45));
    float globeLit = smoothstep(-.03, .14, dot(globeNormal, globeLightDir));
    float front = step(0., globeNormal.z);
    vec3 globeColor = mix(mix(navy*.9, cool*.45, aLand), cool, globeLit)*mix(.3, 1., front);
    globeColor = mix(globeColor, gold, pow(1. - abs(globeNormal.z), 2.5)*globeLit*front);
    globeColor *= mix(.22, 1., aLand);
    if (globeLit < .1 && aLand > .5 && aRand > .9 && front > 0.) globeColor = gold*.85;

    // Field: lighter crests and a gold scan line sweeping toward the viewer
    float crest = smoothstep(-20., 70., wave);
    float scan = smoothstep(.985, 1., sin(fieldPos.z*.0045 - t*1.6));
    vec3 fieldColor = mix(navy, cool*.75, crest*.8);
    fieldColor = mix(fieldColor, gold, scan*.9 + smoothstep(55., 90., wave)*.35);

    vColor = (logoColor*wLogo + globeColor*wGlobe + fieldColor*wField)*uBrightness;
    vAlpha = mix(1., smoothstep(.2, .75, persp), wField)*mix(1., logoAlpha, wLogo);
    gl_PointSize = vAlpha < .01 ? 0. : pointSize;
  }`

// Round, soft-edged points with premultiplied alpha
export const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  varying vec3 vColor;
  varying float vAlpha;

  void main(){
    vec2 fromCenter = gl_PointCoord - .5;
    float distanceSq = dot(fromCenter, fromCenter);
    if (distanceSq > .25) discard;
    float alpha = smoothstep(.25, .02, distanceSq)*vAlpha;
    gl_FragColor = vec4(vColor*alpha, alpha);
  }`
