import saveIcon from "../htmltemplates/icons/save.js";
import plusIcon from "../htmltemplates/icons/plus.js";
import groupIcon from "../htmltemplates/icons/group.js";
import editIcon from "../htmltemplates/icons/edit.js";
import xIcon from "../htmltemplates/icons/x.js";
import trashIcon from "../htmltemplates/icons/trash.js";
import roomIcon from "../htmltemplates/icons/room.js";

const template = document.createElement("template");
template.innerHTML = `
<style>

	:host {
		display: block;
	}

	#wrapper {
		display: grid;
		grid-template-columns: 2rem 1fr 1fr 1.5rem;
		grid-template-rows: 1.25em auto;
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

	.icon.plus, .icon.group, icon.room {
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

	.room .icon.plus,
	.room .icon.group {
		display: none;
	}

	.on .icon.room,
	.on .icon.group {
		fill: #da6;
	}

	.any_on .icon.room,
	.any_on .icon.group {
		fill: #753;
	}

	.room .icon.room {
		display: block;
	}

	.new .icon.plus {
		display: block;
	}

	.unsaved:not(.room) .icon.group,
	.changed:not(.room) .icon.group {
		display: block;
		fill: #f00;
	}

	.saved:not(.room) .icon.group {
		display: block;
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

	.lights > * {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
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

	#wrapper.unsaved .btnRemoveLight,
	#wrapper.changed .btnRemoveLight {
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

	.controls > * {
		display: none;
		cursor: pointer;
	}

	.controls > *:hover {
		fill: #fff;
	}

	#wrapper.unsaved .controls .btnSave,
	#wrapper.unsaved .controls .btnDelete {
		display: block;
	}

	#wrapper.saved .controls .btnDelete,
	#wrapper.saved .controls .btnEdit {
		display: block;
	}

	#wrapper.changed .controls .btnSave,
	#wrapper.changed .controls .btnCancel,
	#wrapper.changed .controls .btnDelete {
		display: block;
	}

</style>
<div id="wrapper">
	<div class="name"></div>
	<div class="lights"></div>
	<div class="controls">
</div>
</div>`;
export default class LightGroupElement extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(bridge) {
		super();

		this.bridge = bridge;

		this.groupId = null;
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
			this.groupId = null;
			this._data = {};
			return;
		}

		if (value._id) {
			this.groupId = value._id;
		}
		this._data = value;

		// Remove prefix
		this.name = value.name;

		this.any_on = !!value.state?.any_on;
		this.on = !!value.state?.all_on;

		this.isRoom = value.type === "Room";

		value.lights.forEach(lightId => {
			this.lights[lightId] = this.bridge.lights[lightId];
		});
		this._refreshLightsDom();
	}

	get isRoom() {
		return this.wrapper.classList.contains("room");
	}

	set isRoom(value) {
		this.wrapper.classList.toggle("room", !!value);
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

	get on() {
		return !!this._data?.state?.all_on
	}

	set on(value) {
		if (this._data?.state && this.on != value) {
			this._data.state.all_on = !!value;
			this._data.action.on = !!value;
		}
		this.wrapper.classList.toggle("on", !!value);
	}

	get any_on() {
		return !!this._data?.state?.any_on
	}

	set any_on(value) {
		if (this._data?.state && this.on != value) {
			this._data.state.any_on = !!value;
		}

		this.wrapper.classList.toggle("any_on", !!value && !this.on);
	}



	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	addLight(light) {
		if (this.lights[light.lightId] || this.addedLights[light.lightId]) {
			return;
		}

		this.addedLights[light.lightId] = light;

		if (this.groupId) {
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

		if (this.groupId) {
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

		this.groupIcon = groupIcon.cloneNode(true);
		this.groupIcon.addEventListener("click", () => {
			this.on = !this.on;
			this.bridge.setState(this);
		});

		this.roomIcon = roomIcon.cloneNode(true);
		this.roomIcon.addEventListener("click", () => {
			this.on = !this.on;
			this.bridge.setState(this);
		});

		this.wrapper.append(
			plusIcon.cloneNode(true),
			this.groupIcon,
			this.roomIcon,
		);


		this.saveButton = saveIcon.cloneNode(true);
		this.saveButton.classList.add("btnSave");
		this.saveButton.addEventListener("click", async () => {
			if (Object.keys(this.lights).length + Object.keys(this.addedLights).length === 0) {
				alert("Groups or Rooms cannot be without lights");
			} else {
				Object.assign(this.lights, this.addedLights);
				this.addedLights = [];
				this.bridge.saveGroup(this);
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
			if (!this.groupId || confirm(`Are you sure you want to delete Group/Room "${this.name}"?`)) {
				this.bridge.deleteGroup(this);
			}
		});

		this.wrapper.querySelector(".controls").append(
			this.saveButton,
			this.editButton,
			this.cancelButton,
			this.deleteButton
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
						console.error(`Invalid drop on ${this.groupId}: No lightId in transferData`)
						return;
					}

					const light = this.bridge.lights[lightId];

					if (this.mode === "new") {
						const group = this.bridge.newGroup();
						group.addLight(light);
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

		Object.entries(this.lights).forEach(addLightElement);

		added = true;
		Object.entries(this.addedLights).forEach(addLightElement);
	}

}
customElements.define("mi-lightgroup", LightGroupElement);

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////

