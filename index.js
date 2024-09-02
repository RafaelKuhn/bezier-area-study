
//  ########################################################################
//  ################################ HTML ##################################
//  ########################################################################
/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvao");

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");
const canvasRect = canvas.getBoundingClientRect();

canvas.height = document.body.clientHeight - 16;
canvas.width  = canvas.height;

const spanN = document.getElementById("n");
const spanH = document.getElementById("h");
const spanArea = document.getElementById("area");
const nSlider = document.getElementById("nSlider");
const samplesDiv = document.getElementById("samplesDiv");
const samplesContainer = document.getElementById("samples");

const nMax = nSlider.max;
const nStart = nSlider.value;

const snapTog = document.getElementById("snap-tog");

const fillAreaTog = document.getElementById("area-tog");
let shouldFillArea = fillAreaTog.checked;

/** @type {HTMLInputElement} */
const snapAmntInput = document.getElementById("total-amt");

/** @returns {Number} */
const getSnapValue = () => {

	let snapAmount = parseFloat(snapAmntInput.value);
	if (isNaN(snapAmount)) {
		snapAmntInput.value = snapAmntInput.min;
		snapAmount = parseFloat(snapAmntInput.min);
		// console.log(`nan found, min: ${snapAmntInput.min}, ${typeof(snapAmntInput.min)}`);
	}

	if (snapAmount > parseFloat(snapAmntInput.max)) {
		snapAmntInput.value = snapAmntInput.max;
		snapAmount = parseFloat(snapAmntInput.max);
	}

	if (snapAmount < 0.1) {
		snapAmntInput.value = 0.1;
		snapAmount = parseFloat(snapAmntInput.min);
	}

	return parseFloat(snapAmntInput.value)
}

let shouldSnap = snapTog.checked;
let snapThreshold = getSnapValue();

const snapAllPoints = () => {
	snapPoint(start)
	snapPoint(cp1)
	snapPoint(cp2)
	snapPoint(end)
}

const clampPoint = point => {
	point.x = clamp(point.x, 0, canvas.width);
	point.y = clamp(point.y, 0, canvas.height);
}

/** @param {{ x: number, y: number }} point */
const snapPoint = point => {

	if (point.x > canvas.width) {
		point.x = canvas.width;
	} else {
		const xLocalSnapped = Math.round(gridXToLocalX(point.x) / snapThreshold) * snapThreshold
		point.x = clamp(localXToGridX(xLocalSnapped), 0, canvas.width);
	}

	// our coordinate system's Y starts in the bottom of the screen
	if (point.y < 0) {
		point.y = 0;
	} else {
		const yLocalSnapped = Math.round(gridYToLocalY(point.y) / snapThreshold) * snapThreshold
		point.y = clamp(localYToGridY(yLocalSnapped), 0, canvas.height);
	}
}

const updateSnapStateAndHtml = isOn => {
	// TODO:
	// console.log(`snap state: ${isOn}`);
	
	shouldSnap = isOn;

	if (isOn) {
		snapAmntInput.parentNode.classList.add("snap-on")
		snapAmntInput.parentNode.classList.remove("snap-off")
	} else {
		snapAmntInput.parentNode.classList.add("snap-off")
		snapAmntInput.parentNode.classList.remove("snap-on")
	}
}

updateSnapStateAndHtml(snapTog.checked);

const onChangeSnapValue = () => {
	snapThreshold = getSnapValue();
}

const onFillAreaTogChanged = () => {
	shouldFillArea = fillAreaTog.checked;

	render()
}

const samplePElements = [];

const createPForSample = () => {
	const p = document.createElement("p");
	p.classList.add("center");
	
	return p;
}

const updateP = (i, x, y) => {
	samplePElements[i].textContent = `${x.toFixed(4)} | ${y.toFixed(4)}`;
}

const setPAsBlank = (i) => {
	samplePElements[i].textContent = "";
}

for (let i = 0; i < nMax; ++i) {
	const p = createPForSample();
	samplePElements.push(p);
	samplesContainer.appendChild(p)
}


// constants
const MOUSE_BUTTON_LEFT = 0;
const TAU = 6.28318530;
const NAN = + +'javascript é uma merda kkkkkk';
const coordinateSystemMax = 8;

//  ########################################################################
//  ############################### Beziér #################################
//  ########################################################################

const lerp = (a, b, t) => (1 - t) * a + t * b;
const inverseLerp = (a, b, v) => (v - a) / (b - a);

