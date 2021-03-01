var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const Crawler = require("crawler");
var mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var fruitsRouter = require('./routes/fruits');
var personalRouter = require('./routes/personal');

var Schemas = require('./schemas')

var app = express();
const port = 3030;

//pages to crawl
const f_domain = 'https://people.scs.carleton.ca/~davidmckenney/fruitgraph'
const p_domain = 'https://crawler-test.com/'
// db connection
var mongoDB = 'mongodb://localhost:27017/lab3DB';
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.once('open', () => console.log('Connected to the DB!'))
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/fruits', async function (req, res, next) {
	//pass allData to search fruits router
    await c;
	req.allData = allData;
	
    next();
}, fruitsRouter);

app.use('/personal', async function (req, res, next) {
	//pass allData_p to search personals router
    await pers;
	req.allData_p = allData_p;
	
    next();
}, personalRouter);

let allLinks = []
let allData = {}

let allLinks_p = []
let allData_p = {}
//for testing
let pageRank = 1;

const c = new Crawler({
    maxConnections : 100, //use this for parallel, rateLimit for individual
    skipDuplicates: true,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        //h = res.request.uri.host
		//console.log(h);
		if(error){
            console.log(error);
		
		//check here if the returned page is from a domain different than the one we are crawling
        //} else if (h.includes(f_domain)){
			//console.log('not in domain: ' + res.request.uri);
		
		}else {
            let $ = res.$; //get cheerio data, see cheerio docs for info
            let title = $("title").text();
            let paragraph = $("p").text();
            let linksInArray = $('a').toArray();
            let listedLinks = [];
            let links = $("a");

            for(let i = 0; i < linksInArray.length; i++) {
                listedLinks.push(linksInArray[i].children[0].data)
            }

            if (allData.hasOwnProperty(title)) {
                if (!allData[title].paragraph) {
                    let newPage = {
                        title: title,
                        paragraph: paragraph,
                        outgoingLinks: listedLinks,
                        incomingLinks: allData[title].incomingLinks,
						pageRank: pageRank //replace with page rank calculation
                    }

                    Object.assign(allData[title], newPage);
                }
            } 
            else {
                let newPage = {
                    title: title,
                    paragraph: paragraph,
                    outgoingLinks: listedLinks,
                    incomingLinks: [],
					pageRank: pageRank //replace with page rank calculation
                }

                Object.assign(allData[title] = newPage)
            }            

            for (name of listedLinks) {
                if (allData.hasOwnProperty(name)) {
                    allData[name].incomingLinks.push(title)
                }
                else {
                    allData[name] = { 
                        title: name, 
                        paragraph: '',
                        outgoingLinks: [],
                        incomingLinks: [title],
						pageRank: pageRank //replace with page rank calculation
                    }
                }
            }

            $(links).each(function(i, link) {
                if (!allLinks.includes($(link).text())) {
                    c.queue(`https://people.scs.carleton.ca/~davidmckenney/fruitgraph/${$(link).text()}.html`)
                    allLinks.push(link.children[0].data)
                }           
            })
        }
		
        done();
    }
});

const pers = new Crawler({
    maxConnections : 100, //use this for parallel, rateLimit for individual
    skipDuplicates: true,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        
		//}else if (res.request.uri.in(p_domain)){
		//	console.log('not in domain: ' + res.request.uri);
	
		}else {
            let $ = res.$; //get cheerio data, see cheerio docs for info
            let title = $("title").text();
            let paragraph = $("p").text();
            let linksInArray = $('a').toArray();
            let listedLinks = [];
            let links = $("a");

            for(let i = 0; i < linksInArray.length; i++) {
                listedLinks.push(linksInArray[i].children[0].data)
            }

            if (allData_p.hasOwnProperty(title)) {
                if (!allData_p[title].paragraph) {
                    let newPage = {
                        title: title,
                        paragraph: paragraph,
                        outgoingLinks: listedLinks,
                        incomingLinks: allData_p[title].incomingLinks,
						pageRank: pageRank //replace with page rank calculation
                    }

                    Object.assign(allData_p[title], newPage);
                }
            } 
            else {
                let newPage = {
                    title: title,
                    paragraph: paragraph,
                    outgoingLinks: listedLinks,
                    incomingLinks: [],
					pageRank: pageRank //replace with page rank calculation
                }

                Object.assign(allData_p[title] = newPage)
            }            

            for (name of listedLinks) {
                if (allData_p.hasOwnProperty(name)) {
                    allData_p[name].incomingLinks.push(title)
                }
                else {
                    allData_p[name] = { 
                        title: name, 
                        paragraph: '',
                        outgoingLinks: [],
                        incomingLinks: [title],
						pageRank: pageRank //replace with page rank calculation
                    }
                }
            }

            $(links).each(function(i, link) {
                if (!allLinks_p.includes($(link).text())) {
                    c.queue(`https://crawler-test.com/${$(link).text()}`)
                    allLinks_p.push(link.children[0].data)
                }           
            })
        }
		
        done();
    }
});

let runMongoMigration = async () => {
    for (const page in allData) {
        let pageData = allData[page]
        try {
            let p = new Schemas.Fruits({
                title: pageData.title,
                paragraph: pageData.paragraph,
                outgoingLinks: pageData.outgoingLinks,
                incomingLinks: pageData.incomingLinks,
                numberOfIncoming: pageData.incomingLinks.length,
				pageRank: pageData.pageRank
            })

            await p.save().then(() => console.log('Page added successfully'))
            
        }
        catch (err) {
            console.log(err)
        }
    }
	
    console.log('db migration All done for fruit domain.')
}

let runMongoMigration_p = async () => {
    for (const page in allData_p) {
        let pageData = allData_p[page]
        try {
            let p = new Schemas.Personal({
                title: pageData.title,
                paragraph: pageData.paragraph,
                outgoingLinks: pageData.outgoingLinks,
                incomingLinks: pageData.incomingLinks,
                numberOfIncoming: pageData.incomingLinks.length,
				pageRank: pageData.pageRank
            })

            await p.save().then(() => console.log('Page added successfully'))
            
        }
        catch (err) {
            console.log(err)
        }
    }
	
    console.log('db migration All done for personal domain.')
}

//Perhaps a useful event
//Triggered when the queue becomes empty
//There are some other events, check crawler docs
c.on('drain', async function(){
    console.log("Done.");
    await runMongoMigration();
});

//trigger mongo data storage once crawling is done
pers.on('drain', async function(){
    console.log("Done.");
    await runMongoMigration_p();
});

//Queue a URL, which starts the crawl
c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');

//queue personal
pers.queue(p_domain);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, () => {
  console.log(`REST Server listening at http://localhost:${port}`)
})

module.exports = app;
