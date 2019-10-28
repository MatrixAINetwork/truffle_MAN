var EcoSystem = artifacts.require("./EcoSystem.sol");
var manUtils = artifacts.require("./manUtils.sol");
module.exports = async function(deployer) {
  await deployer.deploy(manUtils);
  await deployer.link(manUtils,EcoSystem);
  await deployer.deploy(EcoSystem);
};
