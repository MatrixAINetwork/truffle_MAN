var MBCToken = artifacts.require("./MBCToken.sol");
module.exports = async function(deployer) {
  deployer.deploy(MBCToken);
};
