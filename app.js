var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const Crawler = require("crawler");
var mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var Schemas = require('./schemas')

var app = express();

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

let allLinks = []
let allData = {}

const c = new Crawler({
    maxConnections : 100, //use this for parallel, rateLimit for individual
    skipDuplicates: true,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }
        else {
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
                        incomingLinks: allData[title].incomingLinks
                    }

                    Object.assign(allData[title], newPage);
                }
            } 
            else {
                let newPage = {
                    title: title,
                    paragraph: paragraph,
                    outgoingLinks: listedLinks,
                    incomingLinks: []
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
                        incomingLinks: [title] 
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

let runMongoMigration = async () => {
    for (const page in allData) {
        let pageData = allData[page]

        try {
            let p = new Schemas.Page({
                title: pageData.title,
                paragraph: pageData.paragraph,
                outgoingLinks: pageData.outgoingLinks,
                incomingLinks: pageData.incomingLinks,
                numberOfIncoming: pageData.incomingLinks.length
            })

            await p.save().then(() => console.log('Page added successfully'))
            
        }
        catch (err) {
            console.log(err)
        }
    }
    console.log('All done.')
}

//Perhaps a useful event
//Triggered when the queue becomes empty
//There are some other events, check crawler docs
c.on('drain', async function(){
    console.log("Done.");
    await runMongoMigration();
});

//Queue a URL, which starts the crawl
c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');
// c.queue('https://www.w3schools.com/tags/tag_meta.asp');


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

module.exports = app;
