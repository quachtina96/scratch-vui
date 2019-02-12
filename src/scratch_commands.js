var ScratchCommands = [
    {
        "description": "respond to certain events",
        "example_statement": "whenever i say goodbye say see you later thats it",
        "example_project_name": ""
    },
    {
        "description": "play a sound",
        "example_statement": "play the boing sound",
        "example_project_name": ""
    },
    {
        "description": "repeat actions",
        "example_statement": "play the meow sound 10 times",
        "example_project_name": ""
    },
    {
        "description": "understand if statements",
        "example_statement": "if one plus one equals two then say polo thats it",
        "example_project_name": ""
    },
    {
        "description": "do math",
        // TODO: change the example. the current one doesn't imply the range of
        // possibilities. for example, that you can provide numbers as arguments!
        "example_statement": "if 10 times 30 is greater than 5 play the alarm sound thats it",
        // old_example: "the length of the fruits list times price"; demonstrates
        //  that you can provide numbers as arguments, but is unclear and out of context.
        "example_project_name": ""
    },
    {
        "description": "get random numbers",
        "example_statement": "create a variable called x and set it to a random number between 1 and 10",
        // "example_statement": "say a random number between 1 and 10",
        "example_project_name": ""
    },
    {
        "description": "say words in different accents in different voices",
        "example_statement": "use the French accent",
        "example_project_name": ""
    },
    {
        "description": "listen for words",
        "example_statement": "if i say 'hello', then play the meow sound thats it",
        "example_project_name": ""
    },
    {
        "description": "make and modify variables",
        // TODO: add the following to the example statement when the desired
        // behavior is supported. "Then ask me what bananas is set to.""
        "example_statement": "make a variable called bananas and set bananas to 10.",
        "example_project_name": ""
    },
    {
    	"description": "make and modify lists",
    	"example_statement": "make a list called fruit. add 1 to fruit. add the variable called bananas to fruit.",
    	"example_project_name": ""
    },
    // TODO: Experiment a bit more with the timer command before enabling.
    // {
    //     "description": "control a timer",
    //     "example_statement": "when the timer is greater than 5 play the meow sound and reset the timer thats it",
    //     "example_project_name": ""
    // }
];

module.exports = ScratchCommands;