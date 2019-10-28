var Method = require('web3-core-method');
var _ = require('underscore');
var utils = require('web3-utils');
var formatters = require('web3-core-helpers').formatters;
var promiEvent = require('web3-core-promievent');
var Subscriptions = require('web3-core-subscriptions').subscriptions;
var manUtils = require("matrix_utils");
var matrixContract = require("matrix-contract");
var CONFIRMATIONBLOCKS = 3;
var TIMEOUTBLOCK = 10;
var POLLINGTIMEOUT = 50 * TIMEOUTBLOCK; // ~average block time (seconds) * TIMEOUTBLOCK
var isStrictAddress = function (address) {
  return /^[A-Z]{2,8}\.[0-9a-zA-Z]{18,29}$/i.test(address);
};
var isAddress = function (address) {
  if (!(/^[A-Z]{2,8}\.[0-9a-zA-Z]{18,29}$/.test(address))) {
    // check if it has the basic requirements of an address
    return false;
  }
  else if ((/^[A-Z]{2,8}\.[0-9a-zA-Z]{18,29}$/.test(address))) {
    // If it's all small caps or all all caps, return true
    return true;
  }
  else {
    // Otherwise check each case
    return address;
  }
};
var inputDefaultCurrency = function (currency) {
  if (currency === undefined || currency === null) {
    return "MAN";
  }
  return currency;
};
export function InputAddressFormatter(address) {
  if (isStrictAddress(address)) {
    return address;
  }
  else if (isAddress(address)) {
    return address;
  }
  else {
    return manUtils.toManAddress(address);
  }
  throw new Error('invalid address');
};

var inputAddressFormatter = InputAddressFormatter;
var _txInputFormatter = function (options) {
  if (options.to) { // it might be contract creation
    options.to = inputAddressFormatter(options.to);
  }
  if (options.data && options.input) {
    throw new Error('You can\'t have "data" and "input" as properties of transactions at the same time, please use either "data" or "input" instead.');
  }
  if (!options.data && options.input) {
    options.data = options.input;
    delete options.input;
  }
  if (!options.currency) {
    options.currency = "MAN";
  }
  if (options.data && !utils.isHex(options.data)) {
    throw new Error('The data field must be HEX encoded data.');
  }
  // allow both
  if (options.gas || options.gasLimit) {
    options.gas = options.gas || options.gasLimit;
  }
  ['gasPrice', 'gas', 'value', 'nonce'].filter(function (key) {
    return options[key] !== undefined;
  }).forEach(function (key) {
    options[key] = utils.numberToHex(options[key]);
  });
  return options;
};
/**
 * Formats the input of a transaction and converts all values to HEX
 *
 * @method inputCallFormatter
 * @param {Object} transaction options
 * @returns object
 */
