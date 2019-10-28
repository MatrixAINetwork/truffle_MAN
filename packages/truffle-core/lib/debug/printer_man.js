var manUtils  = require("matrix_utils");
var OS = require("os");
const selectors = require("truffle-debugger").selectors;
const { session } = selectors;
const { DebugPrinter } = require("./printer");

function startWith(str,subStr)
{
  if(subStr==null||subStr==""||str.length==0||subStr.length>str.length)
    return false;
  if(str.substr(0,subStr.length)==subStr)
    return true;
  else
    return false;
  return true;
}
class MatrixPrinter extends DebugPrinter{
  constructor(config, session) {
    super(config,session);
  }

  printAddressesAffected() {
    const affectedInstances = this.session.view(session.info.affectedInstances);

    this.config.logger.log("");
    this.config.logger.log("Addresses called: (not created)");
    this.config.logger.log(
        this.formatAffectedInstances(affectedInstances)
    );
  }
  formatAffectedInstances(instances) {
    var hasAllSource = true;

    var lines = Object.keys(instances).map(function(address) {
      var instance = instances[address];
      if (startWith(address,"0x")|| startWith(address,"0X")){
        address = manUtils.toManAddress(address);
      }

      if (instance.contractName) {
        return " " + address + " - " + instance.contractName;
      }

      if (!instance.source) {
        hasAllSource = false;
      }

      return " " + address + "(UNKNOWN)";
    });

    if (!hasAllSource) {
      lines.push("");
      lines.push(
          "Warning: The source code for one or more contracts could not be found."
      );
    }

    return lines.join(OS.EOL);
  }


}

module.exports = {
  MatrixPrinter
};
