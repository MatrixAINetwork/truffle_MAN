const HDWalletProvider = require('truffle-hdwallet-provider');
const ManTx = require("matrixjs-tx");
var manUtils = require("matrix_utils");
let newProvider = require("./ManNonceTrakerSubProvider");
let singletonNonceSubProvider = null;
class MANHDWalletProvider extends HDWalletProvider{
  constructor(
    chainId,
    mnemonic,
    provider,
    address_index = 0,
    num_addresses = 1,
    shareNonce = true,
    wallet_hdpath = "m/44'/60'/0'/0/"
  ) {
    super(mnemonic, provider, address_index, num_addresses, shareNonce, wallet_hdpath);
    this.chainId = chainId;
    let wallets = this.wallets;
    let addresses = this.addresses;
    this.wallets = {};
    for (var i=0;i<addresses;i++){
      let address = addresses[i];
      let manAddr = manUtils.toManAddress(address);
      this.addresses[i] =manAddr;
      this.wallets[manAddr] = wallets[address];
    }
    if (!singletonNonceSubProvider){
      singletonNonceSubProvider = newProvider(chainId);
    }
    this.engine._providers[1] = !shareNonce ? newProvider(chainId)  : singletonNonceSubProvider;

    let hookedProvider = this.engine._providers[0];
//    this.engine._providers = [hookedProvider];
    const tmp_wallets = this.wallets;
    const tmp_accounts = this.addresses;

    hookedProvider.signTransaction = function (txParams, cb) {
      let pkey;
      const from = txParams.from;
      txParams.chainId = chainId;
      if (tmp_wallets[from]) {
        pkey = tmp_wallets[from].getPrivateKey();
      } else {
        cb("Account not found");
      }
      if (txParams.TxEnterType == undefined){
        txParams.TxEnterType = '';
      }
      if (txParams.IsEntrustTx == undefined){
        txParams.IsEntrustTx = '';
      }
      if (txParams.CommitTime == undefined){
        txParams.CommitTime = 10;
      }
      if (txParams.extra_to == undefined) {
        txParams.extra_to = [[0, 0, []]];
      }
      const tx = new ManTx(txParams, true);
      tx.sign(pkey);
      let serializedTx = tx.serialize();
      let txData = tx.getTxParams(serializedTx);
      cb(null, txData);

    }
    hookedProvider.getAccounts = function(cb) {
      cb(null, tmp_accounts);
    }
  }
}

module.exports = MANHDWalletProvider;
