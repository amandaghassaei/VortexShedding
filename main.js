//used a lot of ideas from https://bl.ocks.org/robinhouston/ed597847175cf692ecce to clean this code up

var width, height;
var actualWidth, actualHeight;
var body;
var scale = 3.5;

var obstaclePosition = [0,0];
var obstacleRad = 20;

var lastMouseCoordinates =  [0,0];
var mouseCoordinates =  [0,0];
var mouseEnable = false;

var paused = false;//while window is resizing

var dt = 1;
var dx = 1;
var nu = 1;//viscosity
var rho = 1;//density

var GPU;

window.onload = initGL;

function initGL() {

    $("#about").click(function(e){
        e.preventDefault();
        $("#aboutModal").modal('show');
    });

    canvas = document.getElementById("glcanvas");
    body = document.getElementsByTagName("body")[0];

    canvas.onmousemove = onMouseMove;
    canvas.ontouchmove = onTouchMove;
    canvas.onmousedown = onMouseDown;
    canvas.ontouchstart = onMouseDown;
    canvas.onmouseup = onMouseUp;
    canvas.ontouchend = onMouseUp;
    canvas.onmouseout = onMouseUp;
    canvas.ontouchcancel = onMouseUp;

    window.onresize = onResize;

    GPU = initGPUMath();

    // setup a GLSL programs
    GPU.createProgram("advectVel", "2d-vertex-shader", "advectShaderVel");
    GPU.setUniformForProgram("advectVel", "u_dt", dt, "1f");
    GPU.setUniformForProgram("advectVel", "u_velocity", 0, "1i");
    GPU.setUniformForProgram("advectVel", "u_material", 1, "1i");

    GPU.createProgram("advectMat", "2d-vertex-shader", "advectShaderMat");
    GPU.setUniformForProgram("advectMat", "u_dt", dt, "1f");
    GPU.setUniformForProgram("advectMat", "u_velocity", 0, "1i");
    GPU.setUniformForProgram("advectMat", "u_material", 1, "1i");

    GPU.createProgram("gradientSubtraction", "2d-vertex-shader", "gradientSubtractionShader");
    GPU.setUniformForProgram("gradientSubtraction", "u_const", 0.5/dx, "1f");//dt/(2*rho*dx)
    GPU.setUniformForProgram("gradientSubtraction", "u_velocity", 0, "1i");
    GPU.setUniformForProgram("gradientSubtraction", "u_pressure", 1, "1i");

    GPU.createProgram("diverge", "2d-vertex-shader", "divergenceShader");
    GPU.setUniformForProgram("diverge", "u_const", 0.5/dx, "1f");//-2*dx*rho/dt
    GPU.setUniformForProgram("diverge", "u_velocity", 0, "1i");

    GPU.createProgram("force", "2d-vertex-shader", "forceShader");
    GPU.setUniformForProgram("force", "u_dt", dt, "1f");
    GPU.setUniformForProgram("force", "u_velocity", 0, "1i");

    GPU.createProgram("jacobi", "2d-vertex-shader", "jacobiShader");
    GPU.setUniformForProgram("jacobi", "u_b", 0, "1i");
    GPU.setUniformForProgram("jacobi", "u_x", 1, "1i");

    GPU.createProgram("render", "2d-vertex-shader", "2d-render-shader");
    GPU.setUniformForProgram("render", "u_material", 0, "1i");
    GPU.setUniformForProgram("render", "u_obstacle", 1, "1i");

    GPU.createProgram("boundary", "2d-vertex-shader", "boundaryConditionsShader");
    GPU.setUniformForProgram("boundary", "u_texture", 0, "1i");

    resetWindow();

    render();
}

