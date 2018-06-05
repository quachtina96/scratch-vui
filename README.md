# scratch-vui
Scratch VUI (Voice User Interface) is an accessible, audio user interface for Scratch. The conversational interface enables and facilitates a screen-less experience so children with low vision or blindness may engage with the core ideas behind Scratch--ideas surrounding creative learning and computational thinking. Through the interface, users may create, edit, and play projects through conversation with an agent, Scratch.

## What might this sound like?
Here's an example of a linear process of creating a project:

**You**: Scratch, new project.

**Scratch**: What do you want to call it?

**You**: Call the project “Tell me a knock knock joke.”

**Scratch**: Okay. When you say “Scratch, tell me a knock knock joke”, I’ll play the project. What’s the first step?

**You**: You say, “knock, knock.”

**Scratch**: Okay, what’s the next step?

**You**: When I say “who’s there?”, you say “King tut”.

**Scratch**: Okay, what’s the next step?

**You**: When I say, “King Tut who?”, you say “King Tut-key fried chicken!”.

**Scratch**: Okay, what’s the next step?

**You**: That’s it.

**Scratch**: Cool, now you can say, “Scratch, tell a knock knock joke”  to play the project.

**You**: Scratch, tell me a knock knock joke!

## Installation
```git https://github.com/quachtina96/scratch-vui.git
cd scratch-vui
npm install
```

## Getting Started
Running the project requires Node.js to be installed.
```npm start```
Open the following link in the Chrome browser
```http://localhost:8080/build/prototype.html```
Start interacting with the system by
1. tabbing to and clicking on the "Start" image
or
1. clicking on the microphone.

2. Try the example conversation from above, line by line.
3. Just refresh the page to start over--your projects will be saved to the browser's local storage.

## Documentation
In the system, there are three main contexts you can be in: Home, Editing Project, and Playing Project.
![System Overview](img/overview.png)
The transitions in the diagram are each labeled by a trigger type. When you say a phrase that can be matched to one of these trigger types and you are in the appropriate starting state, you will transition to the end state.

  * [Supported Scratch Commands](docs/supported-scratch-commands.md)
  * [Questions you can ask Scratch](docs/state.md)
  * [Context-based Commands](docs/context-based-commands.md)

