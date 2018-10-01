// TODO: the issue here is that we can't automate accessing global variables.
// A way to resolve that would be to create a text area on the prototype page
// that will update with what the user said and also what scratch is saying.
// that way we won't have a way to access the speech there?

describe('My First Testt', function() {
	it('Does not do much!', function() {
		cy.visit('http://localhost:8080/build/prototype.html');
	})
})

describe('My First Testt', function() {
	beforeEach(function () {
		cy.visit('http://localhost:8080/build/prototype.html');
		cy.fixture('conversations.json').as('conversations')
	})

	it('Does not do much!', function() {
		cy.get("@conversations").then((conversations)) => {
			or (const [test_name, convo] of Object.entries(conversations)) {
				convo.forEach((dialogue) => {
					var userSpeech = dialogue[1];
					var desiredScratchResponse = dialogue[2];
					var check = {"start": scratch.stuffSaid.length - desiredScratchResponse.length,
											 "end": scratch.stuffSaid.length}

					scratch.handleUtterance(userSpeech);
					expect(scratch.stuffSaid.slice(check.start, check.end)).to.equal(desiredScratchResponse)
				})
			}
		})
	})
})


