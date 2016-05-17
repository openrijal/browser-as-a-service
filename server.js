// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    	= require('express');        // call express
var app        	= express();                 // define our app using express
var bodyParser 	= require('body-parser');
var phantom 	= require('phantom'); 			// get phantom context here

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 9999;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:9999/)
router.post('/', function(req, res) {

	// get the post variables
	var _url = req.body.url;
	var _useragent = req.body.useragent;
	var _wd = req.body.width;
	var _ht = req.body.height;

	var sitepage = null;
	var phInstance = null;

	var outObj = [];
	var status_text = ''

	phantom.create(['--ignore-ssl-errors=yes',])
    .then(instance => {
        phInstance = instance;
        return instance.createPage();
    })
    .then(page => {
        sitepage = page;

        outObj.req = [];
        outObj.res = [];
		outObj.html = '';
		outObj.jpeg = '';

		page.on('onResourceRequested', function(requestData, networkRequest) {
            outObj.req.push(requestData);
        });

		page.on('onResourceReceived', function(responseData) {
            if(responseData.stage == 'end'){
                outObj.res.push(responseData);
            }
		});

		page.setting('userAgent', _useragent);
        page.property('viewportSize', {width: _wd, height: _ht});

        return page.open(_url);
    })
    .then(status => {
    	status_text = status;
        //console.log("Page Status: " + status);
        sitepage.renderBase64('JPEG').then(screenshot => { outObj.jpeg = screenshot; });
        return sitepage.property('content');
    })
    .then(content => {
	   	sitepage.close();
        reqres = [];

        function sortByKey(array, key) {
            return array.sort(function(a, b) {
                var x = a[key]; var y = b[key];
                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            });
        }

        sorted_req = sortByKey(outObj.req, 'id');
        sorted_res = sortByKey(outObj.res, 'id');

        for (var i = 0; i <= outObj.req.length-1; i++) {
            reqres.push({req: sorted_req[i], res: sorted_res[i]});
        };

        res.json({
        	status: status_text,
        	reqres: reqres,
        	html: content,
        	jpg: outObj.jpeg
        });
        phInstance.exit();
    })
    .catch(error => {
        console.log(error);
        res.json({
            status: '911',
            reqrep: '',
            html: '',
            jpg: ''
        });
        phInstance.exit();
    });
  
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('API Server started on port ' + port);