const gridXToLocalX = (x) => x / canvas.width * coordinateSystemMax;
const gridYToLocalY = (y) => coordinateSystemMax - (y / canvas.height * coordinateSystemMax);

const localXToGridX = (x) => x / coordinateSystemMax * canvas.width;
const localYToGridY = (y) => canvas.height - (y / coordinateSystemMax * canvas.width);

// Points for the curve
const start = { x: localXToGridX(1.0), y: localYToGridY(4.5) };
const end =   { x: localXToGridX(7.0), y: localYToGridY(3.5) };
const cp1 =   { x: localXToGridX(2.0), y: localYToGridY(1.0) };
const cp2 =   { x: localXToGridX(6.0), y: localYToGridY(7.0) };

// const MIN_BISSECTION_THRESHOLD = 0.0001
const MIN_BISSECTION_THRESHOLD = 0.000001

/** @param {Number} x (x is in pixel coordinates) */
const bissectionYForX = (x) => {
	x = gridXToLocalX(x);
	
	let bisectionLow  = 0;
	let bisectionHigh = 1;
	let bisectionMid = 0.5;

	let xSample = gridXToLocalX(sampleCurveXAt(bisectionMid));
	for (let i = 0; i < 50; ++i) {

		const difference = Math.abs(xSample - x);
		if (difference < MIN_BISSECTION_THRESHOLD) {
			// console.log(`took ${i} to find t: ${bisectionMid}\nx: ${xSample} ~= ${x}\ny: ${sampleCurveYAt(bisectionMid)}`);
			return sampleCurveYAt(bisectionMid);
		}

		bisectionMid = (bisectionHigh + bisectionLow) * 0.5;
		xSample = gridXToLocalX(sampleCurveXAt(bisectionMid));

		if (xSample > x)
			bisectionHigh = bisectionMid;
		else
			bisectionLow  = bisectionMid;
	}

	return sampleCurveYAt(bisectionMid);
}

/** @param {Number} x (x is in pixel coordinates) */
const invertedBissectionYForX = (x) => {
	x = gridXToLocalX(x);
	
	let bisectionLow  = 0;
	let bisectionHigh = 1;
	let bisectionMid = 0.5;

	let xSample = gridXToLocalX(sampleCurveXAt(1 - bisectionMid));
	for (let i = 0; i < 50; ++i) {

		const difference = Math.abs(xSample - x);
		if (difference < MIN_BISSECTION_THRESHOLD) {
			return sampleCurveYAt(1 - bisectionMid);
		}

		bisectionMid = (bisectionHigh + bisectionLow) * 0.5;
		xSample = gridXToLocalX(sampleCurveXAt(1 - bisectionMid));

		if (xSample > x)
			bisectionHigh = bisectionMid;
		else
			bisectionLow  = bisectionMid;
	}

	return sampleCurveYAt(1 - bisectionMid);
}

/**
 * @param {Number} x 
 * @returns {Number}
 */
const sampleCurveAt = (t) => {
	const t2 = t * t;
	const t3 = t2 * t;

	const bernstein0 =   -t3 + 3*t2 - 3*t + 1;
	const bernstein1 =  3*t3 - 6*t2 + 3*t;
	const bernstein2 = -3*t3 + 3*t2;
	const bernstein3 =    t3;

	const newX = start.x * bernstein0 +
	               cp1.x * bernstein1 +
							   cp2.x * bernstein2 +
							   end.x * bernstein3;

	const newY = start.y * bernstein0 +
	               cp1.y * bernstein1 +
							   cp2.y * bernstein2 +
							   end.y * bernstein3;

	return { x: newX, y: newY };
}

const sampleCurveYAt = (t) => {
	const t2 = t * t;
	const t3 = t2 * t;

	const bernstein0 =   -t3 + 3*t2 - 3*t + 1;
	const bernstein1 =  3*t3 - 6*t2 + 3*t;
	const bernstein2 = -3*t3 + 3*t2;
	const bernstein3 =    t3;
	return start.y * bernstein0 +
		cp1.y * bernstein1 +
		cp2.y * bernstein2 +
		end.y * bernstein3;
}

const sampleCurveXAt = (t) => {
	const t2 = t * t;
	const t3 = t2 * t;

	const bernstein0 =   -t3 + 3*t2 - 3*t + 1;
	const bernstein1 =  3*t3 - 6*t2 + 3*t;
	const bernstein2 = -3*t3 + 3*t2;
	const bernstein3 =    t3;
	return start.x * bernstein0 +
		cp1.x * bernstein1 +
		cp2.x * bernstein2 +
		end.x * bernstein3;
}

