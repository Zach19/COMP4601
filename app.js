var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const Crawler = require("crawler");
var mongoose = require('mongoose');
var cors = require('cors');
var { Matrix } = require('ml-matrix');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var fruitsRouter = require('./routes/fruits');
var personalRouter = require('./routes/personal');

var Schemas = require('./schemas')

var app = express();
const port = 3030;

//pages to crawl
const f_domain = 'https://people.scs.carleton.ca/~davidmckenney/fruitgraph'
const p_domain = 'https://www.crawler-test.com/'
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
app.use(cors())

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

let pageRankAlgo = () => {
    // create initial NxN matrix of zeros
    let mat = Matrix.zeros(Object.keys(allData).length, Object.keys(allData).length);
  
    // populate the matrix with ones by going through each pages outgoing links
    for (let page in allData) {
      for(let j = 0; j < allData[page].outgoingLinks.length; j++) {
        mat.set(allData[page].title.substring(2), allData[page].outgoingLinks[j].substring(2), 1)
      }
    }
  
    // Go through each row and count how many ones there are
    for (let k = 0; k < mat.rows; k++) {
      let counter = 0;
      for (let j = 0; j < mat.columns; j++) {
        if (mat.get(k, j) === 1) {
           counter++;
        }
      }
      // if there are no ones, change all the zeros to 1/n (n being the number of columns)
      for (let y = 0; y < mat.columns; y++) {
        if (counter === 0) {
          mat.set(k, y, (1/mat.columns))
        }
        // else if a row has ones, change each node that has a one to 1/(however many ones exist in the row)
        else {
          if (mat.get(k, y) === 1) {
            mat.set(k, y, 1/counter)
          }
        }
      } 
    }
  
    // multiply your matrix by 1 - alpha
    let mulMatrix = Matrix.mul(mat, 0.9);
  
    // Then go through the matrix again and add alpha/n to each node
    for (let i = 0; i < mulMatrix.rows; i++) {
      for (let j = 0; j < mulMatrix.columns; j++) {
        if (mulMatrix.get(i, j) === 0) {
          mulMatrix.set(i, j, 0.1/mulMatrix.columns)
        }
        else {
          let num = mulMatrix.get(i, j)
          mulMatrix.set(i, j, num + (0.1/mulMatrix.columns))
        }
      }
    }
  
    // create your one row vector for matrix multiplication iteration towards the steady state
    let x0 = Matrix.eye(1, Object.keys(allData).length);
    let oldVec;
    let threshold = 0;
    let oldThreshold = 0;
    let count = 0;
  
    // power iteration, so you just keep matrix multiplying your new iteration vector with your original populated one until you reach the steady state
    do {
      oldVec = x0;
      x0 = x0.mmul(mulMatrix)
  
      oldThreshold = threshold;
      // using euclidian distance  to calculate threshold on when to stop iterating
      for (let i = 0; i < x0.columns; i++) {
        threshold += Math.pow((x0.get(0, 1) - oldVec.get(0, i)), 2)
      }
      threshold = Math.sqrt(threshold)
  
      count++;
  
    } while (Math.abs(threshold - oldThreshold) > 0.0001)
  
    // console.log('newVec', x0)
    // console.log('oldVec', oldVec)
    // console.log('threshold', threshold)
    // console.log('oldThreshold', oldThreshold)
    // console.log('count', count)
    // console.log('done')
  
    // top 25 results
  
    // make two arrays one with all the elements in place after iterating and one that we can sort so we can take the top 25 search results
    let vector = []
    let sortedVector = []
    for (let j = 0; j < x0.columns; j++) {
      vector.push(x0.get(0, j));
      sortedVector.push(x0.get(0, j));
    }
  
    sortedVector = sortedVector.sort((a, b) => { return b - a })
    
    for (let i = 0; i < vector.length - 1; i++) {
        let str = 'N-' + i
        allData[str].pageRank = vector[i]
    }
  }

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

            await p.save()//.then(() => console.log('Page added successfully'))
            
        }
        catch (err) {
            console.log(err)
        }
    }
	
    console.log('db migration All done for fruit domain.')
}

//Perhaps a useful event
//Triggered when the queue becomes empty
//There are some other events, check crawler docs
c.on('drain', async function(){
    console.log("Done.");
    await pageRankAlgo();
    await runMongoMigration();
});

//trigger mongo data storage once crawling is done
// pers.on('drain', async function(){
//     console.log("Done personal.");
//     console.log(allData_p)
//     await pageRankAlgo();
//     await runMongoMigration_p();
// });

//Queue a URL, which starts the crawl
c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');

//queue personal
// pers.queue(p_domain);


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






// const pers = new Crawler({
//     maxConnections : 100, //use this for parallel, rateLimit for individual
//     skipDuplicates: true,
//     // This will be called for each crawled page
//     callback : function (error, res, done) {
//         if(error){
//             console.log(error);
        
// 		//}else if (res.request.uri.in(p_domain)){
// 		//	console.log('not in domain: ' + res.request.uri);
	
// 		}else {
//             let $ = res.$; //get cheerio data, see cheerio docs for info
//             let title = $("title").text();
//             let paragraph = $("p").text();
//             let linksInArray = $('a').toArray();
//             let listedLinks = [];
//             let links = $("a");

//             console.log('personal crawler')

//             for(let i = 0; i < linksInArray.length; i++) {
//                 listedLinks.push(linksInArray[i].children[0].data)
//             }

//             if (allData_p.hasOwnProperty(title)) {
//                 if (!allData_p[title].paragraph) {
//                     let newPage = {
//                         title: title,
//                         paragraph: paragraph,
//                         outgoingLinks: listedLinks,
//                         incomingLinks: allData_p[title].incomingLinks,
// 						pageRank: pageRank //replace with page rank calculation
//                     }

//                     Object.assign(allData_p[title], newPage);
//                 }
//             } 
//             else {
//                 let newPage = {
//                     title: title,
//                     paragraph: paragraph,
//                     outgoingLinks: listedLinks,
//                     incomingLinks: [],
// 					pageRank: pageRank //replace with page rank calculation
//                 }

//                 Object.assign(allData_p[title] = newPage)
//             }            

//             for (name of listedLinks) {
//                 if (allData_p.hasOwnProperty(name)) {
//                     allData_p[name].incomingLinks.push(title)
//                 }
//                 else {
//                     allData_p[name] = { 
//                         title: name, 
//                         paragraph: '',
//                         outgoingLinks: [],
//                         incomingLinks: [title],
// 						pageRank: pageRank //replace with page rank calculation
//                     }
//                 }
//             }

//             $(links).each(function(i, link) {
//                 if (!allLinks_p.includes($(link).text())) {
//                     c.queue(`https://www.crawler-test.com/${$(link).text()}`)
//                     allLinks_p.push(link.children[0].data)
//                 }           
//             })
//         }
		
//         done();
//     }
// });


// let runMongoMigration_p = async () => {
//     for (const page in allData_p) {
//         let pageData = allData_p[page]
//         try {
//             let p = new Schemas.Personal({
//                 title: pageData.title,
//                 paragraph: pageData.paragraph,
//                 outgoingLinks: pageData.outgoingLinks,
//                 incomingLinks: pageData.incomingLinks,
//                 numberOfIncoming: pageData.incomingLinks.length,
// 				pageRank: pageData.pageRank
//             })

//             await p.save().then(() => console.log('Page added successfully'))
            
//         }
//         catch (err) {
//             console.log(err)
//         }
//     }
	
//     console.log('db migration All done for personal domain.')
// }