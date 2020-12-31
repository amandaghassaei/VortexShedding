precision mediump float;

uniform float u_jetHeightPx;

void main() {
	if (floor(mod(gl_FragCoord.y/u_jetHeightPx, 2.0)) == 0.0) gl_FragColor = vec4(1, 1, 1, 0);
	else gl_FragColor = vec4(0, 0, 0, 0);
}