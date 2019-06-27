var NodeGit = require("nodegit");
var path = require("path");
var upath = require("upath");


var credCallback = function (url, userName) {
	console.log("User : " + userName + " Url : " + url);
	return NodeGit.Cred.sshKeyFromAgent(userName);
}

var addCb = function (obj) {
	console.log("OBJ : " + JSON.stringify(obj));
}

var committer = NodeGit.Signature.now("Groundweb",
	"terrasync@github.com");


module.exports.workflow = function (localPath, icao, email, saveFunction, errCb, okCb, cloneURL) {
	console.log("Cloning " + cloneURL + " into " + localPath);
	try {


		// Using the `clone` method from the `Git.Clone` module, bring down the
		// NodeGit
		// test repository from GitHub.
		var myFetchOpts = {
			callbacks: {
				certificateCheck: function () { return 0; },
				credentials: credCallback,
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

		// This is a required callback for OS X machines. There is a known issue
		// with libgit2 being able to verify certificates from GitHub.
		cloneOptions.fetchOpts = myFetchOpts;


		// If the repository already exists, the clone above will fail. You can
		// simply
		// open the repository in this case to continue execution.
		var errorAndAttemptOpen = function (err) {
			console.log("Attempting to open ");
			return NodeGit.Repository.open(localPath);
		};


		var branchName;
		// Once the repository has been cloned or opened, you can work with a
		// returned
		// `Git.Repository` instance.
		var repository;
		NodeGit.Clone(cloneURL, localPath, cloneOptions)
			.then(function (repo) {
				console.log("Got Repository 1");
				// Access any repository methods here.
				repository = repo;
				return repo.fetchAll(myFetchOpts);
			}).catch(errorAndAttemptOpen)
			.then(function (repo) {
				console.log("Got Repository 2");
				// Access any repository methods here.
				repository = repo;
				return repo.fetchAll(myFetchOpts);
			})

			.then(function (err) {
				if (err) {
					errCb(err);
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


				repository.mergeBranches("master", "origin/master", defaultSignature, NodeGit.Merge.PREFERENCE.NONE, mergeOptions)
					.then(function (oid) {
						console.log("Merged " + oid);
						var addedPaths;
						repository.getBranchCommit("master")
							.then(function (oid) {
								console.log("Got Master " + oid);
								// create the branch
								branchName = icao + '_' + Date.now();
								return NodeGit.Branch.create(repository, branchName, oid, 0);
							}
							)
							.then(function (branch) {
								console.log("Setting upstream " + branchName);
								return NodeGit.Branch.setUpstream(branch, branchName);
							})
							.then(function (branch) {
								var refspec = "refs/heads/" + branchName + ":refs/heads/" + branchName;
								console.log("Add RefSpec " + refspec + "   " + branchName);
								return NodeGit.Remote.addPush(repository, "origin", refspec);
							})
							.then(function (reference) {
								console.log("Checking out branch " + "refs/heads/" + branchName);
								return repository.checkoutBranch("refs/heads/" + branchName, {});
							})
							.then(function () {
								return repository.getReferenceCommit(
									"refs/heads/" + branchName);
							})
							.then(function (commit) {
								console.log("Resetting to refs/heads/" + branchName + " " + commit);
								return NodeGit.Reset.reset(repository, commit, NodeGit.Reset.TYPE.HARD, {});
							})
							// Let the file be saved (Callback)
							.then(function () { return saveFunction(); })
							.then(function (paths) {
								if (!paths)
									errCb("saveFunction() returns undefined");
								console.log("Refreshing index " + paths);
								addedPaths = paths.map(p => path.relative(localPath, p));
								addedPaths = addedPaths.map(p => upath.toUnix(p));
								return repository.index();
							})
							.then(function (indexResult) {
								index = indexResult;
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
								return index.write();
							})

							.then(function (errCode) {
								if (errCode) {
									console.error("Error " + errCode);
								}
								return index.writeTree();
							})
							.then(function (oidResult) {
								treeOid = oidResult;
								return NodeGit.Reference.nameToId(repository, "HEAD");
							})
							.then(function (head) {
								console.log("Got Head " + head);
								return repository.getCommit(head);
							})
							.then(async function (parent) {
								const diff = await NodeGit.Diff.treeToIndex(repository, await parent.getTree(), null);
								const patches = await diff.patches();
								if (patches.length < 5) {
									var err = new Error("No difference detected. Is the file different? ");
									//errCb(err);
									throw err;
								}
								console.log(patches.map((patch) => patch.newFile().path()));
								return parent;
							})
							.then(async function (parent) {
								console.log("Oid " + treeOid);
								console.log("Parent Head Commit " + parent);

								var tree = await parent.getTree();
								var author = NodeGit.Signature.now(email, email);
								console.log("Committing to refs/heads/" + branchName  + "\t" + tree );
								
								return repository.createCommit("HEAD", author, committer, "New Groundnet for " + icao, tree, [parent]);
							})
							.then(function (commitOid) {
								console.log("Committed " + commitOid);
								console.log("Switching back to master");
								repository.checkoutBranch("master", {});
								return repository;
							})
							.then(function () {
								return NodeGit.Remote.lookup(repository, "origin");
							})
							.then(function (remote) {
								var refspec = "refs/heads/" + branchName + ":refs/heads/" + branchName;
								console.log("Pushing " + refspec);
								return exports.push(remote, refspec, myFetchOpts, committer);
							})
							.then(function () {
								console.log("Success " + branchName);
								okCb(branchName);
							})
							.catch(errCb);
					}).catch(errCb);

			}).catch(errCb);
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

module.exports.c1 = function () {
	git.Repository.open(appDir)
		.then((repo) => {
			return repo.getBranch('refs/remotes/origin/' + repositoryConfig.branch)
				.then((reference) => {
					return repo.checkoutBranch(reference, {});
				})
				.then(() => {
					return repo.getReferenceCommit('refs/remotes/origin/' + repositoryConfig.branch);
				})
				.then((commit) => {
					git.Reset.reset(repo, commit, 3, {});
				})
				.catch((err) => {
					reject(err);
				});
		})
		.then(() => {
			console.log('Checking out branch ' + repositoryConfig.branch + ' done');
			resolve();
		})
		.catch((err) => {
			reject(err);
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
