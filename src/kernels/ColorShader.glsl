precision mediump float;

varying vec2 vUV;
uniform sampler2D u_material;

void main() {
	vec3 material = clamp(texture2D(u_material, vUV).xyz, 0.0, 1.0);
	gl_FragColor = vec4(material, 1);
}