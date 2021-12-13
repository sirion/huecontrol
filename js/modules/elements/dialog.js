const template = document.createElement("template");
template.innerHTML = `
<style>
	.background {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
		background-color: transparent;
		display: flex;
		justify-content: center;
		align-items: center;
		color: black;
	}


	.popup {
		max-width: 90vw;
		max-height: 90vh;
		background-color: white;

		display: grid;
		grid-template-rows: 2rem auto 2rem;
		grid-template-columns: auto;

		place-items: stretch;
		box-shadow: #666 0.5vw 0.5vh 2vmax;

		opacity: 0;
		transition: opacity 500ms ease;

		padding: 1rem;
		border: 2px solid #999;
	}

</style>
<div class="background">
	<div class="popup">
		<section id="title"></section>
		<section id="content">
			<slot></slot>
		</section>
		<section id="footer">
			<slot name="footer"></slot>
		</section>
	</div>
</div>`;

export default class Dialog extends HTMLElement {
	//////////////////////////////////////////// Constructor ///////////////////////////////////////////

	constructor(anchor) {
		super();
		this.anchor = anchor;

		this._initDom();
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

	get title() {
		return this._shadow.querySelector("#title").textContent;
	}

	set title(value) {
		this._shadow.querySelector("#title").textContent = value;
	}

	////////////////////////////////////////// Public Methods //////////////////////////////////////////

	async show() {

		document.body.append(this);

		// TODO: Measure size and place accordingly pointing to anchor

		this._shadow.querySelector(".popup").style.opacity = "1";

		return new Promise((res, rej) => {
			this._promiseShowResolve = res;
			this._promiseShowReject = rej;
		});
	}

	async close(cancel = false) {
		const domDialog = this._shadow.querySelector(".popup");

		const onClose = () => {
			domDialog.removeEventListener("transitionend", onClose);
			this.parentElement.removeChild(this);

			if (cancel) {
				this._promiseShowReject();
			} else {
				this._promiseShowResolve();
			}
		};

		domDialog.addEventListener("transitionend", onClose);
		domDialog.style.opacity = "0";
	}




	/////////////////////////////////////////// Event Handler //////////////////////////////////////////
	////////////////////////////////////////// Private Methods /////////////////////////////////////////

	_initDom() {
		this._shadow = this.attachShadow({ mode: 'open' });
		this._shadow.append(template.content.cloneNode(true));

		const domBackground = this._shadow.querySelector(".background");

		domBackground.addEventListener("click", e => {
			if (e.target === domBackground) {
				this.close();
			}
		});
	}

}
customElements.define("mi-dialog", Dialog);

///////////////////////////////////////// Hidden Functions /////////////////////////////////////////
