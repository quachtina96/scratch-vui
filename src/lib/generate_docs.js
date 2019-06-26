/**
 * @fileoverview This script generates documentation about the supported
 * commands in Scratch VUI
 */

const ScratchAction = require('../scratch_action.js');

var actions = ScratchAction.allActions();
var lines = actions.map((action) => {
	var trigger = action.idealTrigger;
	var description = action.description;
	var args = action.arguments.map((arg) => arg.description).join(', ');
	return `${trigger} & ${description} & ${args} \\`
})

actionDescriptions = lines.join('\hline\n');


var result = `
\\begin{center}
 \\begin{tabular}{||c c c c||}
 \hline
 Ideal Trigger & Description & Arguments \\ [0.5ex]
 \hline\hline
 ${actionDescriptions}
 \hline
\end{tabular}
\end{center}`

console.log(result)