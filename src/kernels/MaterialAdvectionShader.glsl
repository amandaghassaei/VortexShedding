precision mediump float;
precision mediump int;

varying vec2 vUV;
uniform float u_dt;
uniform float u_advectionFactor;
uniform sampler2D u_state;
uniform sampler2D u_velocity;

// This is needed for safari support.
vec2 getWrappedUV(vec2 uv) {
	if (uv.x < 0.0) {
		uv.x = 0.0;
	}
	if (uv.y < 0.0) {
		uv.y += 1.0;
	} else if (uv.y > 1.0) {
		uv.y -= 1.0;
	}
	return uv;
}

void main() {
	// Implicitly solve advection.
	vec2 displacement = u_dt * texture2D(u_velocity, vUV).xy;
	vec2 prevUV1 = getWrappedUV(vUV - (1.0 - u_advectionFactor) * displacement);
	vec2 prevUV2 = getWrappedUV(vUV - displacement);
	vec2 prevUV3 = getWrappedUV(vUV - (1.0 + u_advectionFactor) * displacement);
	gl_FragColor = vec4(texture2D(u_state, prevUV1).x, texture2D(u_state, prevUV2).y, texture2D(u_state, prevUV3).z, 0.0);
}