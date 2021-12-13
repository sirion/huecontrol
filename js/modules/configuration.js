import Popup from "./elements/popup.js";

export default class Configuration {

	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor() {
		// Singleton
		if (Configuration._instance) {
			return Configuration._instance;
		}

		Configuration._instance = this;

		this.mode = "";
		this.data = {
			serviceUrl: null,
			user: null,
			host: null,
			protocol: "http://",
			_local: {},
		};

		this.ready = this._read();

		// this.user = "QXAFsrd-SX5XeSZ91PtpxRAlL-A6ZzuQpPXvMJHM";
		// this.host = "192.168.1.137";
		// this.protocol = "http://";
	}

	//////////////////////////////////////// Overridden Methods ////////////////////////////////////////
	////////////////////////////////////// Property Getter/Setter //////////////////////////////////////

	get user() {
		return this.data?.user;
	}

	get host() {
		return this.data?.host;
	}

	get protocol() {
		return this.data?.protocol;
	}

	get serviceUrl() {
		return this.data?.serviceUrl;
	}

	get refreshInterval() {
		return this.data.refreshInterval || 60000;
	}

	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	async save(localOnly = false) {
		if (!localOnly && this.mode == "service") {
			const data = Object.assign({}, this.data);
			delete data._local;
			delete data.serviceUrl;
			const resp = await fetch(this.data.serviceUrl, {
				method: "POST",
				body: JSON.stringify(data)
			});
			if (resp.status >= 400) {
				alert(await resp.text());
			}
		}

		localStorage.setItem("config-data", JSON.stringify(this.data));
	}

	get(propertyName, local = false) {
		if (local) {
			return this.data._local[propertyName];
		} else {
			return this.data[propertyName];
		}
	}

	set(propertyName, value, local = false) {
		if (local) {
			this.data._local[propertyName] = value;
			this.save(true);
		} else {
			this.data[propertyName] = value;
		}
	}

	async showDialog() {
		debugger;
	}

	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	async _read() {
		let valid = false;

		while (!valid) {
			Object.assign(this.data, JSON.parse(localStorage.getItem("config-data")));

			// Try loading configuration data from service
			valid = await this._fromService(this.data?.serviceUrl);
			if (valid) {
				this.mode = "service";
				break;
			}

			// Try getting data from local storage
			valid = await this._fromLocalStorage(this.data);
			if (valid) {
				this.mode = "local";
				break;
			}

			await this._fromUser();
		}
	}

	async _fromService(serviceUrl) {
		if (!serviceUrl) {
			return false;
		}

		// Load configuration data from service
		try {
			const resp = await fetch(serviceUrl, {
				method: "GET"
			});
			if (resp.status >= 400) {
				throw new Error(`ServiceURL returned status code ${resp.status}`);
			}

			const data = await resp.json();
			Object.assign(this.data, data);

			return await this._tryConnect(data);
		} catch (err) {
			alert("Could not connect to service: " + err.message)
			return false;
		}
	}

	async _fromLocalStorage(data) {
		// Try local storage
		if (!data) {
			return false;
		}

		return await this._tryConnect(data);
	}

	async _tryConnect(data) {
		try {
			const url = (data.protocol || this.protocol) + data.host + "/api/" + data.user + "/config";

			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
			}, 2000);
			const resp = await fetch(url, {
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (resp.status === 200) {
				this.data.user = data?.user || this.user;
				this.data.host = data?.host || this.host;
				this.data.protocol = data?.protocol || this.protocol;
				return true;
			}

			// TODO: Handle error from bridge
			return false;
		} catch (err) {
			return false;
		}
	}

	async _fromUser() {
		// TODO: Show configuration input dialog
		const data = {};
		data.serviceUrl = prompt("Service URL:");
		if (!data.serviceUrl) {
			delete data.serviceUrl;
			data.user = prompt("Bridge User:", this.user);
			data.host = prompt("Bridge Host:", this.host);
			data.protocol = prompt("Bridge Protocol", this.protocol);
		}

		localStorage.setItem("config-data", JSON.stringify(data));
	}



}
	///////////////////////////////////////// Hidden Functions /////////////////////////////////////////

