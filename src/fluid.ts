import { canvas, glcompute } from './gl';
import { DT, JET_HEIGHT_PX, PRESSURE_CALC_ALPHA, PRESSURE_CALC_BETA } from './constants';
const materialAdvectionSource = require('./kernels/MaterialAdvectionShader.glsl');
const advectionSource = require('./kernels/AdvectionShader.glsl');
const divergence2DSource = require('./kernels/Divergence2DShader.glsl');
const jacobiSource = require('./kernels/JacobiShader.glsl');
const gradientSubtractionSource = require('./kernels/GradientSubtractionShader.glsl');
const colorRenderSource = require('./kernels/ColorShader.glsl');
const boundaryMaterialSource = require('./kernels/BoundaryMaterialShader.glsl');
const initVelocitySource = require('./kernels/InitVelocityShader.glsl');

let SCALE_FACTOR = calcScaleFactor(canvas.clientWidth, canvas.clientHeight);

function calcScaleFactor(width: number, height: number) {
	return 2;
}

let advectionFactor = 0;// This is a noisy value that will change how material advection is scaled for diff color channels.

// Init programs.
const materialAdvection = glcompute.initProgram('materialAdvection', materialAdvectionSource, [
	{
		name: 'u_dt',
		value: DT,
		dataType: 'FLOAT',
	},
	{
		name: 'u_advectionFactor',
		value: advectionFactor,
		dataType: 'FLOAT',
	},
	{
		name: 'u_state',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_velocity',
		value: 1,
		dataType: 'INT',
	},
]);
const advection = glcompute.initProgram('advection', advectionSource, [
	{
		name: 'u_dt',
		value: DT,
		dataType: 'FLOAT',
	},
	{
		name: 'u_state',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_velocity',
		value: 1,
		dataType: 'INT',
	},
]);

const divergence2D = glcompute.initProgram('divergence2D', divergence2DSource, [
	{
		name: 'u_vectorField',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_pxSize',
		value: [SCALE_FACTOR / canvas.clientWidth, SCALE_FACTOR / canvas.clientHeight],
		dataType: 'FLOAT',
	}
]);
const jacobi = glcompute.initProgram('jacobi', jacobiSource, [
	{
		name: 'u_alpha',
		value: PRESSURE_CALC_ALPHA,
		dataType: 'FLOAT',
	},
	{
		name: 'u_beta',
		value: PRESSURE_CALC_BETA,
		dataType: 'FLOAT',
	},
	{
		name: 'u_pxSize',
		value: [SCALE_FACTOR / canvas.clientWidth, SCALE_FACTOR / canvas.clientHeight],
		dataType: 'FLOAT',
	},
	{
		name: 'u_previousState',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_divergence',
		value: 1,
		dataType: 'INT',
	},
]);
const gradientSubtraction = glcompute.initProgram('gradientSubtraction', gradientSubtractionSource, [
	{
		name: 'u_pxSize',
		value: [SCALE_FACTOR / canvas.clientWidth, SCALE_FACTOR / canvas.clientHeight],
		dataType: 'FLOAT',
	},
	{
		name: 'u_scalarField',
		value: 0,
		dataType: 'INT',
	},
	{
		name: 'u_vectorField',
		value: 1,
		dataType: 'INT',
	},
]);

const colorRender = glcompute.initProgram('colorRender', colorRenderSource, [
	{
		name: 'u_material',
		value: 0,
		dataType: 'INT',
	},
]);

const boundaryMaterial = glcompute.initProgram('boundaryMaterial', boundaryMaterialSource, [
	{
		name: 'u_jetHeightPx',
		value: JET_HEIGHT_PX,
		dataType: 'FLOAT',
	}
]);
// const boundaryVelocity = glcompute.initProgram('boundaryMaterial', boundaryMaterialSource, []);
const initVelocity = glcompute.initProgram('initVelocity', initVelocitySource);

// Init state.
const width = canvas.clientWidth;
const height = canvas.clientHeight;
export const velocityState = glcompute.initDataLayer('velocity',
{
	dimensions: [Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)],
	type: 'float16',
	numComponents: 2,
	wrapS: 'CLAMP_TO_EDGE',
	wrapT: 'REPEAT',
}, true, 2);
const divergenceState = glcompute.initDataLayer('divergence',
{
	dimensions: [Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)],
	type: 'float16',
	numComponents: 1,
	wrapS: 'CLAMP_TO_EDGE',
	wrapT: 'REPEAT',
}, true, 1);
const pressureState = glcompute.initDataLayer('pressure',
{
	dimensions: [Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)],
	type: 'float16',
	numComponents: 1,
	wrapS: 'CLAMP_TO_EDGE',
	wrapT: 'REPEAT',
}, true, 2);
const materialState = glcompute.initDataLayer('material',
{
	dimensions: [width, height],
	type: 'float16',
	numComponents: 3,
	wrapS: 'CLAMP_TO_EDGE',
	wrapT: 'REPEAT',
}, true, 2);


export function fluidOnResize(width: number, height: number) {
	// Re-init textures at new size.
	SCALE_FACTOR = calcScaleFactor(width, height);
	velocityState.resize([Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)]);
	divergenceState.resize([Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)]);
	pressureState.resize([Math.ceil(width / SCALE_FACTOR), Math.ceil(height / SCALE_FACTOR)]);
	materialState.resize([width, height]);
	divergence2D.setUniform('u_pxSize', [SCALE_FACTOR / width, SCALE_FACTOR  / height], 'FLOAT');
	jacobi.setUniform('u_pxSize', [SCALE_FACTOR / width, SCALE_FACTOR / height], 'FLOAT');
	gradientSubtraction.setUniform('u_pxSize', [SCALE_FACTOR / width, SCALE_FACTOR / height], 'FLOAT');
	glcompute.onResize(canvas);
	glcompute.step(boundaryMaterial, [], materialState);
	glcompute.step(initVelocity, [], velocityState);
}

export function stepFluid() {
	// Apply velocity boundary conditions.
	glcompute.stepBoundary(initVelocity, [], velocityState, { singleEdge: 'LEFT' });
	// Advect the velocity vector field.
	glcompute.step(advection, [velocityState, velocityState], velocityState);
	// Compute divergence of advected velocity field.
	glcompute.step(divergence2D, [velocityState], divergenceState);
	// Compute the pressure gradient of the advected velocity vector field (using jacobi iterations).
	for (let i = 0; i < 20; i++) {
		glcompute.step(jacobi, [pressureState, divergenceState], pressureState);
	}
	// Subtract the pressure gradient from velocity to obtain a velocity vector field with zero divergence.
	glcompute.step(gradientSubtraction, [pressureState, velocityState], velocityState);

	// Update material boundary conditions.
	glcompute.stepBoundary(boundaryMaterial, [], materialState, { singleEdge: 'LEFT' });
	// Advect material.
	// Update random advection factor function, biased toward zero.
	advectionFactor += Math.sign(Math.random() - 0.5 - advectionFactor) * 0.003;
	materialAdvection.setUniform('u_advectionFactor', advectionFactor, 'FLOAT');
	glcompute.step(materialAdvection, [materialState, velocityState], materialState);
	// Render.
	glcompute.step(colorRender, [materialState]);
}