function render(){

    if (!paused) {

        // //advect velocity
        GPU.setSize(width, height);
        GPU.step("advectVel", ["velocity", "velocity"], "nextVelocity");
        GPU.setProgram("boundary");
        GPU.setUniformForProgram("boundary", "u_scale", -1, "1f");
        GPU.step("boundary", ["nextVelocity"], "velocity");

        // diffuse velocity
        // GPU.setProgram("jacobi");
        // var alpha = dx*dx/(nu*dt);
        // GPU.setUniformForProgram("jacobi", "u_alpha", alpha, "1f");
        // GPU.setUniformForProgram("jacobi", "u_reciprocalBeta", 1/(4+alpha), "1f");
        // for (var i=0;i<1;i++){
        //     GPU.step("jacobi", ["velocity", "velocity"], "nextVelocity");
        //     GPU.step("jacobi", ["nextVelocity", "nextVelocity"], "velocity");
        // }

        //apply force
        GPU.setProgram("force");
        if (mouseEnable){
            GPU.setUniformForProgram("force", "u_mouseEnable", 1.0, "1f");
            GPU.setUniformForProgram("force", "u_mouseCoord", [mouseCoordinates[0]*width/actualWidth, mouseCoordinates[1]*height/actualHeight], "2f");
            GPU.setUniformForProgram("force", "u_mouseDir", [2*(mouseCoordinates[0]-lastMouseCoordinates[0])/scale,
                2*(mouseCoordinates[1]-lastMouseCoordinates[1])/scale], "2f");
        } else {
            GPU.setUniformForProgram("force", "u_mouseEnable", 0.0, "1f");
        }
        GPU.step("force", ["velocity"], "nextVelocity");
        GPU.setProgram("boundary");
        GPU.setUniformForProgram("boundary", "u_scale", -1, "1f");
        GPU.step("boundary", ["nextVelocity"], "velocity");

        // compute pressure
        GPU.step("diverge", ["velocity"], "velocityDivergence");//calc velocity divergence
        GPU.setProgram("jacobi");
        GPU.setUniformForProgram("jacobi", "u_alpha", -dx*dx, "1f");
        GPU.setUniformForProgram("jacobi", "u_reciprocalBeta", 1/4, "1f");
        for (var i=0;i<20;i++){
            GPU.step("jacobi", ["velocityDivergence", "pressure"], "nextPressure");//diffuse velocity
            GPU.step("jacobi", ["velocityDivergence", "nextPressure"], "pressure");//diffuse velocity
        }
        GPU.setProgram("boundary");
        GPU.setUniformForProgram("boundary", "u_scale", 1, "1f");
        GPU.step("boundary", ["pressure"], "nextPressure");
        GPU.swapTextures("nextPressure", "pressure");

        // subtract pressure gradient
        GPU.step("gradientSubtraction", ["velocity", "pressure"], "nextVelocity");
        GPU.setProgram("boundary");
        GPU.setUniformForProgram("boundary", "u_scale", -1, "1f");
        GPU.step("boundary", ["nextVelocity"], "velocity");

        // move material
        GPU.setSize(actualWidth, actualHeight);
        GPU.step("advectMat", ["velocity", "material"], "nextMaterial");
        GPU.step("render", ["nextMaterial", "obstacle"]);
        GPU.swapTextures("nextMaterial", "material");

    } else resetWindow();

    window.requestAnimationFrame(render);
}

function onResize(){
    paused = true;
}

