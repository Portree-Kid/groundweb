const path = require("path");
const fs = require('fs');
const sha1Hash = require('js-sha1')


module.exports.buildDirIndex = function(currentpath) {
	console.log(`writing .dirindex to ${currentpath}`);
	var absolutePath = path.resolve(currentpath);

	var wstream = fs.openSync(path.join(absolutePath, '.dirindex'), "w+");
	fs.writeSync(wstream, 'version:1\n');
	var cleanedPath = currentpath.slice(1).replace(/\\/g, "/");
	fs.writeSync(wstream, `path:${cleanedPath}\n`);

	fs.readdirSync(absolutePath, { withFileTypes: true })
		.filter(file => file.name != ".dirindex")
		.filter(file => file.name != ".git")
		.forEach(file => {
			console.log(file);
			if (file.isFile()) {
				var sha1 = sha1Hash(fs.readFileSync(path.join(absolutePath, file.name)));
				var size = fs.statSync(path.join(absolutePath, file.name)).size;
				fs.writeSync(wstream, `f:${file.name}:${sha1}:${size}\n`);
			}
			if (file.isDirectory()) {
				var subDir = path.join(absolutePath, file.name);
				fs.readdirSync(subDir, { withFileTypes: true })
					.filter(subfile => subfile.name == ".dirindex")
					.forEach(subfile => {
						if (subfile.isFile()) {
							//					console.log(`Building hash for ${subDir}`);
							var fileContent = fs.readFileSync(path.join(subDir, subfile.name), { encoding: 'ascii' });
							if (!fileContent.startsWith("version:1")) {
								//						console.log(fileContent);
								throw new Error();
							}
							sha1 = sha1Hash(fileContent);
							//					  console.log( path.join(subDir, subfile.name));
							//					  console.log(sha1);
						}
					})
				if(sha1){
					fs.writeSync(wstream, `d:${file.name}:${sha1}\n`);
				}
			}
		})
	fs.closeSync(wstream);
	console.log(`wrote .dirindex to ${currentpath}`);
	return path.join(absolutePath, '.dirindex');
}
