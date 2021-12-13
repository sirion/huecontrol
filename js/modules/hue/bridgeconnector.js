import LightElement from "../elements/lightelement.js";
import LightGroupElement from "../elements/lightgroupelement.js";
import LightSceneElement from "../elements/lightsceneelement.js";


export default class BridgeConnector extends EventTarget {

	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(host, user, protocol = "http://") {
		if (!BridgeConnector.instances[`${host}|${user}`]) {
			super();
			this._init(host, user, protocol);
			BridgeConnector.instances[`${host}|${user}`] = this;
		}
		return BridgeConnector.instances[`${host}|${user}`];
	}

	_init(host, user, protocol) {
		this.host = host;
		this.user = user;
		this.protocol = protocol;

		this.groupedLights = { /* id => bool */};

		// All light and group elements as id => element (not DOM ID)
		this.lights = {};
		this.scenes = {};
		this.scenesUnSaved = [];
		this.groups = {}; // Only contains saved groups, as only they have an ID assigned
		this.groupsUnSaved = []; // Group elements that are not (yet) saved on the bridge

		this._lastRequestCompleted = Promise.resolve();
		this._lastSceneFilled = Promise.resolve();
	}

	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////


	get lightsLoaded() {
		if (!this._lightsFilled) {
			const lightsDataLoaded = this.request("lights");
			this._lightsFilled = this._fillLights(lightsDataLoaded);
		}
		return this._lightsFilled;
	}

	get groupsLoaded() {
		if (!this._groupsFilled) {
			const groupsDataLoaded = this.request("groups");
			this._groupsFilled = this._fillGroups(groupsDataLoaded, this._lightsFilled);
		}
		return this._groupsFilled;
	}

	get scenesLoaded() {
		if (!this._scenesFilled) {
			const scenesDataLoaded = this.request("scenes");
			this._scenesFilled = this.lightsLoaded.then(() => { return this._fillScenes(scenesDataLoaded); });
		}
		return this._scenesFilled;
	}


	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	newGroup() {
		const newGroup = new LightGroupElement(this);
		newGroup.name = "New Group";
		newGroup.description = "New Group Description";
		newGroup.mode = "unsaved";

		this.groupsUnSaved.push(newGroup);

		this.dispatchEvent(new CustomEvent("newGroup", {
			detail: {
				group: newGroup
			}
		}));

		return newGroup;
	}

	newScene() {
		const newScene = new LightSceneElement(this);
		newScene.name = "New Scene";
		newScene.description = "New Scene Description";
		newScene.mode = "unsaved";

		this.scenesUnSaved.push(newScene);

		this.dispatchEvent(new CustomEvent("newScene", {
			detail: {
				scene: newScene
			}
		}));

		return newScene;
	}


	/**
	 * Send a request to the bridge.
	 */
	request(path, method = "GET", payload = undefined) {
		// make sure there are no parallel requests;
		this._lastRequestCompleted = this._request(path, method, payload);
		return this._lastRequestCompleted;
	}

	/**
	 * Sets the state of the given element according to the values in its lightstate property
	 */
	async setState(element, state = null) {
		if (element instanceof LightElement) {
			return this._setLightState(element, state);
		} else if (element instanceof LightGroupElement) {
			return this._setGroupState(element, state);
		} else if (element instanceof LightSceneElement) {
			return this._setSceneState(element);
		} else if (element instanceof Object) {
			return this._setAllLightsState(element);
		} else {
			console.error("setState: Invalid element type provided");
		}
	}


