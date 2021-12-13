const templateXXX = document.createElement("template");
templateXXX.innerHTML = `
<style>
	:host {
		display: block;
		min-height: 1em;
		min-width: 5em;
		display: flex;
		align-content: stretch;
		flex-wrap: nowrap;
		align-items: stretch;
	}

	canvas {
		width: 100%;
		height: 100%;
	}

</style>
<canvas width="1" height="1"></canvas>`;

/* export default */ class ColorRange extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor() {
		super();
		this._mode = ColorRange.MODE_HUE;
		this._changed = true;
		this._width = 0;
		this._height = 0;
		this._mousePos = null;
		this._valuePos = null;
		this._boundDraw = this._draw.bind(this);

		this._initDom();
	}

	////////////////////////////////////// Custom Element Methods //////////////////////////////////////

	connectedCallback() {
		window.cancelAnimationFrame(this._animReq);
		this._animReq = window.requestAnimationFrame(this._boundDraw);
	}

	disconnectedCallback() {
		window.cancelAnimationFrame(this._animReq);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			this[name] = newValue;
		}
	}

	static get observedAttributes() {
		return [ "value", "mode", "satColor"];
	}


	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get value() {
		if (this._valuePos === null) {
			return null;
		}
		return this._valuePos / this.canvas.width;
	}

	set value(value) {
		this._valuePos = value * this.canvas.width;
		this._changed = true;
		this.setAttribute("value", this.value);
	}

	get mode() {
		return this._mode;
	}

	set mode(value) {
		switch (value) {
			case ColorRange.MODE_HUE:
			case ColorRange.MODE_BW:
				this._mode = value;
				break;

			case ColorRange.MODE_SAT:
				this.satColor ||= 0xFF00FF;
				this._mode = value;
				break;

			default:
				this._mode = ColorRange.MODE_HUE;
		}

		this.setAttribute("mode", this._mode);
		this._changed = true;
	}

	get satColor() {
		if (!this._satComponents) {
			return null;
		}
		return (this._satComponents[0] << 16) + (this._satComponents[1] << 8) + this._satComponents[2];
	}

	set satColor(value) {
		if (typeof value === "string") {
			if (value.substring(0, 1) === "#") {
				// Hex color code
				value = parseInt(value.substring(1), 16);
			} else if (value.substring(0, 4) === "rgb(") {
				// rgb(r, g, b)
				value = value
					.substring(4, value.length - 1)
					.split(",")
					.map(v => parseInt(v, 10))
					.reduceRight((prev, v, i) => prev + (v << (i * 8)), 0);
			} else {
				// Number
				value = parseInt(value, 10);
			}
		}

		this._satComponents = [
			(value & 0xFF0000) >> 16,
			(value & 0xFF00) >> 8,
			value & 0xFF
		];

		this.setAttribute("satColor", "#" + (value & 0xFFFFFF).toString(16).padStart("0", 6));
		this._changed = true;
	}

	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	colorAt(n) {
		switch (this.mode) {
			case ColorRange.MODE_HUE:
				return "#" + hue2rgb(n).map(c => c.toString(16).padStart(2, "0")).join("");
				// return "hsl(" + Math.round(n * 360) + ", 100%, 50%)";

			case ColorRange.MODE_BW:
				return "#" + Math.round(n * 0xFF).toString(16).padStart(2, "0").repeat(3);

			case ColorRange.MODE_SAT:
				return "#" + (
					(0xFF - Math.round(n * (0xFF - this._satComponents[0])) << 16) +
					(0xFF - Math.round(n * (0xFF - this._satComponents[1])) << 8) +
					(0xFF - Math.round(n * (0xFF - this._satComponents[2])))
				).toString(16).padStart(6, "0");

			default:
				return "#000";
		}
	}

	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	_initDom() {
		this._shadow = this.attachShadow({ mode: 'open' });
		this._shadow.append(templateXXX.content.cloneNode(true));

		this.canvas = this._shadow.querySelector("canvas");
		this.ctx = this.canvas.getContext("2d");

		this.canvas.addEventListener("mousemove", e => {
			this._mousePos = e.offsetX;
			this._changed = true;
			if (e.buttons === 1) {
				this._dispatchInput();
			}
		});
		this.canvas.addEventListener("mouseout", () => {
			this._mousePos = null;
			this._changed = true;
		});
		this.canvas.addEventListener("mousedown", e => {
			this._mousePos = e.offsetX;
			this._changed = true;
			this._dispatchInput();
		});
		this.canvas.addEventListener("mouseup", e => {
			this.value = e.offsetX / this.canvas.width;
			this._changed = true;
			this._dispatchChange();
		});

		this._draw()
	}

	_dispatchInput() {
		this.dispatchEvent(new CustomEvent("input", { detail: { value: this._mousePos / this.canvas.width }}));
	}

	_dispatchChange() {
		this.dispatchEvent(new CustomEvent("change", { detail: { value: this.value }}));
	}

	_draw(ts) {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;
		if (width > 0 && height > 0 && (this._changed || this.canvas.width !== width || this.canvas.height !== height)) {
			this._changed = false;


			const lineWidth = Math.max(width / 100, 1);

			const paintLine = (x, color) => {
				this.ctx.strokeStyle = color;
				this.ctx.beginPath();
				this.ctx.moveTo(x, 0);
				this.ctx.lineTo(x, height);
				this.ctx.stroke();
			};

			const paintTriangle = (x, color) => {
				this.ctx.strokeStyle = color;
				this.ctx.beginPath();
				this.ctx.moveTo(x - 3 * lineWidth, 0);
				this.ctx.lineTo(x, 6);
				this.ctx.lineTo(x + 3 * lineWidth, 0);
				this.ctx.closePath();
				this.ctx.fill();
			};


			if (this._valuePos) {
				this._valuePos = Math.round(this._valuePos / this.canvas.width * width);
			}
			this.canvas.width = width;
			this.canvas.height = height;
			this.ctx.lineWidth = lineWidth;

			for (let i = 0; i < width; i++) {
				paintLine(i, this.colorAt(i / width));
			}

			if (this._mousePos !== null) {
				// paintLine(this._mousePos - lineWidth, "#000");
				paintLine(this._mousePos, "#FFFFFF99");
				// paintLine(this._mousePos + lineWidth, "#000");
			}

			if (this._valuePos !== null) {
				paintLine(this._valuePos - lineWidth, "#fff");
				paintLine(this._valuePos, "#000");
				paintLine(this._valuePos + lineWidth, "#fff");
				paintTriangle(this._valuePos, "#000")
			}
		}

		this._animReq = window.requestAnimationFrame(this._boundDraw);
	}


}
customElements.define("mi-colorrange", ColorRange);

