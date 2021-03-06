var NodeGit = require("nodegit");
var path = require("path");
var upath = require("upath");
const homedir = require('os').homedir();

const util = require('util');


var credCallback = function (url, userName) {
	console.log("CredCb User (sshKeyNew) : " + userName + " Url : " + url);
//  
    try {
		var pubfile = path.join(homedir, '.ssh', 'id_rsa_nodegit.pub');
		var privfile = path.join(homedir, '.ssh', 'id_rsa_nodegit');
		// console.log(pubfile);
		var cred = NodeGit.Cred.sshKeyNew(userName, pubfile, privfile, '');
		console.log("Cred : " + JSON.stringify(cred));
		return cred;		
	} catch (error) {
		console.error(error);
		return Cred.defaultNew();
	}
//	return NodeGit.Cred.sshKeyFromAgent(userName);
}

var credCallbackOauth = function (url, userName) {
	console.log("CredCb User (x-oauth-basic) : " + userName + " Url : " + url);
//  
    try {
		return NodeGit.Cred.userpassPlaintextNew(process.env.API_KEY, "x-oauth-basic");
	} catch (error) {
		console.error(error);
		return Cred.defaultNew();
	}
//	return NodeGit.Cred.sshKeyFromAgent(userName);
}

var addCb = function (obj) {
	console.log("OBJ : " + JSON.stringify(obj));
}

var committer = NodeGit.Signature.now("Groundweb",
	"terrasync@github.com");


module.exports.status = function (localPath, errCb, okCb, cloneURL) {
	console.log("Cloning " + cloneURL + " into " + localPath);
	try {


		// Using the `clone` method from the `Git.Clone` module, bring down the
		// NodeGit
		// test repository from GitHub.
		var myFetchOpts = {
			callbacks: {
				certificateCheck: function () { return 0; },
				credentials: credCallbackOauth,
				transferProgress: function (stats) {
					try {
						const progress = (100 * (stats.receivedObjects() + stats.indexedObjects())) / (stats.totalObjects() * 2);
						console.log('progress: ', progress)
					}
					catch (Err) {
						console.log('progress error: ' + Err)
					}
				}
			}
		};
		// Simple object to store clone options.
		var cloneOptions = {checkoutBranch: "master", fetchOpts: myFetchOpts};
		// If the repository already exists, the clone above will fail. You can
		// simply
		// open the repository in this case to continue execution.
		var errorAndAttemptOpen = function (err) {
			console.log("Clone failed with " + err);
			console.log("Attempting to open ");
			return NodeGit.Repository.open(localPath);
		};


		// Once the repository has been cloned or opened, you can work with a
		// returned
		// `Git.Repository` instance.
		NodeGit.Clone(cloneURL, localPath, cloneOptions)
			.then(async function (repo) {
				console.log("Got Repository Cloned");
				// Access any repository methods here.
				repository = repo;
				await repo.fetchAll(myFetchOpts);
				var opts = {};
				status = await repository.getStatus(opts);
				okCb( JSON.stringify(status) );
			}).catch(errorAndAttemptOpen)
			.then(async function (repository) {
				try {
					console.log("Got Repository Opened Status : " + JSON.stringify(repository));
					// Access any repository methods here.
					var errFetch = await repository.fetchAll(myFetchOpts);
					if (errFetch) {
						errCb(errFetch);
					}				
					console.log("Fetched ");
					var opts = {};
					var status = await repository.getStatus(opts);
					status.forEach(s=> console.log(util.inspect(s.status())));	
					if( status.length === 0) {
						var currentBranch = await repository.getCurrentBranch();
						var index = await repository.index();
						var indexVersion = index.version();
						if (indexVersion<3) {
							console.log("Version nudge to Index Version 3");
							
							var result = await index.setVersion(3);
							if (result<0) {
								console.error("Couldn't switch version");
							}
							result = await index.write();
							if (result<0) {
								console.error("Couldn't write index");
							}
						}

						var currentBranchName = currentBranch.shorthand();
						if(currentBranchName!=="master") {
							repository.checkoutBranch("master", {});
							okCb( {status: 'OK', indexVersion: indexVersion, statusMsg: 'Switched back to master', branch: currentBranchName} );												
						} else {
							okCb( {status: 'OK', indexVersion: indexVersion, branch: currentBranchName} );												
						}						
					} else {
						var currentBranch = await repository.getCurrentBranch();

						var currentBranchName = currentBranch.shorthand();

						var mergeOptions = new NodeGit.MergeOptions();
						var defaultSignature = NodeGit.Signature.default(repository);
						console.log(defaultSignature);
						var result = repository.state();
						if (result > NodeGit.Repository.STATE.NONE) {
							console.log("Repostat " + result);
							errCb("Repo not STATE.NONE");
							return;
						}
		
						console.log("Repostat " + result);
		
						oid = await repository.getBranchCommit("master");
						console.log("Got Master " + oid);

						var commit = await repository.getReferenceCommit("master");
						console.log("Resetting to master" + commit);
						var resetResult =  await NodeGit.Reset.reset(repository, commit, NodeGit.Reset.TYPE.HARD, {});
		
						okCb({status: 'OK', git: util.inspect(status.map(status=>{return {path: status.path(), statusMsg: status.status()}}))});
					}						
				} catch (error) {
					errCb(error);
				}
			});
		
	} catch (err) {
		errCb(err);
	}
}

