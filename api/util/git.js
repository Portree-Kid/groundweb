var NodeGit = require("nodegit");
var path = require("path");
var upath = require("upath");
var mainRepo = "git@github.com:terrasync/main-test.git"


var credCallback = function (url, userName) {
	console.log("User : " + userName + " Url : " + url);
	return NodeGit.Cred.sshKeyFromAgent(userName);
}

var addCb = function (obj) {
	console.log("OBJ : " + JSON.stringify(obj));
}

var committer = NodeGit.Signature.now("Groundweb",
	"terrasync@github.com");


module.exports.workflow = function (localPath, name, email, saveFunction, errCb, okCb) {
	console.log("Cloning " + localPath);

	// Using the `clone` method from the `Git.Clone` module, bring down the
	// NodeGit
	// test repository from GitHub.
	var cloneURL = "git@github.com:terrasync/main.git";
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

	// Invoke the clone operation and store the returned Promise.
	var cloneRepository = NodeGit.Clone(cloneURL, localPath, cloneOptions);

	// If the repository already exists, the clone above will fail. You can
	// simply
	// open the repository in this case to continue execution.
	var errorAndAttemptOpen = function (Err) {
		console.log("Attempting to open " + Err);
		return NodeGit.Repository.open(localPath);
	};

	var branchName;
	// Once the repository has been cloned or opened, you can work with a
	// returned
	// `Git.Repository` instance.
	cloneRepository.catch(errorAndAttemptOpen)
		.then(function (repository) {
			console.log("Got Repository");
			// Access any repository methods here.
			repository.fetchAll(myFetchOpts)
				.then(function () {
					console.log("Fetched");
					var mergeOptions = new NodeGit.MergeOptions();
					repository.mergeBranches("master", "origin/master", NodeGit.Signature.default(repository), NodeGit.Merge.PREFERENCE.NONE, mergeOptions)
						.then(function (oid) {
							console.log("Merged " + oid);
							var addedPaths;
							repository.getBranchCommit("master")
								.then(function (oid) {
									console.log("Got Master " + oid);
									// create the branch
									branchName = name + '_' + Date.now();
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
									return NodeGit.Reset.reset(repository, commit, 3, {});
								})
								// Let the file be saved
								.then(function () { return saveFunction(); })
								.then(function (paths) {
									console.log("Refreshing index " + paths);
									addedPaths = paths.map(p => path.relative(localPath, p));
									addedPaths = addedPaths.map(p => upath.toUnix(p));
									return repository.index();
								})
								.then(function (indexResult) {
									index = indexResult;
									addedPaths.forEach(element => {
										await index.addByPath(element);
										await index.write(); 
										console.log("Added : " + JSON.stringify(element));
									});
									//									var result = 
									//									index.addAll(addedPaths, 5, addCb);
									//.then((result)=>{console.log("Added All : " + JSON.stringify(result));}).catch(errCb);
									//									console.log("Added All : " + JSON.stringify(result));
									return index.write();
								})
								.then(function () {
									return index.writeTree();
								})
								.then((oidResult) => {
									treeOid = oidResult;
									return NodeGit.Reference.nameToId(repository, "HEAD");
								})
								.then(function (head) {
									console.log("Got Head " + head);
									return repository.getCommit(head);
								})
								.then(function (parent) {
									console.log("Oid " + treeOid);
									console.log("Parent Head Commit " + parent);

									var author = NodeGit.Signature.now(email,
										email);
									console.log("Committing to refs/heads/" + branchName);
									return repository.createCommit("HEAD", author, committer, "New Groundnet for " + name,
										treeOid, [parent]);
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
									return remote.push(
										["+" + refspec],
										myFetchOpts
										, committer, "Push to " + refspec
									);
								})
								.then(function () {
									console.log(branchName);
									okCb(branchName);
								})
								.catch(errCb);
						}).catch(errCb);
				}).catch(errCb);
		}).catch(errCb);
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