///////////////////////////////////////// Static Properties ////////////////////////////////////////

ColorRange.MODE_HUE = "hue";
ColorRange.MODE_BW = "bw";
ColorRange.MODE_SAT = "sat";


///////////////////////////////////////// Hidden Functions /////////////////////////////////////////

function hue2color(t) {
	t = Math.sign(t) == 1 ? Math.abs(t - Math.trunc(t)) : 1 - Math.abs((t - Math.trunc(t)));

	let v = 0;
	if (t < 1/6) {
		v = 6 * t;
	} else if (t < 1/2) {
		v = 1;
	} else if (t < 2/3) {
		v = (2/3 - t) * 6;
	}

	return v;
}

function hue2rgb(h){
	return [
		Math.round(255 * hue2color(h + 1/3)),
		Math.round(255 * hue2color(h)),
		Math.round(255 * hue2color(h - 1/3))
	]
}




import { d } from "https://js.himmelrath.net/modules/dom/domutils.js";
import Popup from "./popup.js";
import lightIcon from "../htmltemplates/icons/light.js";
import brightIcon from "../htmltemplates/icons/bright.js";
import paletteIcon from "../htmltemplates/icons/palette.js";
import thermometerIcon from "../htmltemplates/icons/thermometer.js";


const template = document.createElement("template");
template.innerHTML = `
<style>
	:host {

	}

	.wrapper {
		display: grid;
		grid-template-areas: "name ct color bri on";
		grid-template-columns: 1fr 2em 2em 2em 2em;
		grid-template-rows: 2em;
		gap: 0.25rem;
		width: 100%;
	}

	.icon {
		width: 1.5em;
		height: 1.5em;
	}

	.name {
		text-align: start;
		text-overflow: ellipsis;
		line-height: 2em;
		overflow: hidden;
	}

	.button.ct {
		grid-area: ct;
	}
	.button.color {
		grid-area: color;
	}
	.button.bri {
		grid-area: bri;
	}
	.button.on {
		grid-area: on;
	}

	.button {
		display: none;
		width: 2em;
		height: 2em;
		cursor: pointer;
		position: relative;
	}

	.button:hover {
		background-color: #ccc;
	}

	.button:hover .icon {
		fill: #666;
	}

	.button:hover .icon {
		fill: #000;
	}

	.button.supported {
		display: flex;
		place-items: center;
		place-content: center;
	}

	.button.active:after {
		content: " ";
		width: 0.5rem;
		height: 0.5rem;
		background-color: #6c6;
		border-radius: 0.5rem;
		display: block;
		position: absolute;
		top: 0;
		left: 0;
	}


</style>
<div class="wrapper">
	<span class="name"></span>
	<div class="button ct"></div>
	<div class="button color"></div>
	<div class="button bri"></div>
	<div class="button on"></div>
</div>
`;
export default class LightControlElement extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(light, lightstate) {
		super();

