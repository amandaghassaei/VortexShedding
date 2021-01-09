import { 
	fluidOnResize,
	stepFluid,
} from './fluid';
import './interactions';
import MicroModal from 'micromodal';
import { stepInteraction } from './interactions';
import { canvas } from './gl';

// Init help modal.
MicroModal.init();

// Add resize listener.
onResize();
window.addEventListener('resize', onResize);
function onResize() {
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	fluidOnResize(width, height);
}

// Start render loop.
window.requestAnimationFrame(step);
function step() {
	// Start a new render cycle.
	window.requestAnimationFrame(step);

	// Apply interactions.
	stepInteraction();

	// Step simulation.
	stepFluid();
}