import LightElement from "./lightelement.js";
import LightGroupElement from "./lightgroupelement.js";
import LightSceneElement from "./lightsceneelement.js";
import sorter from "../utils/sorter.js";


// Removes all children of type removeElementType from the given element
function clearDom(element, removeElementType) {
	for (const el of Array.from(element.children)) {
		if (el instanceof removeElementType) {
			element.removeChild(el);
		}
	}
}

const template = document.createElement("template");
template.innerHTML = `
<style>
	:host {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		min-width: 100%;
		min-height: 100%;
		color: white;

		display: flex;
		align-content: center;
		justify-content: center;
		gap: 1rem;

		animation-duration: 1s;
		animation-name: animate-fade;
		animation-delay: 1s;
		animation-fill-mode: backwards;
	}

	@keyframes animate-fade {
		0% { opacity: 0; }
		100% { opacity: 1; }
	}

	.section {
		position: relative;
		background-color: #111;
		padding: 0.5rem;
		overflow: auto;
		border: 1px solid #333;
	}

	.section > * {
		transition: opacity 100ms ease;
	}

	.section.busy > * {
		visibility: hidden;
		opacity: 0;
	}
	.section.busy:after {
		position: absolute;
		top: 2rem;
		width: 100%;
		display: flex;
		justify-content: center;
		content: "LOADING...";
	}

	.collapsible {
		transition: width 350ms ease;
	}

	.collapsible .btnExpand:before {
		content: "-";
	}
	.collapsible.collapsed .btnExpand:before {
		content: "+";
		font-weight: bold;
		color: #fff;
	}

	.collapsible.collapsed.section {
		width: 1rem;
	}
	.collapsible.collapsed {
		height: auto;
	}

	.collapsible.collapsed > *:not(.header):not(.subheader) {
		display: none;
	}
	.collapsible.collapsed > .header {
		transform: rotate(90deg);
	}

	.itemlist {
		padding: 0;
		width: 100%;
		overflow: hidden;
	}

	.itemlist > * {
		margin: 0.5rem 0;
	}

	mi-light, mi-lightgroup, mi-lightscene {
		border: 1px dashed #666;
	}

	.grouped {
		color: lightgrey;
		background-color: darkgrey;
	}

	.link {
		color: #ccc;
		text-decoration: underline;
		cursor: pointer;
	}

	.statusList {
	}

	.table2 {
		display: grid;
		grid-template-columns: auto auto;
		grid-auto-rows: 1.25em;
		align-items: center;
		gap: 1em;
		font-size: 0.75em;
		color: #aaa;
	}

	.header, .subheader {
		display: grid;
		grid-template-columns: 1rem auto;
		grid-auto-rows: 1fr;
		gap: 0.5rem;
	}

	.subheader {
		border: 0px solid transparent;
		font-size: 0.75em;
		opacity: 0.85;
		text-align: end;
		padding: 0.5rem;
		background-color: #222;
	}

	.btnExpand {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #333;
		cursor: pointer;
	}

	.btnExpand:hover {
		background-color: #666;
	}

	.settingsList > .table2 {
		grid-template-columns: 1fr auto;
	}

	.btn1 {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		text-align: center;
		line-height: 1rem;
		margin-left: 0.25rem;
		border: 1px solid #ccc;
		background-color: #333;
		cursor: pointer;
		user-select: none;
	}

	.btn1:hover {
		background-color: #666;
	}

	#btnRefresh {
		width: 1.5rem;
		height: 1.5rem;
	}

</style>
<section id="scenes" class="section collapsible busy">
	<div class="header">
		<div class="btnExpand"></div><label>Scenes</label>
	</div>
	<div id="scenesList" class="itemlist collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Existing Scenes</label>
		</div>
	</div>
	<div id="scenesListUnsaved" class="itemlist collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Create New Scene</label>
		</div>
	</div>
</section>
<section id="groups" class="section collapsible busy">
	<div class="header">
		<div class="btnExpand"></div><label>Groups</label>
	</div>
	<div id="groupsList" class="itemlist collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Existing Groups</label>
		</div>
	</div>
	<div id="groupsListUnsaved" class="itemlist collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Create New Group</label>
		</div>
	</div>
</section>
<section id="rooms" class="section collapsible busy">
	<div class="header">
		<div class="btnExpand"></div><label>Rooms</label>
	</div>
	<div id="roomsList" class="itemlist collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Existing Rooms</label>
		</div>
	</div>
	<div id="roomsListUnsaved" class="itemlist collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Create New Room</label>
		</div>
	</div>
</section>
<section id="lights" class="section collapsible busy">
	<div class="header">
		<div class="btnExpand"></div><label>Lights</label>
	</div>
	<div id="lightsListGrouped" class="itemlist lightsList collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Assigned</label>
		</div>
	</div>
	<div id="lightsListUngrouped" class="itemlist lightsList collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Unassigned</label>
		</div>
	</div>
</section>
<section id="information" class="section collapsible busy">
	<div class="header">
		<div class="btnExpand"></div><label>Information</label>
	</div>
	<div id="status" class="itemlist statusList collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Status</label>
		</div>
		<div class="table2">
			<label>Configuration:</label><span id="configModeDisplay" class="link"></span>
			<label>LightStates:</label><span id="configLightStates" class="link">[check]</span>
		</div>
	</div>
	<div id="controls" class="itemlist settingsList collapsible">
		<div class="subheader">
			<div class="btnExpand"></div><label>Settings</label>
		</div>
		<div class="table2">
			<label>Refresh now:</label>
			<button id="btnRefresh">⟳</button>
			<label>Zoom:</label>
			<div>
				<div id="zoomReset" class="btn1">0</div>
				<div id="zoomIn" class="btn1">+</div>
				<div id="zoomOut" class="btn1">-</div>
			</div>
			<label>Show all Scenes</label>
			<div>
				<input id="showAllScenes" type="checkbox">
			</div>
		</div>
	</div>
</section>
`;