function resetWindow(){

    actualWidth = body.clientWidth;
    actualHeight = body.clientHeight;

    var maxDim = Math.max(actualHeight, actualWidth);
    var scale = maxDim/200;

    width = Math.floor(actualWidth/scale);
    height = Math.floor(actualHeight/scale);

    obstaclePosition = [actualWidth/10, actualHeight/2];

    canvas.width = actualWidth;
    canvas.height = actualHeight;
    canvas.clientWidth = body.clientWidth;
    canvas.clientHeight = body.clientHeight;

    // GPU.setSize(width, height);

    GPU.setProgram("advectVel");
    GPU.setUniformForProgram("advectVel" ,"u_textureSize", [width, height], "2f");
    GPU.setUniformForProgram("advectVel" ,"u_scale", 1, "1f");
    GPU.setProgram("advectMat");
    GPU.setUniformForProgram("advectMat" ,"u_textureSize", [actualWidth, actualHeight], "2f");
    GPU.setUniformForProgram("advectMat" ,"u_scale", width/actualWidth, "1f");
    GPU.setProgram("gradientSubtraction");
    GPU.setUniformForProgram("gradientSubtraction" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("diverge");
    GPU.setUniformForProgram("diverge" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("force");
    GPU.setUniformForProgram("force", "u_reciprocalRadius", 0.1*scale, "1f");
    GPU.setUniformForProgram("force" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("jacobi");
    GPU.setUniformForProgram("jacobi" ,"u_textureSize", [width, height], "2f");
    GPU.setProgram("render");
    GPU.setUniformForProgram("render" ,"u_textureSize", [actualWidth, actualHeight], "2f");
    GPU.setProgram("boundary");
    GPU.setUniformForProgram("boundary" ,"u_textureSize", [width, height], "2f");
    GPU.setUniformForProgram("boundary" ,"u_obstaclePosition", [obstaclePosition[0]*width/actualWidth, obstaclePosition[1]*height/actualHeight], "2f");
    GPU.setUniformForProgram("boundary" ,"u_obstacleRad", obstacleRad*width/actualWidth, "1f");

    var velocity = new Float32Array(width*height*4);
    for (var i=0;i<height;i++){
        for (var j=0;j<width;j++){
            var index = 4*(i*width+j);
            velocity[index] = 1;
        }
    }
    GPU.initTextureFromData("velocity", width, height, "FLOAT", velocity, true);
    GPU.initFrameBufferForTexture("velocity", true);
    GPU.initTextureFromData("nextVelocity", width, height, "FLOAT", velocity, true);
    GPU.initFrameBufferForTexture("nextVelocity", true);

    GPU.initTextureFromData("velocityDivergence", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("velocityDivergence", true);
    GPU.initTextureFromData("pressure", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("pressure", true);
    GPU.initTextureFromData("nextPressure", width, height, "FLOAT", new Float32Array(width*height*4), true);
    GPU.initFrameBufferForTexture("nextPressure", true);

    var numCols = Math.floor(actualHeight/10);
    if (numCols%2 == 1) numCols--;
    var numPx = actualHeight/numCols;

    console.log(numCols);
    var material = new Float32Array(actualWidth*actualHeight*4);
    for (var i=0;i<actualHeight;i++){
        for (var j=0;j<actualWidth;j++){
            var index = 4*(i*actualWidth+j);
            if (j==0 && Math.floor((i-2)/numPx)%2==0) material[index] = 1.0;
        }
    }
    GPU.initTextureFromData("material", actualWidth, actualHeight, "FLOAT", material, true);
    GPU.initFrameBufferForTexture("material", true);
    GPU.initTextureFromData("nextMaterial", actualWidth, actualHeight, "FLOAT", material, true);
    GPU.initFrameBufferForTexture("nextMaterial", true);

    var obstacle = new Float32Array(actualWidth*actualHeight*4);
    for (var i=0;i<actualHeight;i++){
        for (var j=0;j<actualWidth;j++){
            var index = 4*(i*actualWidth+j);
            var vec = [obstaclePosition[0]-j, obstaclePosition[1]-i];
            if (vec[0]*vec[0]+vec[1]*vec[1] < obstacleRad*obstacleRad){
                obstacle[index] = 1;
            }
        }
    }
    GPU.initTextureFromData("obstacle", actualWidth, actualHeight, "FLOAT", obstacle, true);

    paused = false;
}

function onMouseMove(e){
    lastMouseCoordinates = mouseCoordinates;
    mouseCoordinates = [e.clientX, actualHeight-e.clientY];
}
function onTouchMove(e){
    e.preventDefault();
    var touch = e.touches[0];
    lastMouseCoordinates = mouseCoordinates;
    mouseCoordinates = [touch.pageX, actualHeight-touch.pageY];
}

function onMouseDown(){
    mouseEnable = true;
}

function onMouseUp(){
    mouseEnable = false;
}