// maths
const calculateHForN = (n) => {
	const b = gridXToLocalX(end.x);
	const a = gridXToLocalX(start.x);
	return Math.abs(b - a) / (n - 1);
}

const mathData = {
	n: nStart,
	h: calculateHForN(nStart),
}

const updateMathData = () => {
	mathData.n = nSlider.value;
	mathData.h = calculateHForN(mathData.n);
}


/** @returns {boolean} */
const getIsValidArea = () => {
	const maxXVertices = Math.max(start.x, end.x);
	const minXVertices = Math.min(start.x, end.x);
	return cp1.x > minXVertices
		&& cp2.x > minXVertices
		&& cp1.x < maxXVertices
		&& cp2.x < maxXVertices;
}

//  ########################################################################
//  ############################## Graphics ################################
//  ########################################################################
/** 
 * @type {{
 * isHolding: boolean,
 * objBeingHeld: { x: Number, y: Number }
 * isValid : boolean
 * }}
 */
const gameData = {
	isHolding: false,
	objBeingHeld: null,
	isValid: getIsValidArea(),
}

/** @return {Number} */
const clamp = (x, min, max) => {
	return Math.max(min, Math.min(x, max));
}

/**
 * @param {MouseEvent} event
 * @returns {{ x: Number, y: Number }}
 */
const getMousePosRelativeToCanvas = (event) => {
	const x = event.pageX - canvasRect.left;
	const y = event.pageY - canvasRect.top;

	return { x, y };
}

let isMouseOverCanvas = false;

/** @param {MouseEvent} evt */
const onMouseDown = evt => {
	if (evt.button != MOUSE_BUTTON_LEFT) return;

	// prevents selecting text
	if (isMouseOverCanvas) evt.preventDefault()

	const mousePos = getMousePosRelativeToCanvas(evt);

	gameData.objBeingHeld = getNearbyClosestObjectOrNull(mousePos);
	gameData.isHolding = gameData.objBeingHeld != null;
	gameData.isValid = getIsValidArea();

	mouseMove(evt);
}

/** @param {MouseEvent} evt */
const onMouseUp = evt => {
	if (evt.button != MOUSE_BUTTON_LEFT) return;

	if (!isMouseOverCanvas) document.body.style.cursor = "default"
	
	const mousePos = getMousePosRelativeToCanvas(evt);
	const hoveringANode = getNearbyClosestObjectOrNull(mousePos) != null;
	if (!hoveringANode) document.body.style.cursor = "default"

	gameData.isHolding = false;
	gameData.objBeingHeld = null;
}

/** @param {MouseEvent} evt */
const mouseMove = evt => {
	const mousePos = getMousePosRelativeToCanvas(evt);

	const objectBeingHovered = getNearbyClosestObjectOrNull(mousePos);
	if (gameData.isHolding) {
		document.body.style.cursor = "pointer";
	} else if (objectBeingHovered != null && isMouseOverCanvas) {
		document.body.style.cursor = "pointer";
	} else {
		document.body.style.cursor = "default";
	}


	if (!gameData.isHolding) return;

	if (shouldSnap) {
		gameData.objBeingHeld.x = mousePos.x;
		gameData.objBeingHeld.y = mousePos.y;
		snapPoint(gameData.objBeingHeld);

	} else {
		gameData.objBeingHeld.x = mousePos.x;
		gameData.objBeingHeld.y = mousePos.y;
		clampPoint(gameData.objBeingHeld);

	}
	gameData.isValid = getIsValidArea();

	render();
}

/**
 * @param {{ x: Number, y: Number }} point0 
 * @param {{ x: Number, y: Number }} point1 
 */
const distanceTo = (point0, point1) => {
	const pointsVec = { x: point1.x - point0.x, y: point1.y - point0.y }
	return Math.sqrt(pointsVec.x * pointsVec.x + pointsVec.y * pointsVec.y);
}


/** @param {{ x: Number, y: Number }} mousePos */
const getNearbyClosestObjectOrNull = (mousePos) => {
	if (distanceTo(mousePos, start) < 20) return start;
	if (distanceTo(mousePos, cp1) < 20)   return cp1;
	if (distanceTo(mousePos, cp2) < 20)   return cp2;
	if (distanceTo(mousePos, end) < 20)   return end;
	
	return null;
}

