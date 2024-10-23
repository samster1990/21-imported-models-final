uniform sampler2D tDiffuse;    // The scene's rendered texture
uniform vec3 lightPosition;    // Light source position
uniform float density;         // Density of the rays
uniform float decay;           // How quickly the rays decay
uniform float weight;          // Intensity of the rays
uniform float exposure;        // Exposure level of the rays

varying vec2 vUv;              // Texture coordinates passed from the vertex shader

void main() {
    vec2 texCoord = vUv;  // Current texture coordinates
    vec2 delta = texCoord - lightPosition.xy;  // Distance from light source to fragment
    delta *= 1.0 / 100.0;  // Scale factor for the radial blur

    vec3 color = vec3(0.0);  // Initialize the final color
    float illuminationDecay = 1.0;  // Decay factor for light intensity

    // Radial blur loop
    for (int i = 0; i < 100; i++) {
        texCoord -= delta;  // Move towards the light source
        vec4 texSample = texture2D(tDiffuse, texCoord);  // Sample the scene
        texSample *= illuminationDecay * weight;  // Multiply by weight and decay
        color += texSample.rgb;  // Add the sampled color to the final color
        illuminationDecay *= decay;  // Decay the illumination over distance
    }

    gl_FragColor = vec4(color * exposure, 1.0);  // Final color with exposure adjustment
}

