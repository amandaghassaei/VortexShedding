precision mediump float;

varying vec2 vUV;
uniform sampler2D u_material;

vec3 applyFilter(vec3 rgb) {
	float red = rgb.r;
	float green = rgb.g;
	float blue = rgb.b;

	green = (green * 0.855 + 0.145) * 0.855;
	blue = (blue * 0.486 + 0.514) * 0.678;

	vec3 filtered = vec3(red, green, blue);
	filtered = filtered * 1.125 + 0.118;

	return filtered;
}

void main() {
	vec3 material = clamp(texture2D(u_material, vUV).xyz, 0.0, 1.0);
	gl_FragColor = vec4(applyFilter(material), 1);
}