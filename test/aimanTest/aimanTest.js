let aiman = require("aiman");
let Rpc = "http://127.0.0.1:8341";
let man = new aiman(new aiman.providers.HttpProvider(Rpc));
let ccc = man.man.net.getId();
console.log(ccc)