//  ########################################################################
//  ################################ HTML ##################################
//  ########################################################################
const coordinateSystemMarkLength = 10;
const pointSize = 7;

const strokeLine = (x0, y0, x1, y1) => {
	ctx.beginPath();
	ctx.moveTo(x0, y0);
	ctx.lineTo(x1, y1);
	ctx.stroke();
}

const drawTrapezoids = fillsArea => {
	// setup
	ctx.lineWidth = 2;
	ctx.strokeStyle = "rgba(0, 195, 128, 255)" // = "#00c380";
	
	const lastN = mathData.n - 1;
	
	// pixel coordinates
	let xStart = start.x;
	let xEnd   = end.x;
	
	let bissectY = bissectionYForX;
	if (xStart > xEnd) {
		[xStart, xEnd] = [xEnd, xStart];
		bissectY = invertedBissectionYForX;
	}
	
	// pixel coordinates
	let lastX = xStart;
	let lastY = bissectY(lastX);
	
	// AREA / DOM
	const localFirstX = gridXToLocalX(xStart);
	const localFirstY = gridYToLocalY(lastY);
	let area = localFirstY;
	updateP(0, localFirstX, localFirstY);

	// first line
	if (!fillsArea)
		strokeLine(xStart, canvas.height, lastX, lastY)
	else {
		ctx.beginPath();
		ctx.moveTo(xStart, canvas.height);
		ctx.lineTo(lastX, lastY);
		// ctx.stroke();
	}

	// middle trapezoids
	for (let i = 1; i < lastN; ++i) {
		const percentage = i / lastN;
		
		const x = lerp(xStart, xEnd, percentage);
		const y = bissectY(x);

		if (!fillsArea) {
			strokeLine(x, canvas.width, x, y)
			strokeLine(lastX, lastY, x, y)
		} else {
			ctx.lineTo(lastX, lastY);
		}

		lastX = x;
		lastY = y;

		// AREA / DOM
		const localY = gridYToLocalY(y);
		area += (localY * 2);
		updateP(i, gridXToLocalX(x), localY);
	}

	const x = lerp(xStart, xEnd, 1);
	const y = bissectY(x);

	// last trapezoid
	if (!fillsArea) {
		strokeLine(lastX, lastY, x, y)
		strokeLine(x, canvas.height, x, y)
	} else {
		ctx.lineTo(lastX, lastY);
		ctx.lineTo(x, y);
		ctx.lineTo(x, canvas.height);
		ctx.closePath();
		// ctx.fillStyle = "rgba(0, 195, 128, 1)"; // "rgba(255, 0, 0, 0.5)"
		// ctx.fillStyle = "rgba(0, 195, 128, 0.5)"; // "rgba(255, 0, 0, 0.5)"
		ctx.fillStyle = "rgba(0, 195, 128, 0.8)"; // "rgba(255, 0, 0, 0.5)"
		// ctx.fillStyle = "#ff00007F"
		ctx.fill();
	}

	// AREA / DOM
	const lastLocalX = gridXToLocalX(x);
	const lastLocalY = gridYToLocalY(y);
	area += lastLocalY;
	area *= mathData.h * 0.5;

	spanArea.style.color = "black";
	spanArea.textContent = area.toFixed(4);

	// console.log(`updating p with ${gridXToLocalX(x)}, ${lastLocalY}`);
	updateP(lastN, lastLocalX, lastLocalY);

	for (let i = lastN + 1; i < nMax; ++i) {
		setPAsBlank(i);
	}
}

const drawGrid = period => {
	ctx.lineWidth = 1.5;
	ctx.strokeStyle = "#d3d3d3";
	for (let i = 1; i < coordinateSystemMax; ++i) {
		const ourPeriod = period * i;

		// horizontal gray lines
		strokeLine(ourPeriod, 0, ourPeriod, canvas.height)
		// vertical gray lines
		strokeLine(0, ourPeriod, canvas.width, ourPeriod)
	}

	// TODO: draw snapping
	ctx.lineWidth = 0.4;
	ctx.strokeStyle = "#d3d3d3ff";
	for (let i = 0.5; i < coordinateSystemMax; i += 1) {
		const ourPeriod = period * i;

		// horizontal gray lines
		strokeLine(ourPeriod, 0, ourPeriod, canvas.height)
		// vertical gray lines
		strokeLine(0, ourPeriod, canvas.width, ourPeriod)
	}
}

