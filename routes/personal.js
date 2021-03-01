var express = require('express');
var mongoose = require('mongoose');
var Schemas = require('../schemas')
var router = express.Router();
const elasticlunr = require("elasticlunr");


var NEXT_ID = 0;

//our index
const personalIndex = elasticlunr(function () {
  this.addField('title');
  this.addField('body');
  this.addField('id');
  this.setRef('title');
});

//function to index crawler data
function indexResults(doc_data) {
	//console.log(doc_data);
	//limit the indexing to 500 max links
	//max_length = Math.min(Object.keys(doc_data).length, 500)
	
	for (const i in doc_data) {
		d = doc_data[i];
		var doc = {
			title: d.title,
			body: d.paragraph,
			id: NEXT_ID++
		}
		personalIndex.addDoc(doc);
		//console.log('done for page title: ' + doc.title);
	}
	console.log('done indexing Personal');
}

// /search?q=  queries go here 
router.get('/', async (req, res) => {
	indexResults(req.allData_p);	
	let query = req.query.q;
	let boosted = req.query.b;
	let returnPages = [];
	
	//index search result
	result = personalIndex.search(query);
	
	//loop through index results
	//use the ref key from index search (which is the title) as mongo search parameter
	//get all required data
	
	
	//if boosted, loop through each search result from the index search
	//use the ref key (which is the title) as mongo search parameter
	//get all required data
	//if boosted, return the pageRank * 1.8 * elasticlunr_score. change value as required
	if (boosted) {
		for (var i in result) {
			t = result[i].ref;
			let page = await Schemas.Personal.find({ title: t}).exec();
			page.forEach((p, index) => {
				let returnPage = {
					url: `https://crawler-test.com/${t}`,
					title: p.title,
					incomingLinks: p.incomingLinks,
					outgoingLinks: p.outgoingLinks,
					pageRank: p.pageRank,
					score: (result[i].score * 1.5 * p.pageRank)
				}
				returnPages.push(returnPage);
				
			})
		}
		
			
	}else {
		for (var i in result) {
			t = result[i].ref;
			let page = await Schemas.Personal.find({ title: t}).exec();
			page.forEach((p, index) => {
				let returnPage = {
					url: `https://crawler-test.com/${t}`,
					title: p.title,
					incomingLinks: p.incomingLinks,
					outgoingLinks: p.outgoingLinks,
					pageRank: p.pageRank
				}
				returnPages.push(returnPage);
			})		
		}
	}
	
	//sort by score, from highest to lowest
	returnPages.sort((a, b) => (a.score > b.score) ? -1 : 1);
	
	res.send(returnPages);
})

module.exports = router;