	/**
	 * Update the UI state for all lights groups and scenes that are related to the given element
	 */
	async updateFor(lightElement) {
		// Important: Scenes must be updated last since the information whether it is (partly) on is in the lights
		const elements = [];


		// Find connected Lights
		const lightIds = [];
		if (lightElement instanceof LightSceneElement || lightElement instanceof LightGroupElement) {
			lightIds.push(...Object.keys(lightElement.lights));
			elements.push(...Object.values(lightElement.lights));
			elements.push(lightElement);
		} else if (lightElement instanceof LightElement) {
			elements.push(lightElement);
			lightIds.push(lightElement.lightId);
		}

		lightIds.forEach(lightId => {
			// Find groups containing any of the lights
			for (const groupId in this.groups) {
				if (this.groups[groupId].lights[lightId]) {
					elements.push(this.groups[groupId]);
				}
			}

			// Find room groups containing any of the lights
			for (const roomId in this.rooms) {
				if (this.rooms[roomId].lights[lightId]) {
					elements.push(this.rooms[roomId]);
				}
			}

			// Find scenes containing any of the lights
			for (const sceneId in this.scenes) {
				if (this.scenes[sceneId].lights[lightId] >= 0) {
					elements.push(this.scene[sceneId]);
				}
			}

		});

		for (const e of elements.filter((e, i, a) => a.indexOf(e) === i)) {
			await this.updateElement(e);
		}
	}

	/**
	 * Update data for the given element from the bridge
	 */
	async updateElement(element) {
		if (element instanceof LightSceneElement) {
			const data = await this.request(`scenes/${element.sceneId}`);
			data._id = element.sceneId;
			element.data = data;

		} else if (element instanceof LightGroupElement) {
			const data = await this.request(`groups/${element.groupId}`);
			data._id = element.groupId;
			element.data = data;

		} else if (element instanceof LightElement) {
			const data = await this.request(`lights/${element.lightId}`);
			data._id = element.lightId;
			element.data = data;
		} else {
			console.error(`Invalid element for update: ${element}`);
		}
	}

	/**
	 * Create or update the given scene on the bridge
	 */
	async saveScene(scene) {
		if (!scene.sceneId) {
			await this.createScene(scene);
		} else {
			await this.updateScene(scene);
		}
	}

	/**
	 * Delete the given scene from the bridge
	 */
	async deleteScene(scene) {
		if (!scene.sceneId) {
			this.scenesUnSaved = this.scenesUnSaved.filter(s => s !== scene);
		} else {
			const answer = await this.request(`scenes/${scene.sceneId}`, "DELETE");
			if (answer[0]?.success !== undefined) {
				delete this.scenes[scene.sceneId];
			} else {
				alert("Error from bridge: " + JSON.stringify(answer, 0, 4));
			}
		}
		this._fireConfigChange();
	}

	/**
	 * Creates the given scene on the bridge with its lightstates.
	 * This should not be used with scenes that already have a sceneId, otherwise they will be
	 * copied and the original scene will remain on the bridge and be shown after the next refresh.
	 */
	async createScene(scene) {
		// Unsaved new scene
		const payload = {
			name: scene.name,
			lights: Object.keys(scene.lights),
			recycle: false
		};
		const answer = await this.request("scenes", "POST" , payload);
		const sceneId = answer[0]?.success?.id;
		if (sceneId !== undefined) {
			const data = await this.request(`scenes/${sceneId}`);
			data._id = sceneId;

			for (const lightId in scene.lights) {
				await this.request(`scenes/${sceneId}/lights/${lightId}/state`, "PUT", { "on": true });
			}
			scene.mode = "saved";
			scene.data = data;

			this.scenesUnSaved = this.scenesUnSaved.filter(g => g !== scene);
			this.scenes[sceneId] = scene;
			this._fireConfigChange();

		} else {
			alert("Error from bridge: " + JSON.stringify(answer, 0, 4));
		}
	}

	/**
	 * Updates the scene data and lightstates of the given scene on the bridge.
	 */
	async updateScene(scene) {
		// Existing scene
		const payload = {
			name: scene.name,
			lights: Object.keys(scene.lights),
			storelightstate: true
		};
		const answer = await this.request(`scenes/${scene.sceneId}`, "PUT" , payload);
		if (!answer[0]?.success) {
			alert("Error from bridge: " + JSON.stringify(answer, 0, 4));
		} else {
			const lightstates = await scene.lightstatesReady;
			for (const lightId in lightstates) {
				await this.request(`scenes/${scene.sceneId}/lights/${lightId}/state`, "PUT", lightstates[lightId]);
			}
		}
		scene.mode = "saved";
		this._fireConfigChange();
	}



