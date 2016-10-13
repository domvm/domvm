import { createView } from "./src/createView";

import { defineElement } from "./src/defineElement";
import { defineText } from "./src/defineText";
import { defineComment } from "./src/defineComment";
import { defineView } from "./src/defineView";

import { injectView } from "./src/injectView";
import { injectElement } from "./src/injectElement";

// tpl must be an array representing a single domvm 1.x jsonML node
export function jsonml(tpl) {
	const a0 = tpl[0],
		  a1 = tpl[1],
		  a2 = tpl[0],
}

// todo: change preproc to handle:
// attrs and css props as fns, direct getters