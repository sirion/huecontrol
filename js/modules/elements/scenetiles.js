import { d } from "https://js.himmelrath.net/modules/dom/domutils.js";

const template = document.createElement("template");
template.innerHTML = `
<style>
	:host {
		display: block;
		height: 100%;
		width: 100%;
	}

	:host([hidden]) {
		display: none;
	}

	.wrapper {
		display: grid;
		grid-template-areas: "t t t t" "t t t t" "t t t t" "t t t t";
		gap: 1vmin;
		height: 100%;
		width: 100%;
		justify-content: space-evenly;
		align-items: center;
	}

	.wrapper.busy:after {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		content: "LOADING..."
	}

	.tile {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 24vmin;
		height: 24vmin;
		border-radius: 5vmin;
		border: 1px solid #999;
		background: #88888866;
	}

	.tile .title {
		box-sizing: border-box;
		font-size: 2em;
		font-weight: bold;
		padding: 0.25rem;
	}

</style>
<div class="wrapper">
</div>`;
export default class SceneTiles extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(bridge) {
		super();
		this.bridge = bridge;

		// Init shdow DOM template
		this.wrapper = null;
		this._initDom();

		this.busy = true;
		bridge.dataLoaded.then(() => this.busy = false);
	}

	////////////////////////////////////// Custom Element Methods //////////////////////////////////////

	connectedCallback() {}

	disconnectedCallback() {}

	attributeChangedCallback(name, oldValue, newValue) {
		if (newValue !== oldValue) {
			this[name] = newValue;
		}
	}

	static get observedAttributes() {
		return [];
	}

	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get busy() {
		return this.wrapper.classList.contains("busy");
	}

	set busy(value) {
		this.wrapper.classList.toggle("busy", value);
	}

	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	async refresh() {
		const allScenes = await this.bridge.scenesLoaded;
		const scenes = Object.values(allScenes).filter(s => s.owner === this.bridge.user);

		while (this.wrapper.children.length > 0) {
			this.wrapper.removeChild(this.wrapper.firstChild);
		}


		for (const scene of scenes) {
			this.wrapper.append(d({
				classes: ["tile"],
				children: [{
					classes: ["title"],
					textContent: scene.name
				}],
				style: {
					cursor: "pointer"
				},
				events: {
					click: this.bridge.setState.bind(this.bridge, scene)
				}
			}));
		}

		this.wrapper.append(d({
			classes: ["tile"],
			children: [{
				classes: ["title"],
				textContent: "All On"
			}],
			style: {
				cursor: "pointer"
			},
			events: {
				click: this.bridge.setState.bind(this.bridge, { on: true })
			}
		}));
		this.wrapper.append(d({
			classes: ["tile"],
			children: [{
				classes: ["title"],
				textContent: "All Off"
			}],
			style: {
				cursor: "pointer"
			},
			events: {
				click: this.bridge.setState.bind(this.bridge, { on: false })
			}
		}));


		setTimeout(this._updateTextSizes.bind(this), 0);
	}

	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	_initDom() {
		this._shadow = this.attachShadow({ mode: 'open' });
		const dom = template.content.cloneNode(true);
		this.wrapper = dom.querySelector(".wrapper");

		this.wrapper.classList.add("busy");

		this._shadow.append(dom);
		this.refresh();
	}

	async _updateTextSizes() {
		const titles = this.wrapper.querySelectorAll(".tile > .title");

		for (const title of titles) {
			const tileWidth = title.parentElement.offsetWidth;

			let scale = parseFloat(title.style.scale);
			scale = isNaN(scale) ? 1 : scale;
			if (title.getBoundingClientRect().width < tileWidth) {
				while (title.getBoundingClientRect().width < tileWidth) {
					scale *= 1.1;
					title.style.scale = scale;
				}
				scale *= 0.9;
				title.style.scale = scale;
			} else {
				while (title.getBoundingClientRect().width > tileWidth) {
					scale *= 0.9;
					title.style.scale = scale;
				}
			}
		}

	}

}
customElements.define("mi-scenetiles", SceneTiles);

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////