	/**
	 * Deletes the group from the bridge based on its groupId.
	 */
	async deleteGroup(group) {
		if (!group.groupId) {
			this.groupsUnSaved = this.groupsUnSaved.filter(g => g !== group);
		} else {
			const answer = await this.request(`groups/${group.groupId}`, "DELETE");
			if (answer[0]?.success !== undefined) {
				delete this.groups[group.groupId];
			} else {
				alert("Error from bridge: " + JSON.stringify(answer, 0, 4));
			}
		}
		this._fireConfigChange();
	}

	/**
	 * Creates or updates the given group based on whether it has a groupId.
	 */
	async saveGroup(group) {
		if (!group.groupId) {
			await this.createGroup(group);
		} else {
			await this.updateGroup(group);
		}
	}

	/**
	 * Creates a new group on the bridge.
	 */
	async createGroup(group) {
		// Unsaved new group
		const payload = {
			name: group.name,
			lights: Object.keys(group.lights),
			type: "LightGroup"
		};
		const answer = await this.request("groups", "POST" , payload);
		const id = answer[0]?.success?.id;
		if (id !== undefined) {
			const data = await this.request(`groups/${id}`);
			data._id = id;
			group.mode = "saved";
			group.data = data;

			this.groupsUnSaved = this.groupsUnSaved.filter(g => g !== group);
			this.groups[id] = group;
			this._fireConfigChange();
		} else {
			alert("Error from bridge: " + JSON.stringify(answer, 0, 4));
		}
	}

	/**
	 * Updates an existing group on the bridge.
	 */
	async updateGroup(group) {
		// Existing group
		const payload = {
			name: group.name,
			lights: Object.keys(group.lights)
		};
		const answer = await this.request(`groups/${group.groupId}`, "PUT" , payload);
		if (!answer[0]?.success) {
			alert("Error from bridge: " + JSON.stringify(answer, 0, 4));
		}
		group.mode = "saved";
		this._fireConfigChange();
	}


	/**
	 * Updates the light name on the bridge.
	 */
	async updateLight(light) {
		const payload = {
			name: light.name,
		};
		const answer = await this.request(`lights/${light.lightId}`, "PUT" , payload);
		if (!answer[0]?.success) {
			alert("Error from bridge: " + JSON.stringify(answer, 0, 4));
		}
	}

	/**
	 * Queries all scenes in the bridge to find out how many lightstates of the maximum 2048 are
	 * already used. Has an optional callback argument, so an update can be shown to the user while
	 * querying the bridge.
	 */
	async queryLightstateInformation(updateCallback = (/* numStates, maxLightStates, currentScene, numScenes */) => {}) {
		// Max Lightscenes
		const maxLightStates = 2048;

		const scenesData = await this.request(`scenes`);

		// TODO: Change this.scenes to promises, so we only refresh the ones we do not know.

		let numLightStates = 0;
		let i = 1;
		let numScenes = Object.keys(scenesData).length;

		for (const sceneId in scenesData) {
			const data = await this.request(`scenes/${sceneId}`);
			numLightStates += Object.keys(data.lightstates).length;
			updateCallback(numLightStates, maxLightStates, i, numScenes);
			i++;
		}


		return {
			max: 2048,
			num: numLightStates
		};
	}