/**
 * 
 * @param {*} localPath 
 * @param {*} fileType 
 * @param {*} icao 
 * @param {*} email 
 * @param {*} saveFunction 
 * @param {*} errCb 
 * @param {*} okCb 
 * @param {*} cloneURL 
 */

module.exports.workflow = function (localPath, fileType, icao, email, saveFunction, errCb, okCb, cloneURL) {
	console.log("Cloning " + cloneURL + " into " + localPath);
	try {


		// Using the `clone` method from the `Git.Clone` module, bring down the
		// NodeGit
		// test repository from GitHub.
		var myFetchOpts = {
			callbacks: {
				certificateCheck: function () { return 0; },
				credentials: credCallbackOauth,
				transferProgress: function (stats) {
					try {
						const progress = (100 * (stats.receivedObjects() + stats.indexedObjects())) / (stats.totalObjects() * 2);
						console.log('progress: ', progress)
					}
					catch (Err) {
						console.log('progress error: ' + Err)
					}
				}
			}
		};

		// Simple object to store clone options.
		var cloneOptions = {};

		cloneOptions.checkoutBranch = "master";
		cloneOptions.version = 4;

		// This is a required callback for OS X machines. There is a known issue
		// with libgit2 being able to verify certificates from GitHub.
		cloneOptions.fetchOpts = myFetchOpts;


		// If the repository already exists, the clone above will fail. You can
		// simply
		// open the repository in this case to continue execution.
		var errorAndAttemptOpen = function (err) {
			console.log("Clone failed with " + err);
			console.log("Attempting to open ");
			return NodeGit.Repository.open(localPath);
		};


		var branchName;
		// Once the repository has been cloned or opened, you can work with a
		// returned
		// `Git.Repository` instance.
		NodeGit.Clone(cloneURL, localPath, cloneOptions)
			.then(function (repo) {
				console.log("Got Repository 1");
				// Access any repository methods here.
				repository = repo;
				return repo.fetchAll(myFetchOpts);
			}).catch(errorAndAttemptOpen)
			.then(async function (repository) {
				console.log("Got Repository 2");
				// Access any repository methods here.
				var errFetch = await repository.fetchAll(myFetchOpts);
				if (errFetch) {
					errCb(errFetch);
				}
				console.log("Fetched ");
				var mergeOptions = new NodeGit.MergeOptions();
				var defaultSignature = NodeGit.Signature.default(repository);
				console.log(defaultSignature);
				var result = repository.state();
				if (result > NodeGit.Repository.STATE.NONE) {
					console.log("Repostat " + result);
					errCb("Repo not STATE.NONE");
					return;
				}

				console.log("Repostat " + result);

				oid = await repository.mergeBranches("master", "origin/master", defaultSignature, NodeGit.Merge.PREFERENCE.NONE, mergeOptions);
				console.log("Merged " + oid);
				var addedPaths;
				oid = await repository.getBranchCommit("master");
				console.log("Got Master " + oid);
				// create the branch
				branchName = fileType.toUpperCase() + '_' + icao + '_' + Date.now();
				branch = await NodeGit.Branch.create(repository, branchName, oid, 0);
				console.log("Setting upstream " + branchName);
				var branch = await NodeGit.Branch.setUpstream(branch, branchName);
				var refspec = "refs/heads/" + branchName + ":refs/heads/" + branchName;
				console.log("Add RefSpec " + refspec + "   " + branchName);
				var reference = await NodeGit.Remote.addPush(repository, "origin", refspec);
				console.log("Checking out branch " + refspec + "\t" + reference);
				var checkoutBranch = await repository.checkoutBranch("refs/heads/" + branchName, {});
				var commit = await repository.getReferenceCommit("refs/heads/" + branchName);
				console.log("Resetting to refs/heads/" + branchName + " " + commit);
				var resetResult =  await NodeGit.Reset.reset(repository, commit, NodeGit.Reset.TYPE.HARD, {});
			// Let the file be saved (Callback)
			    var paths = await saveFunction();
				if (!paths)
					errCb("saveFunction() returns undefined");
				console.log("Refreshing index " + paths);
				addedPaths = paths.map(p => path.relative(localPath, p));
				addedPaths = addedPaths.map(p => upath.toUnix(p));
				var index = await repository.index();
				addedPaths.forEach((element) => {
					console.debug("Added : " + element);
					index.addByPath(element).then(function (result) {
						if (result) {
							console.error("Result " + result);
						}
						return index.write()
					}).then(function (result) {
						if (result) {
							console.error("Result " + result);
						}
					}
					);
				})
				var errCode = await index.write();
				if (errCode) {
					console.error("Error " + errCode);
				}
				var treeOid = await index.writeTree();
				var head = await NodeGit.Reference.nameToId(repository, "HEAD");
				console.log("Got Head " + head);
				var parent = await repository.getCommit(head);
				var parentTree = await parent.getTree();
				console.log("Oid " + treeOid);
				console.log("Parent Head Commit " + parent);

				var author = NodeGit.Signature.now(email, email);
				console.log("Committing to refs/heads/" + branchName + "\t" + treeOid);

				var commitOid = await repository.createCommit("HEAD", author, committer, `New ${fileType} file for ${icao}`, treeOid, [parent]);
				console.log("Committed " + commitOid);
				console.log("Switching back to master");
				repository.checkoutBranch("master", {});
				var remote = await NodeGit.Remote.lookup(repository, "origin");
				var refspec = "refs/heads/" + branchName + ":refs/heads/" + branchName;
				console.log("Pushing " + refspec);
				return exports.push(remote, refspec, myFetchOpts, committer);
			})
			.then(function () {
				console.log("Success " + branchName);
				okCb(branchName);
			})
			.catch(errCb);
	} catch (err) {
		errCb(err);
	}
}

