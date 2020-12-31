precision mediump float;
precision mediump int;

varying vec2 vUV;

uniform float u_dt;
uniform sampler2D u_thickness;
uniform sampler2D u_pressure;

void main() {
	vec2 thickness = texture2D(u_thickness, vUV).xy; // x comp is thickness, y comp is deriv.
	float pressure = texture2D(u_pressure, vUV).x;
	float thicknessDeriv = thickness.y + pressure * 0.01;
	float nextThickness = thickness.x + thicknessDeriv * u_dt;
	if (nextThickness < 0.00001) nextThickness = 0.0001;
	gl_FragColor = vec4(nextThickness, thicknessDeriv, 0, 0);
}