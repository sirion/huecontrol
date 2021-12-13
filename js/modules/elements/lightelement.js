import lightIcon from "../htmltemplates/icons/light.js";
import saveIcon from "../htmltemplates/icons/save.js";
// import plusIcon from "../htmltemplates/icons/plus.js";
import editIcon from "../htmltemplates/icons/edit.js";
import xIcon from "../htmltemplates/icons/x.js";


const template = document.createElement("template");
template.innerHTML = `
<style>
	:host {
		display: grid;
		grid-template-columns: 2rem 1fr 1fr 1rem;
		grid-template-rows: 1fr 1fr auto;
		column-gap: 0.5rem;
		align-items: center;
		justify-items: start;
		user-select: none;
		cursor: grab;
		gap: 0 1rem;
	}

	.icon.light {
		grid-column: 1 / 1;
		grid-row: 1 / 4;
		display: flex;
		justify-content: center;
		align-items: center;

		width: 100%;
		height: 100%;

		cursor: pointer;
	}

	:host(.on) .icon.light {
		fill: #da6;
	}

	.icon:hover {
		background-color: #333;
	}

	.icon {
		display: none;
		fill: #666;
	}

	:host(.new) .icon.plus {
		display: block;
	}

	:host(.saved) .controls .btnEdit,
	:host(.changed) .controls .btnDelete {
		display: block;
	}

	:host(.changed) .controls .btnSave,
	:host(.changed) .controls .btnCancel,
	:host(.changed) .controls .btnDelete {
		display: block;
	}

	.name, .room {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.name {
		grid-column: 2 / 4;
		grid-row: 1 / 1;
	}

	.room {
		font-size: 0.75em;
		grid-column: 2 / 4;
		grid-row: 2 / 2;
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
		cursor: pointer;
	}

	.controls > *:hover {
		fill: #fff;
	}

	:host(.changed) .name {
		background-color: #ccc;
		color: black;
		border: 1px solid white;
	}

</style>
<div class="name"></div>
<div class="room"></div>
<div class="controls"></div>
`;
export default class LightElement extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(bridge) {
		super();
		this._id = null;
		this._data = {};
		this._room = {};

		this.bridge = bridge;

		// Init shdow DOM template
		this._shadow = this.attachShadow({ mode: 'open' });
		this._shadow.appendChild(template.content.cloneNode(true));

		this.lightIcon = lightIcon.cloneNode(true);
		this.lightIcon.id = "lightIcon";
		this.lightIcon.addEventListener("click", async () => {
			this.data.state.on = !this.data.state.on;
			this.bridge.setState(this);
		});

		this.saveButton = saveIcon.cloneNode(true);
		this.saveButton.classList.add("btnSave");
		this.saveButton.addEventListener("click", async () => {
			delete this._name;
			this.bridge.updateLight(this);
			this.mode = "saved";
		});

		this.editButton = editIcon.cloneNode(true);
		this.editButton.classList.add("btnEdit");
		this.editButton.addEventListener("click", async () => {
			this._name = this.name;
			this.mode = "changed";
			const name = this._shadow.querySelector(".name");
			window.getSelection().selectAllChildren(name);
			//name.focus();
		});

		this.cancelButton = xIcon.cloneNode(true);
		this.cancelButton.classList.add("btnCancel");
		this.cancelButton.addEventListener("click", async () => {
			this.name = this._name;
			this.mode = "saved";
		});

		this._shadow.querySelector(".controls").append(
			this.saveButton, this.editButton, this.cancelButton
		);

		this._shadow.append(this.lightIcon);

		this.mode = "saved";

		this.draggable = true;
		this.addEventListener("dragstart", e => {
			e.dataTransfer.setData("type", "light");
			e.dataTransfer.setData("light", this.lightId);
		});
	}

	////////////////////////////////////// Custom Element Methods //////////////////////////////////////

	connectedCallback() {}

	disconnectedCallback() {}

	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}

	static get observedAttributes() {
		return ["name", "room", "state"];
	}


	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get data() {
		return this._data;
	}

	set data(value) {
		if (value._id) {
			this._id = value._id;
		}
		this._data = value;

		this.name = this._data.name;
		this.on = this._data?.state?.on;
		this.colormode = value.colormode;
	}

	get lightId() {
		return this._id;
	}

	get on() {
		return this.classList.contains("on");
	}

	set on(value) {
		this.classList.toggle("on", !!value);
	}

	get name() {
		return this._shadow.querySelector(".name").textContent;
	}

	set name(value) {
		this._shadow.querySelector(".name").textContent = value;
	}

	get room() {
		return this._shadow.querySelector(".room").textContent;
	}

	set room(value) {
		this._shadow.querySelector(".room").textContent = value;
	}

	get type() {
		return this._data.type;
	}

	get state() {
		return this._data.state;
	}

	set mode(value) {
		this._mode = value;
		this.classList.toggle("changed", value === "changed");
		this.classList.toggle("saved", value === "saved");

		this._shadow.querySelector(".name").contentEditable = value === "changed" ? "true" : "false";
	}

	get mode() {
		return this._mode;
	}

	////////////////////////////////////////// Public Methods //////////////////////////////////////////
	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

}
customElements.define("mi-light", LightElement);

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////