		this._initDom();

		this.light = light;
		this.name = light.name;
		this.type = light.type;
		this.lightstate = lightstate;
	}

	////////////////////////////////////// Custom Element Methods //////////////////////////////////////

	connectedCallback() {}

	disconnectedCallback() {}

	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}

	static get observedAttributes() {
		return [];
	}


	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get name() {
		return this._shadow.querySelector(".name").textContent;
	}

	set name(value) {
		this._shadow.querySelector(".name").textContent = value;
	}

	get lightstate() {
		return this._lightstate;
	}

	set lightstate(value) {
		this._buttonDom.on.classList.toggle("active", value.on !== undefined);
		this._buttonDom.bri.classList.toggle("active", value.bri !== undefined);
		this._buttonDom.color.classList.toggle("active", value.hue !== undefined);
		this._buttonDom.ct.classList.toggle("active", value.ct !== undefined);

		this._lightstate = value;
	}


	get type() {
		return this._type;
	}

	set type(value) {
		switch (value.toLowerCase()) {
			// TODO: Try out alert
			// TODO: Optimize whether to use (hue, sat) or xy based on specific light model


			// Supports on
			case "on/off plug-in unit":
			case "on/off light":
				this._buttonDom.on.classList.toggle("supported", true);
				this._buttonDom.bri.classList.toggle("supported", false);
				this._buttonDom.color.classList.toggle("supported", false);
				this._buttonDom.ct.classList.toggle("supported", false);
				break;

			// Supports on, bri
			case "dimmable light":
				this._buttonDom.on.classList.toggle("supported", true);
				this._buttonDom.bri.classList.toggle("supported", true);
				this._buttonDom.color.classList.toggle("supported", false);
				this._buttonDom.ct.classList.toggle("supported", false);
				break;

			// Supports on, bri, ct
			case "color temperature light":
				this._buttonDom.on.classList.toggle("supported", true);
				this._buttonDom.bri.classList.toggle("supported", true);
				this._buttonDom.color.classList.toggle("supported", false);
				this._buttonDom.ct.classList.toggle("supported", true);
				break;

			// Supports on, bri, (hue, sat), xy
			case "color light":
				this._buttonDom.on.classList.toggle("supported", true);
				this._buttonDom.bri.classList.toggle("supported", true);
				this._buttonDom.color.classList.toggle("supported", true);
				this._buttonDom.ct.classList.toggle("supported", false);
				break;

			// Supports on, bri, (hue, sat), xy, ct
			case "extended color light":
				this._buttonDom.on.classList.toggle("supported", true);
				this._buttonDom.bri.classList.toggle("supported", true);
				this._buttonDom.color.classList.toggle("supported", true);
				this._buttonDom.ct.classList.toggle("supported", true);
				break;

		}
	}


	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	setTempState(tempState) {
		clearTimeout(this._tempStateTimeout);
		this._tempStateTimeout = setTimeout(() => {
			this.light.bridge.setState(this.light, tempState);
		}, 250);
	}

	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	_initDom() {
		this._shadow = this.attachShadow({ mode: 'open' });
		this._shadow.append(template.content.cloneNode(true));

		this._buttonDom = {
			ct: this._shadow.querySelector(".button.ct"),
			color: this._shadow.querySelector(".button.color"),
			bri: this._shadow.querySelector(".button.bri"),
			on: this._shadow.querySelector(".button.on"),
		};

		this._buttonDom.ct.append(thermometerIcon.cloneNode(true));
		this._buttonDom.color.append(paletteIcon.cloneNode(true));
		this._buttonDom.bri.append(brightIcon.cloneNode(true));
		this._buttonDom.on.append(lightIcon.cloneNode(true));

		this._buttonDom.on.addEventListener("click", this._onClickedOn.bind(this));
		this._buttonDom.bri.addEventListener("click", this._onClickedBri.bind(this));
		this._buttonDom.ct.addEventListener("click", this._onClickedCt.bind(this));
		this._buttonDom.color.addEventListener("click", this._onClickedColor.bind(this));


	}

	async _onClickedOn(e) {
		const lightstate = this.lightstate;

		const popup = new Popup(e.target);
		popup.title = `On/Off for "${this.name}"`;

		const content = d({
			type: "div",
			style: {
				"display": "grid",
				"grid-template-columns": "auto 2em",
				"gap": "0.5rem"
			},
			children: [{
				type: "label",
				textContent: "On:"
			},{
				id: "inpOn",
				type: "input",
				attributes: {
					type: "checkbox",
					checked: this.lightstate.on ? "checked" : undefined
				},
				events: {
					"change": () => {
						popup.close(false);
					}
				}
			}, {
				type: "button",
				textContent: "Remove",
				style: {
					"grid-column": "1 / 3"
				},
				events: {
					"click": () => {
						delete this.lightstate.on;
						popup.close(true);
					}
				}

			}]
		})

		popup.append(content);

		try {
			await popup.show();
			this.lightstate.on = !!content.querySelector("#inpOn").checked;
		} catch (ex) {
			// Canceled
		}
		this.lightstate = lightstate;

		// Reset changed light
		this.light.bridge.setState(this.light);
	}

	async _onClickedBri(e) {
		const lightstate = this.lightstate;

		const popup = new Popup(e.target);
		popup.title = `Brightness for "${this.name}"`;

		const content = d({
			type: "div",
			style: {
				"display": "grid",
				"grid-template-columns": "min-content auto min-content",
				"gap": "0.5rem"
			},
			children: [{
				type: "label",
				textContent: "0%"
			},{
				id: "inpBri",
				type: "input",
				attributes: {
					type: "range",
					min: "0",
					max: "255",
					value: lightstate.bri || 0
				},
				events: {
					"change": () => {
						popup.close(false);
					},
					"input": e => {
						this.setTempState(Object.assign({}, lightstate, {
							bri: parseInt(e.target.value, 10)
						}));
					}
				}
			},{
				type: "label",
				textContent: "100%"
			},{
				type: "button",
				textContent: "Remove",
				style: {
					"grid-column": "1 / 3"
				},
				events: {
					"click": () => {
						delete lightstate.bri;
						popup.close(true);
					}
				}

			}]
		})

		popup.append(content);

		try {
			await popup.show();
			lightstate.bri = parseInt(content.querySelector("#inpBri").value, 10);
		} catch (ex) {
			// Canceled
		}
		this.lightstate = lightstate;

		// Reset changed light
		this.light.bridge.setState(this.light);
	}

	async _onClickedCt(e) {
		const lightstate = this.lightstate;

		const popup = new Popup(e.target);
		popup.title = `Color Temperature for "${this.name}"`;

		const content = d({
			type: "div",
			style: {
				"display": "grid",
				"grid-template-columns": "min-content auto min-content",
				"gap": "0.5rem"
			},
			children: [{
				type: "label",
				textContent: "Cold"
			},{
				id: "inpCt",
				type: "input",
				attributes: {
					type: "range",
					min: "153",
					max: "500",
					value: lightstate.ct || 250
				},
				events: {
					"change": () => {
						popup.close(false);
					},
					"input": e => {
						this.setTempState(Object.assign({}, lightstate, {
							xy: undefined,
							ct: parseInt(e.target.value, 10)
						}));
					}
				}
			},{
				type: "label",
				textContent: "Warm"
			},{
				type: "button",
				textContent: "Remove",
				style: {
					"grid-column": "1 / 3"
				},
				events: {
					"click": () => {
						delete lightstate.ct;
						popup.close(true);
					}
				}

			}]
		})

		popup.append(content);

		try {
			await popup.show();
			delete lightstate.hue;
			delete lightstate.sat;
			lightstate.ct = parseInt(content.querySelector("#inpCt").value, 10);
		} catch (ex) {
			// Canceled
		}
		this.lightstate = lightstate;

		// Reset changed light
		this.light.bridge.setState(this.light);
	}

	async _onClickedColor(e) {
		const lightstate = this.lightstate;

		const popup = new Popup(e.target);
		popup.title = `Color for "${this.name}"`;

		const setTempState = (hue, sat) => {
			const tempState = Object.assign({}, lightstate, {
				ct: undefined,
				xy: undefined,
				hue: Math.round(hue),
				sat: Math.round(sat)
			});
			this.setTempState(tempState);
		};


		const content = d({
			type: "div",
			style: {
				"display": "grid",
				"grid-template-areas": "'hue' 'sat' 'ok' 'del'" ,
				"grid-template-columns": "100%",
				"gap": "0.5rem"
			},
			children: [{
				id: "inpHue",
				type: "mi-colorrange",
				style: {
					"grid-area": "hue",
					"height": "2rem"
				},
				attributes: {
					mode: "hue",
					value: lightstate.hue !== undefined ? lightstate.hue / 65535 : 0
				},
				events: {
					"change": e => {
						const hue = e.detail.value * 65535;
						const sat = parseFloat(content.querySelector("#inpSat").value) * 254;
						setTempState(hue, sat);

						content.querySelector("#inpSat").satColor = e.target.colorAt(e.detail.value);
						// popup.close(false);
					},
					"input": e => {
						const hue = e.detail.value * 65535;
						const sat = parseFloat(content.querySelector("#inpSat").value) * 254;
						setTempState(hue, sat);

						content.querySelector("#inpSat").satColor = e.target.colorAt(e.detail.value);
					}
				}
			},{
				id: "inpSat",
				type: "mi-colorrange",
				style: {
					"grid-area": "sat",
					"height": "2rem"
				},
				attributes: {
					mode: "sat",
					value: lightstate.sat !== undefined ? lightstate.sat / 254 : 1
				},
				events: {
					"change": e => {
						const hue = parseFloat(content.querySelector("#inpHue").value) * 65535;
						const sat = e.detail.value * 254;
						setTempState(hue, sat);
						// popup.close(false);
					},
					"input": e => {
						const hue = parseFloat(content.querySelector("#inpHue").value) * 65535;
						const sat = e.detail.value * 254;
						setTempState(hue, sat);
					}
				}
			},{
				type: "button",
				textContent: "Ok",
				style: {
					"grid-area": "ok",
				},
				events: {
					"click": () => {
						popup.close(false);
					}
				}
			},{
				type: "button",
				textContent: "Remove",
				style: {
					"grid-area": "del",
				},
				events: {
					"click": () => {
						delete lightstate.sat;
						delete lightstate.hue;
						popup.close(true);
					}
				}
			}]
		})

		popup.append(content);

		try {
			await popup.show();
			delete lightstate.ct;
			delete lightstate.xy;
			Object.assign(lightstate, {
				hue: Math.round(parseFloat(content.querySelector("#inpHue").value) * 65535),
				sat: Math.round(parseFloat(content.querySelector("#inpSat").value) * 254),
			});
		} catch (ex) {
			// Canceled
		}
		this.lightstate = lightstate;

		// Reset changed light
		this.light.bridge.setState(this.light);
	}

}
customElements.define("mi-lightcontrol", LightControlElement);

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////


