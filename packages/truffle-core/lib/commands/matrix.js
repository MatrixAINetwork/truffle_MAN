const exec = require("child_process").execSync;
const command = {
    command: "matrix",
    description:
        "Download Matrix AI Netwok Debug Chain Node and Browser and running them.\n"+
        "The URL of blochain explorer is http://127.0.0.1:3000",
    builder: {},
    help: {
        usage: "truffle matrix",
        options: []
    },
    run: function(options, done) {
        console.log("docker pulling docker.io/dockermatrix123/matrix:matrixv3 ...");
        exec(`docker pull docker.io/dockermatrix123/matrix:matrixv3`);
        console.log("docker running docker.io/dockermatrix123/matrix:matrixv3 and matrix Browser ...");
        let dockerBrowser = exec(`docker run -itd -p 8080:80 -p 3000:3000 -p 8343:8343 -p 8567:8567 docker.io/dockermatrix123/matrix:matrixv3  /bin/sh -c /etc/init.d/app/simplemode/all.sh`);
        console.log("docker ID :",dockerBrowser.toString());
        console.log("Done");
    }
};
module.exports = command;