const drawStuff = () => {
	// reset
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.setLineDash([0]);
	ctx.lineWidth = 3;

	const period = canvas.width / coordinateSystemMax;

	// DRAW TEXT
	// ctx.font = "bold 34px Courier New"; ctx.fillStyle = "aquamarine" ctx.shadowColor = "black" ctx.shadowBlur = 2
	// const text = "drag the anchors and control points"; const textMeasure = ctx.measureText(text); const textHeight = textMeasure.actualBoundingBoxAscent + textMeasure.actualBoundingBoxDescent;
	// ctx.fillText(text, canvas.width / 2 - textMeasure.width / 2, textHeight);

	if (!gameData.isValid) {
		spanArea.style.color = "red";
		spanArea.textContent = NAN;
	}

	// draws the filled trapezoids (before the controls)
	if (gameData.isValid && shouldFillArea)
		drawTrapezoids(true)

	drawGrid(period);


	// cubic bézier curve
	ctx.lineWidth = 3;
	ctx.strokeStyle = gameData.isValid ? "black" : "red";
	ctx.beginPath();
	ctx.moveTo(start.x, start.y);
	ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
	ctx.stroke();

	// dashed lines
	ctx.lineWidth = 2;
	ctx.setLineDash([5, 7]);
	ctx.strokeStyle = "black";
	strokeLine(start.x, start.y, cp1.x, cp1.y)
	strokeLine(end.x, end.y, cp2.x, cp2.y)

	// point in the middle
	ctx.setLineDash([0]);
	const point = sampleCurveAt(0.5);
	ctx.beginPath();
	ctx.arc(point.x, point.y, pointSize, 0, TAU);
	ctx.stroke();


	// draws the hollow trapezoids (after the curve)
	if (gameData.isValid && !shouldFillArea)
		drawTrapezoids(false)


	// start and end points
	ctx.fillStyle = "blue";
	ctx.beginPath();
	ctx.arc(start.x, start.y, pointSize, 0, TAU);
	ctx.arc(end.x,   end.y,   pointSize, 0, TAU);
	ctx.fill();

	// control points
	ctx.fillStyle = "red";
	ctx.beginPath();
	ctx.arc(cp1.x, cp1.y, pointSize, 0, TAU);
	ctx.arc(cp2.x, cp2.y, pointSize, 0, TAU);
	ctx.fill();

	// cartesian coordinates
	ctx.lineWidth = 2;
	ctx.strokeStyle = "black";
	ctx.fillStyle = "black";
	// ctx.lineWidth = 1.5;
	// ctx.strokeStyle = "#d3d3d3";
	ctx.font = "24px serif";
	for (let i = 1; i < coordinateSystemMax; ++i) {
		const ourPeriod = period * i;

		// horizontal cartesian coordinates
		strokeLine(ourPeriod, canvas.height, ourPeriod, canvas.height - coordinateSystemMarkLength)
		ctx.fillText(i, ourPeriod - 6, canvas.height - 15);
		
		// vertical cartesian coordinates
		strokeLine(0, ourPeriod, coordinateSystemMarkLength, ourPeriod)
		ctx.fillText(i, 15, canvas.height - ourPeriod + 6);
	}

}

const updateDom = () => {
	spanN.textContent = mathData.n - 1;

	if (gameData.isValid) {
		spanH.textContent = mathData.h.toFixed(4);
		spanH.style.color = "black";
		samplesDiv.style.display = "block";

	} else {
		spanH.textContent	= NAN;
		spanH.style.color = "red"
		samplesDiv.style.display = "none";

	}
}

const snapAllPointsIfNeeded = () => {
	if (snapTog.checked)
		snapAllPoints();
}

snapAllPointsIfNeeded()

const onToggleSnap = () => {
	updateSnapStateAndHtml(snapTog.checked);

	snapAllPointsIfNeeded()
	render();
}

const render = () => {
	updateMathData();
	drawStuff();
	updateDom();
}

//  ########################################################################
//  ############################# BOOTSTRAP ################################
//  ########################################################################
window.addEventListener("mousedown", onMouseDown);
window.addEventListener("mouseup",   onMouseUp);
window.addEventListener("mousemove", mouseMove);

canvas.addEventListener("mouseover", () => isMouseOverCanvas = true)
canvas.addEventListener("mouseout",  () => isMouseOverCanvas = false)

snapTog.addEventListener("change", onToggleSnap)
snapAmntInput.addEventListener("change", onChangeSnapValue)

fillAreaTog.addEventListener("change", onFillAreaTogChanged)

nSlider.addEventListener("input", render);

render();
