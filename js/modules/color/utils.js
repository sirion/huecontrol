const colorUtils = {
	/**
	 * Calculates the RGB equivalent of a HSL color. RGB values range from 0 to 255, HSL values must be between 0 and 1.
	 *
	 * @param {Number} h Hue (0-1)
	 * @param {Number} s Saturation (0-1)
	 * @param {Number} l Lightness (0-1)
	 * @return {Number[]} An array with the values for r,g and b (0-255)
	 */
	hsl2rgb(h, s, l) {
		let r, g, b;

		if (s === 0) {
			// No saturation means black to white
			r = l;
			g = l;
			b = l;
		} else {
			let q = 0;
			if (l < 0.5) {
				q = l * (1 + s);
			} else {
				q = l + s - l * s;
			}
			const p = 2 * l - q;

			r = colorUtils._hue2rgb(p, q, h + 1/3);
			g = colorUtils._hue2rgb(p, q, h);
			b = colorUtils._hue2rgb(p, q, h - 1/3);
		}

		return [
			Math.round(r * 255),
			Math.round(g * 255),
			Math.round(b * 255)
		];
	},

	_hue2rgb(p, q, t) {
		t = Math.sign(t) == 1 ? Math.abs(t - Math.trunc(t)) : 1 - Math.abs((t - Math.trunc(t)));

		let v = p;
		if (t < 1/6) {
			v = p + (q - p) * 6 * t;
		} else if (t < 1/2) {
			v = q;
		} else if (t < 2/3) {
			v = p + (q - p) * (2/3 - t) * 6;
		}

		return v;
	},

	/**
 	 * Calculates the HSL equivalent of a RGB color. RGB values range from 0 to 255, HSL values must be between 0 and 1.
	 *
	 * @param {Number} r Red value (0-255)
	 * @param {Number} g Green value (0-255)
	 * @param {Number} b Blue value (0-255)
	 * @return {Number[]} An array with the values for h,s and l (0-1)
	 */
	rgb2hsl(r, g, b) {
		r = r / 255;
		g = g / 255;
		b = b / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);

		const l = (max + min) / 2;
		let h = 0;
		let s = 0;


		if (max !== min){
			const delta = max - min;

			if (l > 0.5) {
				s = delta / (2 - max - min);
			} else {
				s = delta / (max + min);
			}

			if (max === r) {
				h = (g - b) / delta + (g < b ? 6 : 0);
			} else if (max === g) {
				h = (b - r) / delta + 2;
			} else { // max === b
				h = (r - g) / delta + 4;
			}

			h = h / 6;
		} /* else {
			// No color, just set l.
		} */

		return [h, s, l];
	}

};

export default colorUtils;