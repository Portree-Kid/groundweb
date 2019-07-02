var chai = require('chai');
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


  it('git test no diff', (done) => {

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
    res = mocks.createResponse();
    GroundnetController.airportGeoJSON(req, res);
    var data = res._getJSONData(); // short-hand for JSON.parse( res._getData() );

    assert.equal(200, res.statusCode);
    assert.isOk(res._isEndCalled());
    assert.isOk(res._isJSON());
    //    assert(data.message === 'No ICAO', 'Message must be No ICAO');
    console.log(res.statusCode);
    done();
  })
});


function createPath(currentpath) {
  if (fs.existsSync(currentpath))
    return;
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