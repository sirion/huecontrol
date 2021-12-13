import BridgeConnector from "../hue/bridgeconnector.js";
import Configuration from "../configuration.js";
import HomeLightingConfiguration from "./homelightingconfiguration.js";
import SceneTiles from "./scenetiles.js";
import configurationIcon from "../htmltemplates/icons/settings.js";

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

	mi-homelightingconfiguration, mi-scenetiles {
		opacity: 0;
		transition: opacity 750ms ease
	}

	#wrapper {
		height: 100%;
		width: 100%;
	}

	#wrapper.modeConfig mi-homelightingconfiguration {
		opacity: 1;
	}
	#wrapper.modeConfig mi-scenetiles {
		opacity: 0;
	}

	#wrapper.modeControl mi-homelightingconfiguration {
		opacity: 0;
	}
	#wrapper.modeControl mi-scenetiles {
		opacity: 1;
	}

	#wrapper .icon.settings {
		position: absolute;
		right: 1vmin;
		bottom: 1vmin;
		width: 5vmin;
		height: 5vmin;
		fill: #333;
		cursor: pointer;
		border-radius: 5vmin;
		z-index: 10;
	}

	#wrapper .icon.settings:hover {
		background-color: #222;
		fill: #777;
	}

</style>
<div id="wrapper">
</div>`;
export default class HomeLighting extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor() {
		super();

		// Init shdow DOM template
		this.wrapper = null;
		this._initDom();


		(async () => {
			this.config = new Configuration();
			await this.config.ready;

			this.bridge = new BridgeConnector(this.config.host, this.config.user, this.config.protocol)
			this.bridge.addEventListener("configChange", this.config.save.bind(this.config));
			this.mode = HomeLighting.MODE_CONTROL;
		})();
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
		return ["mode"];
	}

	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get mode() {
		return this._mode;
	}

	set mode(value) {
		if (value === this._mode) {
			return;
		}
		this.bridge.reload();

		this._mode = value;

		if (this._mode === HomeLighting.MODE_CONFIG) {
			if (!this.domConfig) {
				this.domConfig = new HomeLightingConfiguration(this.bridge, this.config);
				this.wrapper.append(this.domConfig);
			}
		} else if (this._mode === HomeLighting.MODE_CONTROL) {
			if (!this.domControl) {
				this.domControl = new SceneTiles(this.bridge, this.config);
				this.wrapper.append(this.domControl);
			}
		}

		this.wrapper.classList.toggle("modeConfig", this._mode === HomeLighting.MODE_CONFIG);
		this.wrapper.classList.toggle("modeControl", this._mode === HomeLighting.MODE_CONTROL);

		setTimeout(() => {
			if (this.domConfig) {
				this.domConfig.style.display = this._mode === HomeLighting.MODE_CONFIG ? "" : "none";
			}
			if (this.domControl) {
				this.domControl.style.display = this._mode === HomeLighting.MODE_CONTROL ? "" : "none";
			}
		}, 1000);

	}


	////////////////////////////////////////// Public Methods //////////////////////////////////////////
	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	_initDom() {
		this._shadow = this.attachShadow({ mode: 'open' });
		const dom = template.content.cloneNode(true);
		this.wrapper = dom.querySelector("#wrapper");

		const configIcon = configurationIcon.cloneNode(true);
		configIcon.addEventListener("click", () => {
			this.mode = this.mode === HomeLighting.MODE_CONTROL ? HomeLighting.MODE_CONFIG : HomeLighting.MODE_CONTROL;
		});
		this.wrapper.append(configIcon);

		this._shadow.append(dom);
	}

}
customElements.define("mi-homelighting", HomeLighting);

///////////////////////////////////////// Static Properties ////////////////////////////////////////

HomeLighting.MODE_CONFIG = "config";
HomeLighting.MODE_CONTROL = "control";


///////////////////////////////////////// Hidden Functions /////////////////////////////////////////