export function InputCallFormatter (options) {
  options = _txInputFormatter(options);
  var from = options.from || (this ? this.defaultAccount : null);
  if (from) {
    options.from = inputAddressFormatter(from);
  }
  return options;
};
var inputCallFormatter = InputCallFormatter;
export function getBlockMethod(web3) {
  web3.eth.getBlock.method.outputFormatter = block => {
    // transform to number
    block.gasLimit = utils.hexToNumber(block.gasLimit);
    block.gasUsed = utils.hexToNumber(block.gasUsed);
    block.size = utils.hexToNumber(block.size);
    block.timestamp = utils.hexToNumber(block.timestamp);
    if (block.number !== null)
      block.number = utils.hexToNumber(block.number);
    block.difficulty = utils.hexToNumber(block.difficulty);
    block.totalDifficulty = utils.hexToNumber(block.totalDifficulty);
    // block.version=buffer.from(block.version,"ascii").toString();
    //      block.version = utils.toAscii(block.version);
    //block.version=new String(block.version);
    if (block.versionSignatures instanceof Array) {
      for (var i = 0; i < block.versionSignatures.length; i++) {
        var temp = block.versionSignatures[i];
        block.versionSignatures[i] = "0x";
        for (var j = 0; j < temp.length; j++) {
          var n = temp[j].toString(16);
          block.versionSignatures[i] += n.length < 2 ? '0' + n : n;
        }
      }
    }
    if (block.transactions instanceof Array) {
      for (var i = 0; i < block.transactions.length; i++) {
        if (typeof block.transactions[i] !== 'string')
          var tx = block.transactions[i];
        if (tx.blockNumber !== null)
          tx.blockNumber = utils.hexToNumber(tx.blockNumber);
        if (tx.transactionIndex !== null)
          tx.transactionIndex = utils.hexToNumber(tx.transactionIndex);
        tx.nonce = utils.hexToNumber(tx.nonce);
        tx.gas = utils.hexToNumber(tx.gas);
        tx.gasPrice = utils.hexToNumber(tx.gasPrice);
        tx.value = utils.hexToNumber(tx.value);
        for (var i = 0; tx.extra_to && i < tx.extra_to.length; i++) {
          tx.extra_to[i].value = utils.hexToNumber(tx.extra_to[i].value);
        }
      }
    }
    return block;
  };
}
export function getTransactionMethod(web3) {
  web3.eth.getTransaction.method.outputFormatter = tx => {
    if (tx.blockNumber !== null)
      tx.blockNumber = utils.hexToNumber(tx.blockNumber);
    if (tx.transactionIndex !== null)
      tx.transactionIndex = utils.hexToNumber(tx.transactionIndex);
    tx.nonce = utils.hexToNumber(tx.nonce);
    tx.gas = utils.hexToNumber(tx.gas);
    tx.gasPrice = utils.hexToNumber(tx.gasPrice);
    tx.value = utils.hexToNumber(tx.value);
    if (tx.to && isAddress(tx.to)) { // tx.to could be `0x0` or `null` while contract creation
    }
    else {
      tx.to = null; // set to `null` if invalid address
    }
    for (var i = 0; tx.extra_to && i < tx.extra_to.length; i++) {
      tx.extra_to[i].value = utils.hexToNumber(tx.extra_to[i].value);
    }
    return tx;
  };

}
export function ContractNewOptions(web3) {
  web3.eth.Contract = matrixContract;
  web3.eth.Contract.setProvider(web3.currentProvider);
}
export function ContractexecuteMethod(web3) {
  web3.eth.Contract.prototype._executeMethod = function () {
    var _this = this, args = this._parent._processExecuteArguments.call(this, Array.prototype.slice.call(arguments), defer), defer = promiEvent((args.type !== 'send')), ethAccounts = _this.constructor._ethAccounts || _this._ethAccounts;
    // simple return request for batch requests
    if (args.generateRequest) {
      var payload = {
        params: [inputCallFormatter.call(this._parent, args.options)],
        callback: args.callback
      };
      if (args.type === 'call') {
        payload.params.push(formatters.inputDefaultBlockNumberFormatter.call(this._parent, args.defaultBlock));
        payload.method = 'eth_call';
        payload.format = this._parent._decodeMethodReturn.bind(null, this._method.outputs);
      }
      else {
        payload.method = 'eth_sendTransaction';
      }
      return payload;
    }
    else {
      switch (args.type) {
        case 'estimate':
          var estimateGas = (new Method({
            name: 'estimateGas',
            call: 'eth_estimateGas',
            params: 1,
            inputFormatter: [inputCallFormatter],
            outputFormatter: utils.hexToNumber,
            requestManager: _this._parent._requestManager,
            accounts: ethAccounts,
            defaultAccount: _this._parent.defaultAccount,
            defaultBlock: _this._parent.defaultBlock
          })).createFunction();
          return estimateGas(args.options, args.callback);
        case 'call':
          // TODO check errors: missing "from" should give error on deploy and send, call ?
          var call = (new Method({
            name: 'call',
            call: 'eth_call',
            params: 2,
            inputFormatter: [inputCallFormatter, formatters.inputDefaultBlockNumberFormatter],
            // add output formatter for decoding
            outputFormatter: function (result) {
              return _this._parent._decodeMethodReturn(_this._method.outputs, result);
            },
            requestManager: _this._parent._requestManager,
            accounts: ethAccounts,
            defaultAccount: _this._parent.defaultAccount,
            defaultBlock: _this._parent.defaultBlock
          })).createFunction();
          return call(args.options, args.defaultBlock, args.callback);
        case 'send':
          // return error, if no "from" is specified
          if (!isAddress(args.options.from)) {
            return utils._fireError(new Error('No "from" address specified in neither the given options, nor the default options.'), defer.eventEmitter, defer.reject, args.callback);
          }
          if (utils.isBoolean(this._method.payable) && !this._method.payable && args.options.value && args.options.value > 0) {
            return utils._fireError(new Error('Can not send value to non-payable contract method or constructor'), defer.eventEmitter, defer.reject, args.callback);
          }
          // make sure receipt logs are decoded
          var extraFormatters = {
            receiptFormatter: function (receipt) {
              if (_.isArray(receipt.logs)) {
                // decode logs
                var events = _.map(receipt.logs, function (log) {
                  return _this._parent._decodeEventABI.call({
                    name: 'ALLEVENTS',
                    jsonInterface: _this._parent.options.jsonInterface
                  }, log);
                });
                // make log names keys
                receipt.events = {};
                var count = 0;
                events.forEach(function (ev) {
                  if (ev.event) {
                    // if > 1 of the same event, don't overwrite any existing events
                    if (receipt.events[ev.event]) {
                      if (Array.isArray(receipt.events[ev.event])) {
                        receipt.events[ev.event].push(ev);
                      }
                      else {
                        receipt.events[ev.event] = [receipt.events[ev.event], ev];
                      }
                    }
                    else {
                      receipt.events[ev.event] = ev;
                    }
                  }
                  else {
                    receipt.events[count] = ev;
                    count++;
                  }
                });
                delete receipt.logs;
              }
              return receipt;
            },
            contractDeployFormatter: function (receipt) {
              var newContract = _this._parent.clone();
              newContract.options.address = receipt.contractAddress;
              return newContract;
            }
          };
          var sendTransaction = (new Method({
            name: 'sendTransaction',
            call: 'eth_sendTransaction',
            params: 1,
            inputFormatter: [inputCallFormatter],
            requestManager: _this._parent._requestManager,
            accounts: _this.constructor._ethAccounts || _this._ethAccounts,
            defaultAccount: _this._parent.defaultAccount,
            defaultBlock: _this._parent.defaultBlock,
            extraFormatters: extraFormatters
          })).createFunction();
          return sendTransaction(args.options, args.callback);
      }
    }
  };
};
/**
 * Formats the output of a log
 *
 * @method outputLogFormatter
 * @param {Object} log object
 * @returns {Object} log
 */
