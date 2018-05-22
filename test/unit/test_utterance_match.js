const test = require('tap').test;

	const csvToJson = csv => {
	  const [firstLine, ...lines] = csv.split('\n');
	  return lines.map(line =>
	    firstLine.split(',').reduce(
	      (curr, next, index) => ({
	        ...curr,
	        [next]: line.split(',')[index],
	      }),
	      {}
	    )
	  );
	};

$.ajax({
	type: "GET",
	url: "data.csv",
	dataType: "text",
	success: csvToJson
	}
});
