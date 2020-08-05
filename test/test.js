var assert = require('chai').assert;
const path = require("path");
const fs = require('fs');
var dirindex = require('../api/util/dirindex.js');
const sinon = require('sinon');
var sandbox = require('sinon').createSandbox();
var mocks = require('node-mocks-http');

var NodeGit = require("nodegit");

const terraSyncDir = 'public_test';
const upstreamDir = 'public_upstream';


var git = require('../api/util/git.js');
var github = require('../api/util/github.js');
//var groundnetRoutes = require('../api/routes/groundnetRoutes.js');
var GroundnetController = require('../api/routes/groundnetController.js');

describe('Git', function () {

  this.beforeEach(function (done) {
    var stub = sandbox.replace(git, "push", async function (remote, refspec, myFetchOpts, committer) {
      console.log("PUSH " + committer);
    });

    done();
  });


  this.afterEach(function (done) {
    var localPath = path.resolve(path.join(terraSyncDir, "/main/"));
    var upstreamPath = path.resolve(path.join(upstreamDir, "/main/"));
    console.log("Remove " + localPath);
    if (!localPath) { fs.rmdirSync(localPath); }
    console.log("Remove " + upstreamPath);
    if (!upstreamPath) { fs.rmdirSync(upstreamPath); }
    done();
    sandbox.restore();
  });


  it('git test groundweb no diff', (done) => {

    var mock = sinon.mock(NodeGit);

    var extract = require('extract-zip')
    var localPath = path.resolve(path.join(terraSyncDir, "/main/"));
    createPath(localPath);
    var upstreamPath = path.resolve(path.join(upstreamDir, "/main/"));
    extract('test/test-repo.zip', { dir: upstreamPath }, function (err) {
      if (err)
        done(err);
      console.log("Unpacked into " + upstreamPath);
      var name = 'Tom Tester';
      var email = 'tom@example.org';
      var saveFunction = () => {
        console.log("Copy File ");
        // destination.txt will be created or overwritten by default.
        var paths = [];
        fs.copyFileSync('test/EDDP.groundnet.xml', path.join(localPath, '/E/D/D/EDDP.groundnet.xml'));
        if (err)
          done(err);
        console.log('EDDP.groundnet.xml was copied to EDDP.groundnet.xml');
        var currentpath = path.join(localPath, '/E/D/D/');
        paths.push(path.join(currentpath, 'EDDP.groundnet.xml'));
        do {
          paths.push(dirindex.buildDirIndex(currentpath));
        }
        while ((currentpath = path.resolve(currentpath, "..")) != path.resolve(terraSyncDir))
        return paths;
      };
      var errCb = (err) => {
        done();
      };
      var okCb = () => {
        done("Shouldn't be OK");
      };
      var cloneURL;
      git.workflow(localPath, 'EDDP', email, saveFunction, errCb, okCb, "file:///" + upstreamPath);

      //sandbox.assert.calledOnce(stub);
      sandbox.restore();
    })

    //    createPath(gitPath);
  }).timeout(60000);

  it('git test groundweb KDTW no diff', (done) => {

    var paths = [];
    var localPath = path.resolve(path.join(terraSyncDir, "/main/"));
    localPath = path.join(localPath, 'K', 'D', 'T');

    createPath(localPath);    
    fs.readdirSync(localPath).forEach(file => {
      console.log(file);
      fs.unlinkSync(path.join(localPath, file));
    });
    fs.copyFileSync('test/KDTW.rwyuse.xml', path.join(localPath, 'KDTW.rwyuse.xml'));
    console.log('KDTW.rwyuse.xml was copied to KDTW.rwyuse.xml');
    paths.push(path.join(localPath, 'KDTW.rwyuse.xml'));
    dirindex.buildDirIndex(localPath);
    var dirFile = fs.readFileSync(path.join(localPath, '.dirindex'));
    console.log(dirFile);
    var lines = String(dirFile).split('\n');
    assert.equal(lines.length, 4);
    var fileLine = lines[2].split(':');
    assert.equal(fileLine.length, 4);
    assert.equal(fileLine[2], 'ddbe2d49d21eb65bd6746cf9347b40190c0395ff');
    assert.equal(fileLine[3], 798);
    sandbox.restore();
    done();

    //    createPath(gitPath);
  }).timeout(60000);

  it('git test with diff', (done) => {

    var mock = sinon.mock(NodeGit);

    var extract = require('extract-zip')
    var localPath = path.resolve(path.join(terraSyncDir, "/main/"));
    createPath(localPath);
    var upstreamPath = path.resolve(path.join(upstreamDir, "/main/"));
    extract('test/test-repo.zip', { dir: upstreamPath }, function (err) {
      if (err)
        done(err);
      console.log("Unpacked into " + upstreamPath);
      var name = 'Tom Tester';
      var email = 'tom@example.org';
      var saveFunction = () => {
        console.log("Copy File ");
        // destination.txt will be created or overwritten by default.
        var paths = [];
        fs.copyFileSync('test/EDDP.groundnet.1.xml', path.join(localPath, '/E/D/D/EDDP.groundnet.xml'));
        if (err)
          done(err);
        console.log('EDDP.groundnet.xml was copied to EDDP.groundnet.xml');
        var currentpath = path.join(localPath, '/E/D/D/');
        paths.push(path.join(currentpath, 'EDDP.groundnet.xml'));
        do {
          paths.push(dirindex.buildDirIndex(currentpath));
        }
        while ((currentpath = path.resolve(currentpath, "..")) != path.resolve(terraSyncDir))
        return paths;
      };
      var errCb = (err) => {
        done(err);
      };
      var okCb = (branchname) => {
        console.log("Ok called " + branchname);
        checkLastCommit(localPath, "refs/heads/" + branchname).then(() => {  done(); }).catch((err) => {  done(err); });
      };
      git.workflow(localPath, 'EDDP', email, saveFunction, errCb, okCb, "file:///" + upstreamPath);

      //sandbox.assert.calledOnce(stub);

    })
    //    createPath(gitPath);
  }).timeout(60000);
});


