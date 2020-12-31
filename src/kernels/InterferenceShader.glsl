precision mediump float;

varying vec2 vUV;
uniform sampler2D u_thickness;

void main() {
	float thickness = texture2D(u_thickness, vUV).x;
	float value = fmod(thickness, 0.1);
	gl_FragColor = vec4(value, value, value, 1);
}