import BN from "bn.js";
import { Web3Shim } from "./web3-shim";
import { ContractNewOptions,balanceOutputFormatter,getcodeInputFormatter,InputAddressFormatter,confirmTransaction,getBlockMethod,getTransactionMethod,outputTransactionReceiptFormatter,InputCallFormatter } from  "../src/matrix-override.js";

export const MatrixDefinition = {
  async initNetworkType (web3: Web3Shim) {
//    console.log("Welcome to Matrix AI Network");
    for (let key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        overrides[key](web3);
      }
    }
  }
}

var isStrictAddress = function (address : string) {
  return /^[A-Z]{2,8}\.[0-9a-zA-Z]{18,29}$/i.test(address);
};
var isAddress = function (address : string) {
  if (!(/^[A-Z]{2,8}\.[0-9a-zA-Z]{18,29}$/.test(address))) {
    // check if it has the basic requirements of an address
    return false;
  } else if ((/^[A-Z]{2,8}\.[0-9a-zA-Z]{18,29}$/.test(address))) {
    // If it's all small caps or all all caps, return true
    return true;
  } else {
    // Otherwise check each case
    return address;
  }
};
function bigNumbertoHex(value : string){
  return "0x" + new BN(value).toString(16);
}
function bigNumbertoDecimal(value : string){
  return new BN(value).toString(10);
}

var isBoolean = function (object : any) {
  return typeof object === 'boolean';
};
var isArray = function (object : any) {
  return object instanceof Array;
};
const overrides: { [x: string]: (arg0: Web3Shim) => void } = {
  // The ts-ignores are ignoring the checks that are
  // saying that web3.eth.getBlock is a function and doesn't
  "contractNewOptions": (web3:Web3Shim) => { ContractNewOptions(web3); },
  // "executeMethod":(web3: Web3Shim) => {ContractexecuteMethod (web3);},
  "getAccounts": (web3:Web3Shim) => {
    // @ts-ignore
    web3.eth.getAccounts.method.outputFormatter = accounts => {
      // @ts-ignore
      // Perhaps there is a better method of doing this,
      // but the raw hexstrings work for the time being
        if (typeof accounts === 'string' ||
            (accounts && accounts.constructor && accounts.constructor.name === 'String'))
            return accounts;
      return accounts[0];
    };
  },
  /*
  "getOrSetDefaultOptions" : (web3: Web3Shim) => {
    web3.eth.Contract.prototype._getOrSetDefaultOptions = function getOrSetDefaultOptions(options : any) {
      var gasPrice = options.gasPrice ? String(options.gasPrice): null;
      var from = options.from ? InputAddressFormatter(options.from) : null;

      options.data = options.data || this.options.data;

      options.from = from || this.options.from;
      options.gasPrice = gasPrice || this.options.gasPrice;
      options.gas = options.gas || options.gasLimit || this.options.gas;

      // TODO replace with only gasLimit?
      delete options.gasLimit;

      return options;
    };
  },
  */
  "estimateGas": (web3:Web3Shim) => {
    // @ts-ignore
    web3.eth.estimateGas.method.inputFormatter = [InputCallFormatter];
  },
  "getBalanceInput": (web3:Web3Shim) => {
    // @ts-ignore
    web3.eth.getBalance.method.inputFormatter[0] = InputAddressFormatter;
  },
  "getBalanceOutput": (web3:Web3Shim) => {
    balanceOutputFormatter(web3);
  },
  "sendTransaction": (web3:Web3Shim) => {
    // @ts-ignore
    web3.eth.sendTransaction.method.inputFormatter = [InputCallFormatter];
  },
  "sendTransactionConfirm": (web3:Web3Shim) => {
    // @ts-ignore
    web3.eth.sendTransaction.method._confirmTransaction = confirmTransaction;
  },
  "getTransactionReceipt": (web3:Web3Shim) => {
    // @ts-ignore
    web3.eth.getTransactionReceipt.method.outputFormatter = outputTransactionReceiptFormatter;
  },
  "getBlock": (web3:Web3Shim) => {
    getBlockMethod(web3);
  },
  "getCode": (web3:Web3Shim) => { getcodeInputFormatter(web3); },
  "getTransaction": (web3:Web3Shim) => {
    getTransactionMethod(web3);
  }

};
