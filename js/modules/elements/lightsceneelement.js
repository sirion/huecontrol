import saveIcon from "../htmltemplates/icons/save.js";
import plusIcon from "../htmltemplates/icons/plus.js";
import editIcon from "../htmltemplates/icons/edit.js";
import xIcon from "../htmltemplates/icons/x.js";
import trashIcon from "../htmltemplates/icons/trash.js";
import photoIcon from "../htmltemplates/icons/photo.js";
import settingsIcon from "../htmltemplates/icons/settings.js";
import LightSceneDialog from "./lightscenedialog.js";
import sorter from "../utils/sorter.js";

// Returns true if the second object contains all properties of the first object with the same values
function hasState(state1, state2) {
	if (!state2) {
		return false;
	}

	for (const key in state1) {
		if (state1[key] !== state2[key]) {
			return false;
		}
	}

	return true;
}

const template = document.createElement("template");
template.innerHTML = `
<style>

	:host {
		display: block;
	}

	#wrapper {
		display: grid;
		grid-template-columns: 2rem 1fr 1fr 1.5rem;
		grid-template-rows: 1.25em auto 2rem;
		column-gap: 0.5rem;
		user-select: none;
	}

	[contenteditable=true] {
		background-color: #ccc;
		color: black;
		border: 1px solid white;
	}

	.new {
		opacity: 0.5;
	}

	.dragover {
		background-color: #555;
	}

	.icon.plus, .icon.photo {
		grid-column: 1;
		grid-row: 1 / 3;
	}

	.icon {
		display: none;
		fill: #666;
		cursor: pointer;
	}
	#wrapper:not(.new):not(.unsaved) .icon:hover {
		background-color: #444;
	}

	.on .icon.photo {
		fill: #da6;
	}

	.any_on .icon.photo {
		fill: #753;
	}

	.changed .icon.photo {
		fill: #f33;
	}


	.new .icon.plus {
		display: block;
	}

	.saved .icon.photo,
	.changed .icon.photo,
	.unsaved .icon.photo {
		display: block;
	}

	.unsaved .icon.photo {
		fill: #f00;
	}

	.name {
		grid-column: 2 / 4;
		grid-row: 1;
		max-width: 10rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lights {
		grid-column: 2 / 4;
		grid-row: 2 / 4;

		display: grid;
		grid-template-columns: 1fr 2em;
		grid-auto-rows: 2em;
		font-size: 0.65em;
		padding: 0.5em 0 0.5em 1em;
		margin: 0;
		gap: 0.25em;
	}

	.lights .added {
		font-style: italic;
		color: #aaa;
	}

	.btnRemoveLight {
		display: flex;
		visibility: hidden;
		cursor: pointer;
		background-color: #222;
		justify-content: center;
		align-items: center;
		border: 1px dashed #666;
	}

	.unsaved .btnRemoveLight,
	.changed .btnRemoveLight {
		visibility: visible;
	}

	.controls {
		grid-column: 4;
		grid-row: 1 / 4;

		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: 100%;
		height: 100%;
		margin: 0;
	}

	.controls > .icon {
		display: none;
	}

	.controls > .icon:hover {
		fill: #fff;
	}

	.unsaved .controls .btnSave,
	.unsaved .controls .btnDelete {
		display: block;
	}

	.saved .controls .btnDelete,
	.saved .controls .btnEdit {
		display: block;
	}

	.changed .controls .btnSave,
	.changed .controls .btnCancel,
	.changed .controls .btnDelete {
		display: block;
	}

	.actions {
		grid-column: 1 / 4;
		grid-row: 4;
		max-height: 2rem;
		display: flex;
		justify-content: flex-start;
	}

	.unsaved .actions .btnSettings,
	.changed .actions .btnSettings {
			display: block;

	}

</style>
<div id="wrapper">
	<div class="name"></div>
	<div class="lights"></div>
	<div class="controls"></div>
	<div class="actions"></div>
</div>`;
export default class LightSceneElement extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(bridge) {
		super();

		this.bridge = bridge;

		this.sceneId = null;
		this._on = false;
		this._any_on = false;