export default class HomeLightingConfiguration extends HTMLElement {

	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(bridge, config) {
		super();

		this.config = config;

		this.bridge = bridge;
		this.bridge.addEventListener("newScene", this._onNewScene.bind(this));
		this.bridge.addEventListener("newGroup", this._onNewGroup.bind(this));
		this.bridge.addEventListener("configChange", this._refreshLists.bind(this));

		// Init shdow DOM template
		this._shadow = this.attachShadow({ mode: 'open' });
		this._shadow.appendChild(template.content.cloneNode(true));


		this.configMode = this.config.mode;
		this.collapsedIds = this.config.get("collapsedIds", true) || [];
		this._init();
		this._refresh();
	}

	//////////////////////////////////////// Overridden Methods ////////////////////////////////////////
	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get configMode() {
		return this.config.mode;
	}

	set configMode(value) {
		this._shadow.querySelector("#configModeDisplay").textContent = value;
	}

	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	async refresh() {
		clearInterval(this._refreshInterval);
		this._refreshInterval = setInterval(() => {
			if (document.visibilityState === 'visible') {
				this._refresh();
			}
		}, this.config.refreshInterval);
		await this._refresh();
	}




	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	_init() {
		this._initCreateElements();
		this._initAttachEvents();
	}

	_onNewScene(e) {
		const domSceneListNew = this._shadow.querySelector("#scenesListUnsaved");
		domSceneListNew.append(e.detail.scene);
	}

	_onNewGroup(e) {
		const domGroupListNew = this._shadow.querySelector("#groupsListUnsaved");
		domGroupListNew.append(e.detail.group);
	}

	async _refresh() {
		await this.bridge.reload();
		this._refreshLists();
	}


	async _fillLightStatesStatus() {
		const domLightStates = this._shadow.querySelector("#configLightStates");

		domLightStates.textContent = "0%";

		const statesInfo = await this.bridge.queryLightstateInformation((numStates, maxLightStates, currentScene, numScenes) => {
			domLightStates.textContent = Math.round(100 * currentScene / numScenes) + "%";
		});

		const percent = Math.round(100 * statesInfo.num / statesInfo.max);
		domLightStates.textContent = `${percent} % used`;
		domLightStates.setAttribute("title", `${statesInfo.num} of ${statesInfo.max}`);
	}



	async _fillSceneLightstates(allScenes) {
		for (const sceneId in this.scenes) {
			const scene = this.scenes[sceneId];
			if (allScenes || scene.owner === this.config.user) {
				const data = await this.request(`scenes/${scene.sceneId}`);
				scene.data = data;
			}
		}
	}

	_sortByRoom(lightA, lightB) {
		if (lightA.room == lightB.room) {
			return 0;
		}
		return lightA.room > lightB.room ? 1 : -1;
	}

	_initCreateElements() {
		const newScene = new LightSceneElement(this.bridge);
		newScene.id = "sceneNew";
		newScene.mode = "new";
		newScene.name = "New Scene";
		this._shadow.querySelector("#scenes").append(newScene);

		const newGroup = new LightGroupElement(this.bridge);
		newGroup.id = "groupNew";
		newGroup.mode = "new";
		newGroup.name = "New Group";
		this._shadow.querySelector("#groups").append(newGroup);

		const newRoom = new LightGroupElement(this.bridge);
		newRoom.id = "roomNew";
		newRoom.mode = "new";
		newRoom.name = "New Room";
		this._shadow.querySelector("#rooms").append(newRoom);
	}

