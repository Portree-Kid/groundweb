var NodeGit = require("nodegit");
var path = require("path");
var mainRepo = "git@github.com:terrasync/main.git"


var credCallback = function (url, userName) {
	console.log("User : " + userName + " Url : " + url);
	return NodeGit.Cred.sshKeyFromAgent(userName);
}

var committer = NodeGit.Signature.now("Groundweb",
	"terrasync@github.com");


module.exports.clone2 = function (localPath, name, email, saveFunction, errCb, okCb) {
	console.log("Cloning " + localPath);

	// Using the `clone` method from the `Git.Clone` module, bring down the
	// NodeGit
	// test repository from GitHub.
	var cloneURL = "git@github.com:terrasync/main.git";
	var myFetchOpts = {
		callbacks: {
			certificateCheck: function () { return 0; },
			credentials: credCallback,
			transferProgress: function (progress) {
				try {
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
							repository.getBranchCommit("master")
								.then(function (oid) {
									console.log("Got BranchComit " + oid);
									// create the branch
									NodeGit.Branch.create(repository, name, oid, 0).then(function (branch) {
										console.log("Branch " + branch);
										repository.checkoutBranch(branch, {})
									})
										// Let the file be saved
										.then(saveFunction())
										.then(function () {
											return repository.refreshIndex();
										})
										.then(function (indexResult) {
											index = indexResult;
										})
										.then(function () {
											var currentpath = path.join(localPath, "/Airports/");
											currentpath = path.join(currentpath, name[0]);
											currentpath = path.join(currentpath, name[1]);
											currentpath = path.join(currentpath, name[2]);
											index.addByPath(path.resolve(currentpath, name + ".groundnet.xml"));
											console.log(currentpath);
											do {
												index.addByPath(path.resolve(currentpath, ".dirindex"));
												console.log("Added : " + path.resolve(currentpath, ".dirindex"));
											}
											while ((currentpath = path.resolve(currentpath, "..")) != path.resolve(localPath))
										})
										.then(function () {
											return index.addByPath(".dirindex");
										})
										.then(function () {
											// this will write both files to the index
											return index.write();
										})
										.then(function () {
											return index.writeTree();
										})
										.then(function (oidResult) {
											oid = oidResult;
											return NodeGit.Reference.nameToId(repository, "HEAD");
										})
										.then(function (head) {
											console.log("Getting " + head);
											return repository.getCommit(head);
										})
										.then(function (parent) {
											console.log("Oid " + oid);
											console.log("Parent " + parent);

											var author = NodeGit.Signature.now("--",
												email);

											return repository.createCommit("HEAD", author, committer, "New Groundnet for " + name, oid, [parent]).then(() => { return repository }).catch(errCb);
										})
										.then(function (repository) {
											console.log("Switching back to master");
											repository.checkoutBranch("master", {});
											return repository;
										})
										.then(function (repository) {
											console.log("Getting remote");
											return repository.getRemote("origin");
										})
										.then(function (remote) {
											var refspec = "refs/heads/" + name + ":refs/heads/" + name;
											console.log("Add RefSpec " + refspec);
											NodeGit.Remote.addPush(repository, "origin", refspec);
											console.log("Push " + refspec);
											return remote.push(
												["+" + refspec],
												myFetchOpts
												, committer, "Push to master"
											);
										})
										.catch(errCb)
									    .then( okCb);
								})
								.catch(errCb)
						}).catch(errCb);
				}).catch(errCb);
		});
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

module.exports.removeBranch = function (localPath, name) {
	console.log("Removing Branch " + name);
	NodeGit.Repository.open(localPath)
		.then(function (repository) {
			console.log("Switching to master");
			repository.checkoutBranch("master", {});
			return repository;
		})
		.then(function (repository) {
			console.log("Getting Branch " + name);
			return repository.getBranch(name);
		})
		.then(function (reference) {
			console.log("Removing Branch " + reference);
			// remote.push(':refs/heads/my-branch');
			NodeGit.Branch.delete(reference);
			console.log("Removed Branch " + reference);
		})
		.catch((err) => {
			console.log(err);
		});
}
