const template = document.createElement("template");
template.innerHTML = `
<svg class="icon x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
	<g transform="rotate(45 12 12)">
		<rect x="12" y="5" width="2" height="16" />
		<rect x="5" y="12" width="16" height="2" />
	</g>
</svg>`;

export default template.content.firstElementChild;