describe('Groundweb', function () {
  this.timeout(30000);

  this.beforeEach(function (done) {    
    var stub = sandbox.replace(git, "workflow", function (localPath, icao, email, saveFunction, errCb, okCb, cloneURL) {
      console.log("Workflow  " + localPath);
      okCb();
    });

    var githubLoad = sandbox.replace( github, 'load', function (branch, email) { return new Promise(function(resolve, reject) { 
      resolve({statusCode: 200});
    });
  })

    done();
  });


  this.afterEach(function (done) {
    done();
    sandbox.restore();
  });

  it('git test no icao', (done) => {

    req = mocks.createRequest();
    res = mocks.createResponse();
    GroundnetController.airportGeoJSON(req, res);
    var data = res._getJSONData(); // short-hand for JSON.parse( res._getData() );

    assert.equal(200, res.statusCode);
    assert.isOk(res._isEndCalled());
    assert.isOk(res._isJSON());
    assert(data.message === 'No ICAO', 'Message must be No ICAO');
    console.log(res.statusCode);
    done();
  })

  it('git test with illegal xml', (done) => {

    req = mocks.createRequest();
    req.params.icao = "EDDP";
    req.files.groundnet = {name: 'EDDP.groundnet.xml', data: 'BB'};
    req.body = {gpl: true, user_email: 'user@example.org' }; 
    res = mocks.createResponse();

    res.send = function (params) {
      var data = JSON.parse(params); // short-hand for JSON.parse( res._getData() );

      assert.equal(200, res.statusCode);
      assert(data.message === 'XML Errors', 'Message must be XML Errors');
      console.log(res.statusCode);
      done();
    }
    GroundnetController.upload(req, res);
  })

  it('git test with legal groundnet xml', (done) => {    
    setTimeout(done, 30000);
    req = mocks.createRequest();
    req.params.icao = "EDDP";
    const schema = fs.readFileSync('test/EDDP.groundnet.xml');
    req.files.groundnet = {name: 'EDDP.groundnet.xml', data: schema};
    req.body = {gpl: true, user_email: 'user@example.org' }; 
    res = mocks.createResponse();

    res.send = function (params) {
      var data = JSON.parse(params); // short-hand for JSON.parse( res._getData() );

      assert.equal(200, res.statusCode);
      assert.equal(data.message, 'EDDP Imported Successfully');
      console.log(res.statusCode);
      done();
    }
    GroundnetController.upload(req, res);
  })

  it('git test with legal ils xml', (done) => {
    this.timeout(30000);
    req = mocks.createRequest();
    req.params.icao = "KMKE";
    const schema = fs.readFileSync('test/KMKE.ils.xml');
    req.files.groundnet = {name: 'KMKE.ils.xml', data: schema};
    req.body = {gpl: true, user_email: 'user@example.org' }; 
    res = mocks.createResponse();

    res.send = function (params) {
      var data = JSON.parse(params); // short-hand for JSON.parse( res._getData() );

      assert.equal(200, res.statusCode);
      assert.equal(data.message, 'KMKE Imported Successfully');
      console.log(res.statusCode);
      done();
    }
    GroundnetController.upload(req, res);
  })
  it('git test with legal rwyuse xml', (done) => {
    this.timeout(30000);
    req = mocks.createRequest();
    req.params.icao = "KMKE";
    const schema = fs.readFileSync('test/KMKE.rwyuse.xml');
    req.files.groundnet = {name: 'KMKE.rwyuse.xml', data: schema};
    req.body = {gpl: true, user_email: 'user@example.org' }; 
    res = mocks.createResponse();

    res.send = function (params) {
      var data = JSON.parse(params); // short-hand for JSON.parse( res._getData() );

      assert.equal(200, res.statusCode);
      assert.equal(data.message, 'KMKE Imported Successfully');
      console.log(res.statusCode);
      done();
    }
    GroundnetController.upload(req, res);
  })
  it('git test with legal CYYZ rwyuse xml', (done) => {
    this.timeout(30000);
    req = mocks.createRequest();
    req.params.icao = "CYYZ";
    const schema = fs.readFileSync('test/CYYZ.rwyuse.xml');
    req.files.groundnet = {name: 'CYYZ.rwyuse.xml', data: schema};
    req.body = {gpl: true, user_email: 'user@example.org' }; 
    res = mocks.createResponse();

    res.send = function (params) {
      var data = JSON.parse(params); // short-hand for JSON.parse( res._getData() );

      assert.equal(200, res.statusCode);
      assert.equal(data.message, 'CYYZ Imported Successfully');
      console.log(res.statusCode);
      done();
    }
    GroundnetController.upload(req, res);
  })
  it('git test with legal threshold xml', (done) => {
    this.timeout(30000);
    req = mocks.createRequest();
    req.params.icao = "KMKE";
    const schema = fs.readFileSync('test/KMKE.threshold.xml');
    req.files.groundnet = {name: 'KMKE.threshold.xml', data: schema};
    req.body = {gpl: true, user_email: 'user@example.org' }; 
    res = mocks.createResponse();

    res.send = function (params) {
      var data = JSON.parse(params); // short-hand for JSON.parse( res._getData() );

      assert.equal(200, res.statusCode);
      assert.equal(data.message, 'KMKE Imported Successfully');
      console.log(res.statusCode);
      done();
    }
    GroundnetController.upload(req, res);
  })
  it('git test with legal twr xml', (done) => {
    this.timeout(30000);
    req = mocks.createRequest();
    req.params.icao = "KMKE";
    const schema = fs.readFileSync('test/KMKE.twr.xml');
    req.files.groundnet = {name: 'KMKE.twr.xml', data: schema};
    req.body = {gpl: true, user_email: 'user@example.org' }; 
    res = mocks.createResponse();

    res.send = function (params) {
      var data = JSON.parse(params); // short-hand for JSON.parse( res._getData() );

      assert.equal(200, res.statusCode);
      assert.equal(data.message, 'KMKE Imported Successfully');
      console.log(res.statusCode);
      done();
    }
    GroundnetController.upload(req, res);
  })
});


function createPath(currentpath) {
  if (fs.existsSync(currentpath))
    return;
  console.log('Create ' + currentpath);
  fs.mkdirSync(currentpath, { recursive: true }, (err) => {
    console.error('Error creating path', err);
    return;
  });
}

async function checkLastCommit(localPath, branchname) {
  try {
    var repo = await NodeGit.Repository.open(localPath);
    console.log(repo);
    var commit = await repo.getReferenceCommit(branchname);
    var masterCommit = await repo.getReferenceCommit("master");
    console.log("Commit Oid " + commit);
    console.log("Master     " + masterCommit);
    diff = await commit.getDiff();
    
    var result = diff[0].numDeltas();
    assert.isAtLeast( result, 0, 'Expect more than one diff');
    console.log(diff);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}