var outputLogFormatter = function (log) {
  // generate a custom log id
  if (typeof log.blockHash === 'string' &&
      typeof log.transactionHash === 'string' &&
      typeof log.logIndex === 'string') {
    var shaId = utils.sha3(log.blockHash.replace('0x', '') + log.transactionHash.replace('0x', '') + log.logIndex.replace('0x', ''));
    log.id = 'log_' + shaId.replace('0x', '').substr(0, 8);
  }
  else if (!log.id) {
    log.id = null;
  }
  if (log.blockNumber !== null)
    log.blockNumber = utils.hexToNumber(log.blockNumber);
  if (log.transactionIndex !== null)
    log.transactionIndex = utils.hexToNumber(log.transactionIndex);
  if (log.logIndex !== null)
    log.logIndex = utils.hexToNumber(log.logIndex);
  return log;
};

/**
 * Formats the output of a transaction receipt to its proper values
 *
 * @method outputTransactionReceiptFormatter
 * @param {Object} receipt
 * @returns {Object}
 */
export function outputTransactionReceiptFormatter(receipt) {
  if (typeof receipt !== 'object') {
    throw new Error('Received receipt is invalid: ' + receipt);
  }
  if (receipt.blockNumber !== null)
    receipt.blockNumber = utils.hexToNumber(receipt.blockNumber);
  if (receipt.transactionIndex !== null)
    receipt.transactionIndex = utils.hexToNumber(receipt.transactionIndex);
  receipt.cumulativeGasUsed = utils.hexToNumber(receipt.cumulativeGasUsed);
  receipt.gasUsed = utils.hexToNumber(receipt.gasUsed);
  if (_.isArray(receipt.logs) && receipt.logs.length > 0) {
    receipt.logs = receipt.logs.map(outputLogFormatter);
  }
  if (typeof receipt.status !== 'undefined') {
    receipt.status = Boolean(parseInt(receipt.status));
  }
   return receipt;
};
/**
 * Formats the output of a block to its proper values
 *
 * @method outputBlockFormatter
 * @param {Object} block
 * @returns {Object}
 */
