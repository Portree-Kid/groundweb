const axios = require('axios')

var uname = process.env.GIT_USER;
var pass = process.env.API_KEY;

module.exports.load =
    function (branch, email) {
        var dat = {
            title : branch, 
            body : "Submitted by " + email,
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
/**
 *             "title" : 'Changed groundweb for  ' + branch, 
            "body" : 'Posted by ' + email, 
            head: branch, 
            base : 'master'

 */
