const axios = require('axios')

var uname = process.env.GIT_USER;
var pass = process.env.API_KEY;

module.exports.createPullRequest =
    function (branch, fileType, icao, email) {
        var dat = {
            title : `New ${fileType} for ${icao}`, 
            body : `A new ${fileType} has been submitted by ${email}. `,
            head: branch, 
            base : 'master'
        };

        return axios.post('https://api.github.com/repos/terrasync/main/pulls', 
            dat,
            {
                auth: {
                    username: uname,
                    password: pass
                }
            }
        )
    }