var outputBlockFormatter = function (block) {
  // transform to number
  block.gasLimit = utils.toDecimal(block.gasLimit);
  block.gasUsed = utils.toDecimal(block.gasUsed);
  block.size = utils.toDecimal(block.size);
  block.timestamp = utils.toDecimal(block.timestamp);
  if (block.number !== null)
    block.number = utils.toDecimal(block.number);
  block.difficulty = utils.toBN(block.difficulty);
  //  console.log(block.totalDifficulty);
  //  block.totalDifficulty = utils.toBN(block.totalDifficulty);
  if (_.isArray(block.transactions)) {
    block.transactions.forEach(function (item) {
      if (!utils.isString(item))
        return outputTransactionFormatter(item);
    });
  }
  return block;
};
export function confirmTransaction(defer, result, payload) {
  var method = this, promiseResolved = false, canUnsubscribe = true, timeoutCount = 0, confirmationCount = 0, intervalId = null, receiptJSON = '', gasProvided = (_.isObject(payload.params[0]) && payload.params[0].gas) ? payload.params[0].gas : null, isContractDeployment = _.isObject(payload.params[0]) &&
      payload.params[0].data &&
      payload.params[0].from &&
      !payload.params[0].to;
  // add custom send Methods
  var _ethereumCalls = [
    new Method({
      name: 'getTransactionReceipt',
      call: 'eth_getTransactionReceipt',
      params: 1,
      inputFormatter: [null],
      outputFormatter: outputTransactionReceiptFormatter
    }),
    new Method({
      name: 'getCode',
      call: 'eth_getCode',
      params: 3,
      inputFormatter: [inputAddressFormatter, inputDefaultCurrency, formatters.inputDefaultBlockNumberFormatter]
    }),
    new Subscriptions({
      name: 'subscribe',
      type: 'eth',
      subscriptions: {
        'newBlockHeaders': {
          subscriptionName: 'newHeads',
          params: 0,
          outputFormatter: outputBlockFormatter
        }
      }
    })
  ];
  // attach methods to this._ethereumCall
  var _ethereumCall = {};
  _.each(_ethereumCalls, function (mthd) {
    mthd.attachToObject(_ethereumCall);
    mthd.requestManager = method.requestManager; // assign rather than call setRequestManager()
  });
  // fire "receipt" and confirmation events and resolve after
  var checkConfirmation = function (existingReceipt, isPolling, err, blockHeader, sub) {
    if (!err) {
      // create fake unsubscribe
      if (!sub) {
        sub = {
          unsubscribe: function () {
            clearInterval(intervalId);
          }
        };
      }
      // if we have a valid receipt we don't need to send a request
      return (existingReceipt ? promiEvent.resolve(existingReceipt) : _ethereumCall.getTransactionReceipt(result))
      // catch error from requesting receipt
          .catch(function (err) {
            sub.unsubscribe();
            promiseResolved = true;
            utils._fireError({
              message: 'Failed to check for transaction receipt:',
              data: err
            }, defer.eventEmitter, defer.reject);
          })
          // if CONFIRMATION listener exists check for confirmations, by setting canUnsubscribe = false
          .then(function (receipt) {
            if (!receipt || !receipt.blockHash) {
              throw new Error('Receipt missing or blockHash null');
            }
            // apply extra formatters
            if (method.extraFormatters && method.extraFormatters.receiptFormatter) {
              receipt = method.extraFormatters.receiptFormatter(receipt);
            }
            // check if confirmation listener exists
            if (defer.eventEmitter.listeners('confirmation').length > 0) {
              // If there was an immediately retrieved receipt, it's already
              // been confirmed by the direct call to checkConfirmation needed
              // for parity instant-seal
              if (existingReceipt === undefined || confirmationCount !== 0) {
                defer.eventEmitter.emit('confirmation', confirmationCount, receipt);
              }
              canUnsubscribe = false;
              confirmationCount++;
              if (confirmationCount === CONFIRMATIONBLOCKS + 1) { // add 1 so we account for conf 0
                sub.unsubscribe();
                defer.eventEmitter.removeAllListeners();
              }
            }
            return receipt;
          })
          // CHECK for CONTRACT DEPLOYMENT
          .then(function (receipt) {
            if (isContractDeployment && !promiseResolved) {
              if (!receipt.contractAddress) {
                if (canUnsubscribe) {
                  sub.unsubscribe();
                  promiseResolved = true;
                }
                utils._fireError(new Error('The transaction receipt didn\'t contain a contract address.'), defer.eventEmitter, defer.reject);
                return;
              }
              _ethereumCall.getCode(receipt.contractAddress, function (e, code) {
                if (!code) {
                  return;
                }
                if (code.length > 2) {
                  defer.eventEmitter.emit('receipt', receipt);
                  // if contract, return instance instead of receipt
                  if (method.extraFormatters && method.extraFormatters.contractDeployFormatter) {
                    defer.resolve(method.extraFormatters.contractDeployFormatter(receipt));
                  }
                  else {
                    defer.resolve(receipt);
                  }
                  // need to remove listeners, as they aren't removed automatically when succesfull
                  if (canUnsubscribe) {
                    defer.eventEmitter.removeAllListeners();
                  }
                }
                else {
                  console.log("The contract code couldn\'t be stored, please check your gas limit.");
                  utils._fireError(new Error('The contract code couldn\'t be stored, please check your gas limit.'), defer.eventEmitter, defer.reject);
                }
                if (canUnsubscribe) {
                  sub.unsubscribe();
                }
                promiseResolved = true;
              });
            }
            return receipt;
          })
          // CHECK for normal tx check for receipt only
          .then(function (receipt) {
            if (!isContractDeployment && !promiseResolved) {
              if (!receipt.outOfGas &&
                  (!gasProvided || gasProvided !== receipt.gasUsed) &&
                  (receipt.status === true || receipt.status === '0x1' || typeof receipt.status === 'undefined')) {
                defer.eventEmitter.emit('receipt', receipt);
                defer.resolve(receipt);
                // need to remove listeners, as they aren't removed automatically when succesfull
                if (canUnsubscribe) {
                  defer.eventEmitter.removeAllListeners();
                }
              }
              else {
                receiptJSON = JSON.stringify(receipt, null, 2);
                if (receipt.status === false || receipt.status === '0x0') {
                  utils._fireError(new Error("Transaction has been reverted by the EVM:\n" + receiptJSON), defer.eventEmitter, defer.reject);
                }
                else {
                  utils._fireError(new Error("Transaction ran out of gas. Please provide more gas:\n" + receiptJSON), defer.eventEmitter, defer.reject);
                }
              }
              if (canUnsubscribe) {
                sub.unsubscribe();
              }
              promiseResolved = true;
            }
          })
          // time out the transaction if not mined after 50 blocks
          .catch(function () {
            timeoutCount++;
            // check to see if we are http polling
            if (!!isPolling) {
              // polling timeout is different than TIMEOUTBLOCK blocks since we are triggering every second
              if (timeoutCount - 1 >= POLLINGTIMEOUT) {
                sub.unsubscribe();
                promiseResolved = true;
                utils._fireError(new Error('Transaction was not mined within' + POLLINGTIMEOUT + ' seconds, please make sure your transaction was properly sent. Be aware that it might still be mined!'), defer.eventEmitter, defer.reject);
              }
            }
            else {
              if (timeoutCount - 1 >= TIMEOUTBLOCK) {
                sub.unsubscribe();
                promiseResolved = true;
                utils._fireError(new Error('Transaction was not mined within 50 blocks, please make sure your transaction was properly sent. Be aware that it might still be mined!'), defer.eventEmitter, defer.reject);
              }
            }
          });
    }
    else {
      sub.unsubscribe();
      promiseResolved = true;
      utils._fireError({
        message: 'Failed to subscribe to new newBlockHeaders to confirm the transaction receipts.',
        data: err
      }, defer.eventEmitter, defer.reject);
    }
  };
  // start watching for confirmation depending on the support features of the provider
  var startWatching = function (existingReceipt) {
    // if provider allows PUB/SUB
    if (_.isFunction(this.requestManager.provider.on)) {
      _ethereumCall.subscribe('newBlockHeaders', checkConfirmation.bind(null, existingReceipt, false));
    }
    else {
      intervalId = setInterval(checkConfirmation.bind(null, existingReceipt, true), 1000);
    }
  }.bind(this);
  // first check if we already have a confirmed transaction
  _ethereumCall.getTransactionReceipt(result)
      .then(function (receipt) {
        if (receipt && receipt.blockHash) {
          if (defer.eventEmitter.listeners('confirmation').length > 0) {
            // We must keep on watching for new Blocks, if a confirmation listener is present
            startWatching(receipt);
          }
          checkConfirmation(receipt, false);
        }
        else if (!promiseResolved) {
          startWatching();
        }
      })
      .catch(function () {
        if (!promiseResolved)
          startWatching();
      });
}

export function balanceOutputFormatter(web3) {
  web3.eth.getBalance.method.formatOutput = function (params) {
    if (params.length > 0) {
      return utils.toBN(params[0].balance);
    }
    return 0;
  };
}
export function  getcodeInputFormatter(web3) {
  web3.eth.getCode.method.params = 3;
  web3.eth.getCode.method.formatInput = function (args) {
    var _this = this;
    let inputFormatter = [inputAddressFormatter, inputDefaultCurrency, formatters.inputDefaultBlockNumberFormatter];
    if (args.length == 2) {
      args.splice(1, 0, undefined);
    }
    return inputFormatter.map(function (formatter, index) {
      // bind this for defaultBlock, and defaultAccount
      return formatter ? formatter.call(_this, args[index]) : args[index];
    });
  };
}
