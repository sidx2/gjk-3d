export const vertexShaderSource = 
`#version 300 es
precision mediump float;

in vec3 position;
in vec3 normal;

out vec3 vNormal;
out vec3 oColour;

uniform mat4 uMat;
uniform mat4 uPersp;
uniform mat3 uNormalMatrix;
uniform vec3 uColour;

void main() {
    gl_Position = uPersp * uMat * vec4(position, 1);
    vNormal = normalize(uNormalMatrix * normal);
    oColour = uColour;
}

`;

export const fragmentShaderSource = 
`#version 300 es
precision mediump float;

out vec4 outColor;

in vec3 vNormal;
in vec3 oColour;

void main() {
    float d = dot(normalize(vNormal), normalize(vec3(0,0,-1)));
    float t = clamp(d/-1.0, 0.0, 1.0);

    float start = 0.5;
    float end = 1.0;
    float intensity = mix(0.5, 1.0, t);
    outColor = vec4(oColour * intensity, 1.0);
}

`