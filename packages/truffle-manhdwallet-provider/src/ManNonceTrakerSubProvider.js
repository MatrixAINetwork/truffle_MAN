const NonceSubProvider = require("web3-provider-engine/subproviders/nonce-tracker.js");
const ManTx = require("matrixjs-tx");
var manUtils = require("matrix_utils");
const ethUtil = require('ethereumjs-util');
function newNonceSubProvider(chainId) {
    let provider = new NonceSubProvider();
    provider.handleRequest = function(payload, next, end) {
        const self = provider

        switch (payload.method) {

            case 'eth_getTransactionCount':
                var blockTag = payload.params.length > 1 ? payload.params[1] : null;
                var address = payload.params[0];
                var cachedResult = self.nonceCache[address];
                // only handle requests against the 'pending' blockTag
                if (blockTag === 'pending') {
                    payload.params[1] = "latest";
                    // has a result
                    if (cachedResult) {
                        end(null, cachedResult)
                        // fallthrough then populate cache
                    } else {
                        next(function (err, result, cb) {
                            if (err) return cb()
                            if (self.nonceCache[address] === undefined) {
                                self.nonceCache[address] = result
                            }
                            cb()
                        })
                    }
                } else {
                    next()
                }
                return

            case 'eth_sendRawTransaction':
                // allow the request to continue normally
                next(function (err, result, cb) {
                    // only update local nonce if tx was submitted correctly
                    if (err) return cb()
                    // parse raw tx
                    let txParams = payload.params[0]
                    if (!txParams.TxEnterType){
                        txParams.TxEnterType = '';
                    }
                    if (!txParams.IsEntrustTx){
                        txParams.IsEntrustTx = '';
                    }
                    if (!txParams.CommitTime){
                        txParams.CommitTime = 10;
                    }
                    if (txParams.extra_to == undefined || txParams.extra_to.length == 0) {
                        txParams.extra_to = [[txParams.txType, txParams.lockHeight, []]];
                    }
                    txParams.chainId = chainId;
                    var tx = new ManTx(txParams)
                    // extract address
                    var address = tx.getSenderAddress();
                    address = manUtils.toManAddress(address.toString("hex"));
                    // extract nonce and increment
                    var nonce = ethUtil.bufferToInt(tx.nonce)
                    nonce++
                    // hexify and normalize
                    var hexNonce = nonce.toString(16)
                    if (hexNonce.length % 2) hexNonce = '0' + hexNonce
                    hexNonce = '0x' + hexNonce
                    // dont update our record on the nonce until the submit was successful
                    // update cache
                    self.nonceCache[address] = hexNonce
                    cb()
                })
                return

            default:
                next()
                return

        }
    }
    return provider;
}
module.exports = newNonceSubProvider;