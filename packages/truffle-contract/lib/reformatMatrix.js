/**
 * Utilities for reformatting web3 outputs
 */
var manUtils = require("matrix_utils");

const manAddress = function(result, abiSegment) {
  abiSegment.forEach((output, i) => {
    // output is a number type (uint || int);
    if (output.type.includes("address")) {
      // output is an array type
      if (output.type.includes("[")) {
        // result is array
        if (Array.isArray(result)) {
          result =  result.map(item => manUtils.toManAddress(item))
          // result is object
        } else {
          // output has name
          if (output.name.length) {
            result[output.name] = manUtils.toManAddress(result[output.name]);
          }
          // output will always have an index key
          result[i] = manUtils.toManAddress(result[i]);
        }
        //
      } else if (typeof result === "object") {
        // output has name
        if (output.name.length) {
          result[output.name] = manUtils.toManAddress(result[output.name]);
        }
        // output will always have an index key
        result[i] = manUtils.toManAddress(result[i]);
      } else {

        result = manUtils.toManAddress(result);
      }
    }
  });
  return result;
};

module.exports = {
  manAddress: manAddress
};