		this.lights = {};
		this.addedLights = {};
		this._data = {};

		this.wrapper = null;

		// Init shdow DOM template
		this._initDom();
		this._initDragDrop();

		this.mode = "new";
	}




	////////////////////////////////////// Custom Element Methods //////////////////////////////////////

	connectedCallback() {}

	disconnectedCallback() {}

	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}

	static get observedAttributes() {
		return ["name", "description", "icon"];
	}


	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get data() {
		return this._data;
	}

	set data(value) {
		this._shadow.querySelector(".name").contentEditable = "false";
		this.lights = {};
		if (!value) {
			this.sceneId = null;
			this._data = {};
			return;
		}

		if (value._id) {
			this.sceneId = value._id;
		}
		this._data = value;

		// Remove prefix
		this.name = value.name;

		value.lights.forEach(lightId => {
			this.lights[lightId] = this.bridge.lights[lightId];
		});


		if (value.lightstates) {
			this.lightstates = value.lightstates;
		}

		// Check if on or any_on
		let any_on = true;
		let all_on = true;
		if (this._lightstates === null) {
			any_on = false;
			all_on = false;
		} else {
			for (const lightId in this._lightstates) {
				if (!this.lights[lightId].state.on) {
					any_on = false;
					all_on = false;
					break;
				} else if (all_on && !hasState(this._lightstates[lightId], this.lights[lightId].state)) {
					all_on = false;
				}
			}
		}

		this.any_on = any_on && !all_on;
		this.on = all_on;

		this._refreshLightsDom();
	}


	get lightstatesReady() {
		if (!this._lightstates) {
			this._lightstates = new Promise(res => {
				this.bridge.updateElement(this).then(() => {
					res(this._lightstates);
				});
			});
		}
		return this._lightstates;
	}

	set lightstates(value) {
		this._lightstates = Promise.resolve(value);
	}

	get owner() {
		return this._data?.owner;
	}

	get name() {
		return this._shadow.querySelector(".name").textContent;
	}

	set name(value) {
		this._shadow.querySelector(".name").textContent = value;
	}

	set mode(value) {
		this._mode = value;
		this.wrapper.classList.toggle("new", value === "new");
		this.wrapper.classList.toggle("unsaved", value === "unsaved");
		this.wrapper.classList.toggle("changed", value === "changed");
		this.wrapper.classList.toggle("saved", value === "saved");

		const editMode = value === "changed" || value === "unsaved";
		this._shadow.querySelector(".name").contentEditable = editMode ? "true" : "false";
	}

	get mode() {
		return this._mode;
	}

	// Returns true if the scene is active, meaning all lights have the desired lightstate
	get on() {
		return this._on;
	}


	set on(value) {
		this._on = value;
		this.wrapper.classList.toggle("on", !!value);
	}

	// Returns true if all of the scenes lights are on, but with states different from the desired states.
	get any_on() {
		return this._any_on;
	}

	set any_on(value) {
		this._any_on = value;
		this.wrapper.classList.toggle("any_on", !!value && !this.on);
	}



	////////////////////////////////////////// Public Methods //////////////////////////////////////////


	addLight(light) {
		if (this.lights[light.lightId] || this.addedLights[light.lightId]) {
			return;
		}

		this.addedLights[light.lightId] = light;

		if (this.sceneId) {
			this.mode = "changed";
		} else {
			this.mode = "unsaved";
		}
		this._refreshLightsDom();
	}

	removeLight(lightId) {
		if (!this.lights[lightId] && !this.addedLights[lightId]) {
			return;
		}

		delete this.addedLights[lightId];
		delete this.lights[lightId];

		if (this.sceneId) {
			this.mode = "changed";
		} else {
			this.mode = "unsaved";
		}
		this._refreshLightsDom();
	}


	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	_initDom() {
		this._shadow = this.attachShadow({ mode: 'open' });
		const dom = template.content.cloneNode(true);
		this.wrapper = dom.querySelector("#wrapper");

		this.scene = photoIcon.cloneNode(true);
		this.scene.addEventListener("click", () => {
			this.bridge.setState(this);
		});

		this.wrapper.append(
			plusIcon.cloneNode(true),
			this.scene,
		);


		this.saveButton = saveIcon.cloneNode(true);
		this.saveButton.classList.add("btnSave");
		this.saveButton.addEventListener("click", async () => {
			if (Object.keys(this.lights).length + Object.keys(this.addedLights).length === 0) {
				alert("Scenes cannot be without lights");
			} else {
				Object.assign(this.lights, this.addedLights);
				this.addedLights = [];
				await this.bridge.saveScene(this);
				this._refreshLightsDom();
			}
		});

		this.editButton = editIcon.cloneNode(true);
		this.editButton.classList.add("btnEdit");
		this.editButton.addEventListener("click", async () => {
			this.mode = "changed";
		});

		this.cancelButton = xIcon.cloneNode(true);
		this.cancelButton.classList.add("btnCancel");
		this.cancelButton.addEventListener("click", async () => {
			this.name = this._data.name;
			this.addedLights = [];
			this._refreshLightsDom();
			this.mode = "saved";
		});

		this.deleteButton = trashIcon.cloneNode(true);
		this.deleteButton.classList.add("btnDelete");
		this.deleteButton.addEventListener("click", async () => {
			if (!this.sceneId || confirm(`Are you sure you want to delete Scene "${this.name}"?`)) {
				this.bridge.deleteScene(this);
			}
		});

		this.wrapper.querySelector(".controls").append(
			this.saveButton,
			this.editButton,
			this.cancelButton,
			this.deleteButton
		);


		this.settingsButton = settingsIcon.cloneNode(true);
		this.settingsButton.classList.add("btnSettings");
		this.settingsButton.addEventListener("click", async () => {
			const dialog = new LightSceneDialog(this);
			dialog.title = `Configure Scene "${this.name}"`;

			try {
				const lightstates = await dialog.show();
				this.lightstates = lightstates;
				this.bridge.saveScene(this);
			} catch (ex) {
				// Canceled
			}


		});
		this.wrapper.querySelector(".actions").append(
			this.settingsButton
		);


		this._shadow.append(dom);
	}


	_initDragDrop() {
		this.addEventListener("dragenter", e => {
			this.wrapper.classList.toggle("dragover", true);
			e.preventDefault();
		});
		this.addEventListener("dragleave", e => {
			this.wrapper.classList.toggle("dragover", false);
			e.preventDefault();
		});


		this.addEventListener("dragover", e => {
			e.preventDefault();
		});
		this.addEventListener("drop", e => {
			this.wrapper.classList.toggle("dragover", false);

			const itemtype = e.dataTransfer.getData("type");
			switch (itemtype) {
				case "light": {
					const lightId = e.dataTransfer.getData("light");
					if (!lightId) {
						console.error(`Invalid drop on ${this.sceneId}: No lightId in transferData`)
						return;
					}

					const light = this.bridge.lights[lightId];
					if (this.mode === "new") {
						const scene = this.bridge.newScene();
						scene.addLight(light);
					} else {
						this.addLight(light);
					}

					break;
				}
				default:
					e.preventDefault();
			}
		});
	}


	_refreshLightsDom() {
		const domLights = this._shadow.querySelector(".lights");

		// Clear dom
		while (domLights.hasChildNodes()) {
			domLights.removeChild(domLights.childNodes[0]);
		}


		let added = false;
		const addLightElement = entry => {
			const light = entry[1];

			const lightEntry = document.createElement("span");
			lightEntry.textContent = light.name;
			lightEntry.classList.toggle("added", added);

			const lightRemove = document.createElement("div");
			lightRemove.classList.add("btnRemoveLight");
			lightRemove.classList.toggle("added", added);
			lightRemove.textContent = "-";
			lightRemove.addEventListener("click", () => {
				this.removeLight(light.lightId);
			});

			domLights.append(lightEntry, lightRemove);
		};

		Object.entries(this.lights).sort(sorter.byRoomNameAsc).forEach(addLightElement);

		added = true;
		Object.entries(this.addedLights).forEach(addLightElement);
	}

}
customElements.define("mi-lightscene", LightSceneElement);

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////

