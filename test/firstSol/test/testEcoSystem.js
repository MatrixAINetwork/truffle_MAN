var EcoSystem = artifacts.require("./EcoSystem.sol");
const web3 = global.web3;
contract('EcoSystem', function() {

//    console.log()
    var owner ="MAN.2AmKUD6p9DjvcBzUADMhbVHQfewWz";
    var to ="MAN.5ZUUYf8QQcPizuqCQMVQam5zmJZj";
    var value = 100000000000;

    var balanceOwer = 0;
    var balanceTo = 0;
    it("Initial EcoSystem settings should match", async () => {
        instance = await EcoSystem.deployed();
        assert.equal(await instance.owner(), owner, `EcoSystem's Owner isn't set properly`)
        balanceOwer = (await instance.balanceOf(owner));
        balanceTo = (await instance.balanceOf(to));
        await instance.transfer(to,value,{from:owner,gas: 1000000});
        var balance = (await instance.balanceOf(to)).toNumber();
        assert.equal(balance-balanceTo, value, "Transaction value doesn't match!");

    });

});
/*
let instance = await EcoSystem.deployed()

let tx = await instance.transfer("MAN.5ZUUYf8QQcPizuqCQMVQam5zmJZj",100000000000,{from:"MAN.2AmKUD6p9DjvcBzUADMhbVHQfewWz",gas: 1000000})

let instance = await MBCToken.deployed()
let tx = await instance.transfer("0x05a4a6ac92c9e40d98e7bcf7eed2c364eb61fc92",100000000000,{from:"MAN.2AmKUD6p9DjvcBzUADMhbVHQfewWz",gas: 1000000})

 */