import LightControlElement from "./lightcontrolelement.js";

const template = document.createElement("template");
template.innerHTML = `
<style>
	:host {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		background-color: #0008;
		display: flex;
		justify-content: center;
		align-items: center;
		color: black;
	}

	.dialog {
		max-width: 90vw;
		max-height: 90vh;
		background-color: white;

		display: grid;
		grid-template-areas: "h h h" "c c c" "f f f";
		grid-template-rows: 3rem auto 3rem;
		grid-template-columns: max-content max-content max-content;

		place-items: stretch;
		box-shadow: #666 0.5vw 0.5vh 2vmax;
	}

	.head {
		grid-area: h;
		font-size: 1.5em;
		line-height: 3rem;

		color: #555;

		text-align: center;
		padding: 0 1rem;
	}

	.content {
		grid-area: c;
		padding: 1rem;
		border-bottom: 1px solid #ececec;
		border-top: 1px solid #ececec;
	}

	.foot {
		grid-area: f;
		display: flex;
		gap: 0.5rem;
		padding: 0 0.5rem;
		justify-content: flex-end;
		align-items: center;
	}

	button {
		border: 1px solid #999;
		min-width: 4.5rem;
		height: 2rem;
		font-weight: bold;
	}




</style>
<div class="dialog">
	<section class="head">
		<label id="title" class="title"></label>
	</section>
	<section class="content"></section>
	<section class="foot">
		<button id="btnOk" class="ok">Ok</button>
		<button id="btnCancel" class="cancel">Cancel</button>
	</section>
</div>
`;
export default class LightSceneDialog extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(scene) {
		super();
		this.scene = scene;

		this._shadow = this.attachShadow({ mode: 'open' });
		this._shadow.append(template.content.cloneNode(true));

		this._initDom();
	}

	async show() {
		document.body.append(this);

		return new Promise((res, rej) => {
			this._promiseShowResolve = res;
			this._promiseShowReject = rej;
		});
	}

	async close(cancel = false, returnValue = null) {
		this.parentElement.removeChild(this);

		if (cancel) {
			this._promiseShowReject(returnValue);
		} else {
			this._promiseShowResolve(returnValue);
		}
	}


	////////////////////////////////////// Custom Element Methods //////////////////////////////////////

	connectedCallback() {}

	disconnectedCallback() {}

	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}

	static get observedAttributes() {
		return ["title"];
	}


	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get title() {
		return this._shadow.querySelector("#title").textContent;
	}

	set title(value) {
		this._shadow.querySelector("#title").textContent = value;
	}


	////////////////////////////////////////// Public Methods //////////////////////////////////////////
	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	async _initDom() {
		const lightstates = await this.scene.lightstatesReady;

		this._shadow.querySelector(".content").append(...Object.values(this.scene.lights).map(light => {
			return new LightControlElement(light, lightstates[light.lightId] || { on: true });
		}));

		this._shadow.querySelector("#btnOk").addEventListener("click", () => {
			const lightstates = {};
			this._shadow.querySelectorAll(".content mi-lightcontrol").forEach(lc => {
				lightstates[lc.light.lightId] = lc.lightstate;
			});

			this.close(false, lightstates);
		});

		this._shadow.querySelector("#btnCancel").addEventListener("click", () => {
			this.close(true);
		});

	}

}
customElements.define("mi-scenedialog", LightSceneDialog);

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////
