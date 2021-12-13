const sorter = {
	// Sorts by the property "name" in ascending order
	byNameAsc(a, b) {
		if (a?.name === b?.name) {
			return 0;
		}
		return a?.name > b?.name ? 1 : -1;
	},

	// Sorts by the property "room" in ascending order
	byRoomAsc(a, b) {
		if (a?.room === b?.room) {
			return 0;
		}
		return a?.room > b?.room ? 1 : -1;
	}

};

export default sorter;