/**Externalized for testing purpose (stubbing) */

module.exports.push = function (remote, refspec, myFetchOpts, committer) {
	return remote.push(
		["+" + refspec],
		myFetchOpts
		, committer, "Push to " + refspec
	);
}

module.exports.commit = function (name) {
	Repository.open(path).then(function (repository) {
		repository.createBranch(name).then(function (reference) {
			repository.createCommit(reference, author, committer, message, Tree, parents).then(function (oid) {
				// Use oid
			});
		});
	});
}

/**
 * 
 */

module.exports.removeBranch = function (localPath, name) {
	console.log("Removing Branch " + name);
	NodeGit.Repository.open(localPath)
		.then(function (repository) {
			console.log("Switching to master");
			repository.checkoutBranch("master", { checkoutStrategy: NodeGit.Checkout.STRATEGY.FORCE });
			return repository;
		})
		.then(function (repository) {
			console.log("Getting Branch " + name);
			return repository.getBranch(name);
		})
		.then(function (reference) {
			console.log("Removing Branch " + reference);
			// remote.push(':refs/heads/my-branch');
			return NodeGit.Branch.delete(reference);
		})
		.then(function (reference) {
			console.log("Removed Branch " + reference);
		})
		.catch((err) => {
			console.log(err);
		});
}
