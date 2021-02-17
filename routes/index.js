var mongoose = require('mongoose');
var Schemas = require('../schemas')
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/popular', async (req, res) => {
  let returnPages = []
  let page = await Schemas.Page.find({}).sort({ numberOfIncoming: -1}).limit(10).exec()
   page.forEach((p, index) => {
     let data = {
       title: p.title,
       numberOfIncoming: p.numberOfIncoming,
       incomingLinks: p.incomingLinks
     }
     returnPages.push(data)
   })
   res.send(returnPages)
})

router.get('/search/:id', async (req, res) =>{
    var req_id = req.params.id;

    let page = await Schemas.Page.find({ title: req_id}).exec();
    let returnPage = {
      url: `https://people.scs.carleton.ca/~davidmckenney/fruitgraph/${page[0].title}.html`,
      incomingLinks: page[0].incomingLinks
    }
    res.send(returnPage);
})

module.exports = router;
