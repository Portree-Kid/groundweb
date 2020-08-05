const path = require("path");
const fs = require('fs');
const util = require('util');
const sha1Hash = require('js-sha1')

module.exports.buildDirIndex = function(currentpath) {
	try {
		console.log(`writing .dirindex to ${currentpath} with ${JSON.stringify(process.versions)}`);
		var absolutePath = path.resolve(currentpath);
	
		var wstream = fs.openSync(path.join(absolutePath, '.dirindex'), "w+");
		fs.writeSync(wstream, 'version:1\n');
		var cleanedPath = currentpath.slice(1).replace(/\\/g, "/").replace(/.*Airports/g,'Airports').replace(/\/$/g,'');
		fs.writeSync(wstream, `path:${cleanedPath}\n`);
	
		fs.readdirSync(absolutePath, {encoding: 'utf8', withFileTypes: true})
			.filter(file => file.name !== ".dirindex")
			.filter(file => file.name !== ".git")
			.forEach(file => {
//				console.log('*****************\r\n');				
//				console.log(util.inspect(file) + '\r\n');
//				console.log(typeof file + '\r\n');			
				if (file.isFile()) {
					var fileContent = fs.readFileSync(path.join(absolutePath, file.name)).toString().replace(/\r\n/g,'\n');
					if (fileContent.charCodeAt(0) === 0xFEFF) {
						fileContent = fileContent.slice(1);
					}
   					var sha1 = sha1Hash(fileContent);
                	var size = fileContent.length;
					fs.writeSync(wstream, `f:${file.name}:${sha1}:${size}\n`);
				}
				else if (file.isDirectory()) {
					var subDir = path.join(absolutePath, file.name);
					fs.readdirSync(subDir, { withFileTypes: true })
						.filter(subfile => subfile.name == ".dirindex")
						.forEach(subfile => {
							if (subfile.isFile()) {
								//					console.log(`Building hash for ${subDir}`);
								var fileContent = fs.readFileSync(path.join(subDir, subfile.name), { encoding: 'ascii' }).toString();
								fileContent = fileContent.replace(/\r\n/g,'\n');
								if (!fileContent.startsWith("version:1")) {
								    //console.log(fileContent);
									throw new Error();
								}
								if( fileContent.indexOf('f:') > 0 || fileContent.indexOf('d:') > 0) {
									sha1 = sha1Hash(fileContent);
								}
								else {
									console.log(fileContent);
								}
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
	} catch (error) {
		console.error(error);
		if(wstream !==undefined) {
			fs.closeSync(wstream);
		}
		throw error;
	}
}
