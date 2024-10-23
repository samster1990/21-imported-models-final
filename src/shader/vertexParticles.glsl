// vertexParticles.glsl
uniform float time;
varying vec3 vPosition;

void main() {
    // Trefoil knot equation for particle positions
    float scale = 3.0; // Size of the trefoil
    float t = position.x * 2.0 * 3.14159; // Circular parametric equation

    // Trefoil knot coordinates
    vec3 trefoilPos = vec3(
        sin(t) + 2.0 * sin(2.0 * t),
        cos(t) - 2.0 * cos(2.0 * t),
        -sin(3.0 * t)
    ) * scale;

    vPosition = trefoilPos; // Assign trefoil position to fragment shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(trefoilPos, 1.0);
}