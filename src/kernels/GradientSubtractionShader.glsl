precision mediump float;
precision mediump int;

varying vec2 vUV;

uniform vec2 u_pxSize;
uniform sampler2D u_scalarField;
uniform sampler2D u_vectorField;

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
	float n = texture2D(u_scalarField, getWrappedUV(vUV + vec2(0, u_pxSize.y))).r;
	float s = texture2D(u_scalarField, getWrappedUV(vUV - vec2(0, u_pxSize.y))).r;
	float e = texture2D(u_scalarField, getWrappedUV(vUV + vec2(u_pxSize.x, 0))).r;
	float w = texture2D(u_scalarField, getWrappedUV(vUV - vec2(u_pxSize.x, 0))).r;

	vec2 v = texture2D(u_vectorField, vUV).xy;
	v -= 0.5 * vec2(e - w, n - s);
	
	gl_FragColor = vec4(v, 0, 0);
}