	_initAttachEvents() {
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === 'visible') {
				this._refresh();
			}
		});


		this._shadow.querySelector("#btnRefresh").addEventListener("click", () => {
			this._refresh();
		});

		this._shadow.querySelector("#showAllScenes").addEventListener("change", () => {
			this._shadow.querySelector("#scenes").classList.add("busy");
			this._refreshLists();
		});

		this._shadow.querySelector("#configModeDisplay").addEventListener("click", () => {
			this.config.showDialog();
		});

		this._shadow.querySelector("#zoomIn").addEventListener("click", () => {
			document.documentElement.style.fontSize = (parseInt(document.documentElement.style.fontSize || "16", 10) + 1) + "px";
		});

		this._shadow.querySelector("#zoomOut").addEventListener("click", () => {
			document.documentElement.style.fontSize = (parseInt(document.documentElement.style.fontSize || "16", 10) - 1) + "px";
		});

		this._shadow.querySelector("#zoomReset").addEventListener("click", () => {
			document.documentElement.style.fontSize = "16px";
		});

		const expandButtons = this._shadow.querySelectorAll(".btnExpand");
		for (let i = 0; i < expandButtons.length; i++) {
			expandButtons[i].addEventListener("click", this._switchSectionExpand.bind(this));
		}

		this._shadow.querySelector("#configLightStates").addEventListener("click", this._fillLightStatesStatus.bind(this));

	}

	_switchSectionExpand(e) {
		let section = e.target.parentElement;
		while (section && !section.classList.contains("collapsible")) {
			section = section.parentElement;
		}
		if (!section) {
			console.error("Could not find collapsible parent element");
			return;
		}

		const collapsed = section.classList.toggle("collapsed");
		if (collapsed) {
			this.collapsedIds.push(section.id);
		} else {
			this.collapsedIds = this.collapsedIds.filter(id => id !== section.id);
		}
		this.config.set("collapsedIds", this.collapsedIds, true);
	}

	async _refreshLists() {
		// Set collapsed State
		for (let i = 0; i < this.collapsedIds.length; i++) {
			const id = this.collapsedIds[i];
			const element = this._shadow.querySelector(`#${id}`);
			if (element) {
				element.classList.toggle("collapsed", true);
			} else {
				this.collapsedIds.splice(i, 1);
				i--;
			}
		}


		this._shadow.querySelector("#information").classList.remove("busy");




		Promise.all([
			this.bridge.lightsLoaded,
			this.bridge.groupsLoaded,
		]).then(() => {
			this._shadow.querySelector("#lights").classList.remove("busy");
			const domLightsListGrouped = this._shadow.querySelector("#lightsListGrouped");
			const domLightsListUngrouped = this._shadow.querySelector("#lightsListUngrouped");
			clearDom(domLightsListGrouped, LightElement);
			clearDom(domLightsListUngrouped, LightElement);

			Object.values(this.bridge.lights)
				.sort(sorter.byRoomAsc)
				.forEach(light => {
					if (this.bridge.groupedLights[light.lightId]) {
						domLightsListGrouped.append(light);
					} else {
						domLightsListUngrouped.append(light);
					}
				});

		});


		this.bridge.groupsLoaded.then(() => {
			const groups = Object.values(this.bridge.groups).sort(sorter.byNameAsc);
			const groupsUnsaved = this.bridge.groupsUnSaved.sort(sorter.byNameAsc);

			this._shadow.querySelector("#groups").classList.remove("busy");
			const domGroupsList = this._shadow.querySelector("#groupsList");
			clearDom(domGroupsList, LightGroupElement);
			groups.forEach(group => {
				if (!group.isRoom) {
					domGroupsList.append(group);
				}
			});

			const domGroupsListUnsaved = this._shadow.querySelector("#groupsListUnsaved");
			clearDom(domGroupsListUnsaved, LightGroupElement);
			groupsUnsaved.forEach(group => {
				if (!group.isRoom) {
					domGroupsListUnsaved.append(group);
				}
			});

			this._shadow.querySelector("#rooms").classList.remove("busy");
			const domRoomsList = this._shadow.querySelector("#roomsList");
			clearDom(domRoomsList, LightGroupElement);
			groups.forEach(group => {
				if (group.isRoom) {
					domRoomsList.append(group);
				}
			});
		});


		this.bridge.scenesLoaded.then(async () => {
			const showAllScenes = this._shadow.querySelector("#showAllScenes").checked;
			await this._fillSceneLightstates(showAllScenes);

			this._shadow.querySelector("#scenes").classList.remove("busy");
			const domScenesList = this._shadow.querySelector("#scenesList");
			const domScenesListUnsaved = this._shadow.querySelector("#scenesListUnsaved");
			clearDom(domScenesList, LightSceneElement);
			clearDom(domScenesListUnsaved, LightSceneElement);

			Object.values(this.bridge.scenes)
			.sort(sorter.byNameAsc)
			.forEach(scene => {
				if (showAllScenes || scene.owner === this.config.user) {
					domScenesList.append(scene);
				}
			});

			this.bridge.scenesUnSaved.forEach(scene => {
				domScenesListUnsaved.append(scene);
			});
		});
	}


	///////////////////////////////////////// Hidden Functions /////////////////////////////////////////

}
customElements.define("mi-homelightingconfiguration", HomeLightingConfiguration);
