precision mediump float;
precision mediump int;

varying vec2 vUV;

uniform float u_alpha;
uniform float u_beta;
uniform vec2 u_pxSize;
uniform sampler2D u_previousState;
uniform sampler2D u_divergence;

// This is needed for safari support.
vec2 getWrappedUV(vec2 uv) {
	if (uv.y < 0.0) {
		uv.y += 1.0;
	} else if (uv.y > 1.0) {
		uv.y -= 1.0;
	}
	return uv;
}

void main() {
	vec4 n = texture2D(u_previousState, getWrappedUV(vUV + vec2(0, u_pxSize.y)));
	vec4 s = texture2D(u_previousState, getWrappedUV(vUV - vec2(0, u_pxSize.y)));
	vec4 e = texture2D(u_previousState, getWrappedUV(vUV + vec2(u_pxSize.x, 0)));
	vec4 w = texture2D(u_previousState, getWrappedUV(vUV - vec2(u_pxSize.x, 0)));
	vec4 d = texture2D(u_divergence, vUV);

	gl_FragColor = (n + s + e + w + u_alpha * d) * u_beta;
}