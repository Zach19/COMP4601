var express = require('express');
var router = express.Router();
const elasticlunr = require("elasticlunr");


var NEXT_ID = 0;

//our index
const index = elasticlunr(function () {
  this.addField('title');
  this.addField('body');
  this.addField('id');
  this.setRef('title');
});

//function to index crawler data
function indexResults(doc_data) {
	for (const i in doc_data) {
		d = doc_data[i];
		var doc = {
			title: d.title,
			body: d.paragraph,
			id: NEXT_ID++
		}
		index.addDoc(doc);
		console.log('done for page title: ' + doc.title);
	}
	console.log('done indexing');
}

// /search?q=  queries go here 
router.get('/', async (req, res) => {
	indexResults(req.allData);	
	let query = req.query.q;	
	result = index.search(query)

	res.send(result)
})

module.exports = router;
