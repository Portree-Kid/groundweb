var chai = require('chai');
var assert = require('chai').assert;
const path = require("path");
const fs = require('fs');
var dirindex = require('../api/util/dirindex.js');
const sinon = require('sinon');
var sandbox = require('sinon').createSandbox();

var NodeGit = require("nodegit");


const terraSyncDir = 'public_test';
const upstreamDir = 'public_upstream';


var git = require('../api/util/git.js');
var github = require('../api/util/github.js');

describe('Git', function () {


  afterEach(function (done) {
    var localPath = path.resolve(path.join(terraSyncDir, "/main/"));
    var upstreamPath = path.resolve(path.join(upstreamDir, "/main/"));
    console.log("Remove " + localPath);
    if (!localPath) { fs.rmdirSync(localPath); }
    console.log("Remove " + upstreamPath);
    if (!upstreamPath) { fs.rmdirSync(upstreamPath); }
    done();
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
      var stub = sandbox.replace(git, "push", function (remote, refspec, myFetchOpts, committer) {
        console.log("PUSH " + committer);
        done("PUSHED but shouldn't");
      });
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
        done();
      };
      var cloneURL;
      var stub = sandbox.replace(git, "push", function (remote, refspec, myFetchOpts, committer) {
        console.log("PUSH " + committer);
      });
      git.workflow(localPath, 'EDDP', email, saveFunction, errCb, okCb, "file:///" + upstreamPath);
      //sandbox.assert.calledOnce(stub);

    })
    //    createPath(gitPath);
  }).timeout(60000);

});


function createPath(currentpath) {
  if (fs.existsSync(currentpath))
    return;
  fs.mkdirSync(currentpath, { recursive: true }, (err) => {
    console.error('Error creating path', err);
    return;
  });
}
