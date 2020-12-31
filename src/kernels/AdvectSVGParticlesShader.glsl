precision mediump float;
precision mediump int;

varying vec2 vUV;
uniform float u_dt;
uniform vec2 u_pxSize;
uniform sampler2D u_positions;
uniform sampler2D u_velocity;

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
	vec2 position = texture2D(u_positions, vUV).xy;
	vec2 canvasSize = 1.0 / u_pxSize;

	// Forward integrate via RK2.
	vec2 particleUV1 = getWrappedUV(position * u_pxSize);
	vec2 velocity1 = texture2D(u_velocity, particleUV1).xy;
	vec2 halfStep = position + velocity1 * 0.5 * u_dt * canvasSize;
	vec2 particleUV2 = getWrappedUV(halfStep * u_pxSize);
	vec2 velocity2 = texture2D(u_velocity, particleUV2).xy;
	vec2 nextPosition = position + velocity2 * u_dt * canvasSize;

	// Check if position is outside bounds.
	if (nextPosition.x < 0.0) {
		nextPosition.x += canvasSize.x;
	} else if (nextPosition.x > canvasSize.x) {
		nextPosition.x -= canvasSize.x;
	}
	if (nextPosition.y < 0.0) {
		nextPosition.y += canvasSize.y;
	} else if (nextPosition.y > canvasSize.y) {
		nextPosition.y -= canvasSize.y;
	}

	gl_FragColor = vec4(nextPosition, 0, 0);
}