	/**
	 * Reloads all data from the bridge
	 */
	async reload() {
		this._lightsFilled = null;
		this._groupsFilled = null;
		this._scenesFilled = null;

		this.dataLoaded = Promise.all([
			this.lightsLoaded, // Side-effect: refresh from bridge
			this.groupsLoaded, // Side-effect: refresh from bridge
			this.scenesLoaded // Side-effect: refresh from bridge
		]);

		await this.dataLoaded;
		this._fireLoad();
	}


	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	async _request(path, method = "GET", payload = undefined) {
		const url = `${this.protocol}${this.host}/api/${this.user}/${path}`;

		const resp = await fetch(url, {
			method: method,
			body: payload ? JSON.stringify(payload) : undefined,
		});

		return resp.json();
	}

	async _setLightState(light, state = null) {
		let data = state || light.data.state;
		const payload = {
			// Accepted properties
			on: data.on,
			bri: data.bri,
			hue: data.hue,
			sat: data.sat,
			ct: data.ct,
			xy: data.xy,
			alert: data.alert,
			effect: data.effect,
			transitiontime: data.transitiontime,
			bri_inc: data.bri_inc,
			sat_inc: data.sat_inc,
			hue_inc: data.hue_inc,
			ct_inc: data.ct_inc,
			xy_inc: data.xy_inc,
		};
		await this.request(`lights/${light.lightId}/state`, "PUT", payload);
		data = await this.request(`lights/${light.lightId}`);
		light.data = data;

		await this.updateFor(light);
	}

	async _setGroupState(group, state = null) {
		let data = state || group.data.action;
		const payload = {
			// Accepted properties
			on: data.on,
			bri: data.bri,
			hue: data.hue,
			sat: data.sat,
			ct: data.ct,
			xy: data.xy,
			alert: data.alert,
			effect: data.effect,
			transitiontime: data.transitiontime,
			bri_inc: data.bri_inc,
			sat_inc: data.sat_inc,
			hue_inc: data.hue_inc,
			ct_inc: data.ct_inc,
			xy_inc: data.xy_inc,
		};

		await this.request(`groups/${group.groupId}/action`, "PUT", payload);
		await this.updateFor(group);
	}

	async _setSceneState(scene) {
		const payload = {
			scene: scene.sceneId
		};
		await this.request(`groups/0/action`, "PUT", payload);

		await this.updateFor(scene);
	}

	async _setAllLightsState(payload) {
		await this.request(`groups/0/action`, "PUT", payload);
		// TODO: Update everything?
	}

	async _fillLights(lightsDataLoaded) {
		Object.entries(await lightsDataLoaded).forEach(entry => {
			const [ id, lightData ] = entry;
			lightData._id = id;

			if (!this.lights[id]) {
				const light = new LightElement(this);
				this.lights[id] = light;
			}

			this.lights[id].data = lightData;
		});
	}

	async _fillGroups(groupsDataLoaded, precondition) {
		await precondition;
		Object.entries(await groupsDataLoaded).forEach(entry => {
			const [ id, groupData ] = entry;
			groupData._id = id;

			if (!this.groups[id]) {
				const group = new LightGroupElement(this);
				group.mode = "saved";
				this.groups[id] = group;
			}

			this.groups[id].data = groupData;

			for (const lightId in this.groups[id].lights) {
				this.groupedLights[lightId] = true;
				if (groupData.type === "Room") {
					this.lights[lightId].room = groupData.name;
				}
			}
		});
	}

	async _fillScenes(scenesDataLoaded) {
		Object.entries(await scenesDataLoaded).forEach(entry => {
			const [ id, sceneData ] = entry;
			sceneData._id = id;

			if (!this.scenes[id]) {
				const scene = new LightSceneElement(this);
				scene.data = sceneData;
				scene.mode = "saved";
				this.scenes[id] = scene;
			}
		});
		return this.scenes;
	}

	_fireConfigChange() {
		this.dispatchEvent(new CustomEvent("configChange" /*, { detail: {} } */));
	}

	_fireLoad() {
		this.dispatchEvent(new CustomEvent("load" /*, { detail: {} } */));
	}
}

///////////////////////////////////////// Static Properties ////////////////////////////////////////

BridgeConnector.instances = {};

////////////////////////////////////////// Static Methods //////////////////////////////////////////

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////
