pragma solidity ^0.4.22;
contract ERC20 {
    function totalSupply() constant public returns (uint totalsupply);
    function balanceOf(address _owner) constant public returns (uint balance);
    function transfer(address _to, uint _value) public returns (bool success);
    function transferFrom(address _from, address _to, uint _value) public returns (bool success);
    function approve(address _spender, uint _value) public returns (bool success);
    function allowance(address _owner, address _spender) constant public returns (uint remaining);
    event Transfer(address indexed _from, address indexed _to, uint _value);
    event Approval(address indexed _owner, address indexed _spender, uint _value);
}
/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
    address public owner;


    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor() public {
        owner = msg.sender;
    }


    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }


    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0));
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

}



/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // assert(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }
}



contract Haltable is Ownable {
    bool public halted = false;

    modifier stopInEmergency {
        require (!halted);
        _;
    }

    modifier stopNonOwnersInEmergency {
        require(!halted || msg.sender == owner);
        _;
    }

    modifier onlyInEmergency {
        require (halted);
        _;
    }

    // called by the owner on emergency, triggers stopped state
    function halt() external onlyOwner {
        halted = true;
    }

    // called by the owner on end of emergency, returns to normal state
    function unhalt() external onlyOwner onlyInEmergency {
        halted = false;
    }

}
/**
 * @title LockPosition for Standard ERC20 token
 *
 * @dev Implementation of the Lock position and Airdrop Erc20 token.
 */
contract LockPosition  is Haltable{
    using SafeMath for uint256;
    //Rate Decimal
    uint RateDecimal = 100000;
    //Airdrop Rate for Every lock holder
    uint AirdropRate;
    //Lock positon duration
    uint lockDuration;
    //Erc20 token address
    address public tokenAddress;
    //Recommend Address reward rate
    uint RecommendReward;
    //Recommend Address unlock rate
    uint RecommendUnlock;
    //lock position info
    struct LockInfo {
        uint LockAmount;
        uint LockTime;
    }
    //mapping of holders
    mapping (address => LockInfo[]) lockPositonBalance;
    /** List of all Holders **/
    address[] public Holders;

    event LockToken(address indexed from,uint _amount);
    event LockTokenRecommend(address indexed from,address indexed recommend,uint _amount);
    /**
     * CONSTRUCTOR
     *
     * @notice Initialize the Erc20 token address
     * @param tokenAddr The Erc20 token address
     * @param lockDura Every lock position duration in seconds
     * @param AirRate  Air drop rate
     * @param RecomReward Recommend Lock position Reward rate
     * @param RecomUnlock Recommend Lock position unlock rate
     */

    constructor(address tokenAddr,uint lockDura,uint AirRate,uint RecomReward,uint RecomUnlock)public{
        require(tokenAddr != address(0));
        tokenAddress = tokenAddr;
        lockDuration = lockDura;
        AirdropRate = AirRate;
        RecommendReward = RecomReward;
        RecommendUnlock = RecomUnlock;
    }
    /**
     * @dev Set air drop Rate
     * @param AirRate Air drop rate
     */
    function setAirdropRate(uint AirRate)public
    onlyOwner
    RateLimit(AirRate)
    {
        AirdropRate = AirRate;
    }
    /**
     * @dev Set Every lock position duration in seconds
     * @param time Every lock position duration in seconds
     */
    function setLockDuration(uint time)public
    onlyOwner
    {
        lockDuration = time;
    }
    /**
     * @dev Set Recommend Lock position Reward and unlock rate
     * @param RecomReward Recommend Lock position Reward rate
     * @param RecomReward Recommend Lock position unlock rate
     */
    function setRecommendReward(uint RecomReward,uint RecomUnlock)public
    onlyOwner
    RateLimit(RecomReward)
    RateLimit(RecomUnlock)
    {
        RecommendReward = RecomReward;
        RecommendUnlock = RecomUnlock;
    }

    function getTokenAddress() public view returns(address){
        return tokenAddress;
    }
    function getAirdropRate() public view returns(uint){
        return AirdropRate;
    }
    function getLockDuration() public view returns(uint){
        return lockDuration;
    }
    function getRecommendReward() public view returns(uint,uint){
        return (RecommendReward,RecommendUnlock);
    }
    function getHolders() public view returns(address[]){
        return Holders;
    }
    /**
     * @dev Retrieve some address's lock position info
     * @param addr the retrieved address
     * @return all lock postion info paired with Lock amount and lock time
     */
    function getLockInfo(address addr) public view returns(uint[]){
        LockInfo[] storage info = lockPositonBalance[addr];
        uint[] memory temp = new uint[](info.length*2);
        for(uint i=0;i<info.length;i++){
            temp[i*2] = info[i].LockAmount;
            temp[i*2+1] = info[i].LockTime;
        }
        return temp;
    }
    /**
     * @dev lock token from 'from' to this contract address
     * @param amount the locked token amount
     */
    function Lock(uint256 amount) public amountLimit(amount) stopInEmergency {
        lockPositonBalance[msg.sender].push(LockInfo({LockAmount:amount,LockTime:now}));
        uint num = findHolder(msg.sender);
        if (num == Holders.length){
            addHolder(msg.sender,num);
        }
        emit LockToken(msg.sender,amount);
        callTransferFrom(msg.sender,address(this),amount);
    }
    /**
     * @dev lock token from 'from' to this contract address
     * @param amount the locked token amount
     * @param recommend the recommend address
     */
    function RecommendLock(uint256 amount, address recommend)public amountLimit(amount) stopInEmergency {
        require(msg.sender != recommend);
        Lock(amount);
        recommendReward(recommend,amount);
        emit LockTokenRecommend(msg.sender,recommend,amount);
    }
    /**
     * @dev Air drop for locked token holders
     */
    function AirDrop()public onlyOwner stopInEmergency{
        for (uint i = 0;i<Holders.length;i++){
            LockInfo[] storage info = lockPositonBalance[Holders[i]];
            for(uint j=0;j<info.length;j++){
                LockInfo storage item = info[j];
                if (item.LockAmount == 0)
                    continue;
                uint Amount = item.LockAmount * AirdropRate/RateDecimal;
                callTransfer(Holders[i] ,Amount);
            }
        }
    }
    /**
     * @dev withdraw all released tokens
     */
    function WithDraw()public stopInEmergency{
        LockInfo[] storage info = lockPositonBalance[msg.sender];
        uint begin = info.length;
        for(uint i=0;i<info.length;i++){
            LockInfo storage item = info[i];
            if (SafeMath.add(item.LockTime,lockDuration) < now){
                callTransfer(msg.sender,item.LockAmount);
            }else{
                begin = i;
                break;
            }
        }
        removeLockInfo(msg.sender,begin);
    }
    function recommendReward(address recommend,uint256 amount)internal returns(bool){
        uint reward = amount*RecommendReward/RateDecimal;
        uint unlock = amount*RecommendUnlock/RateDecimal;
        uint send = unlock;
        LockInfo[] storage info = lockPositonBalance[recommend];
        uint begin = info.length;
        for(uint i=0;i<info.length;i++){
            LockInfo storage item = info[i];
            if(item.LockAmount>send){
                item.LockAmount -= send;
                send = 0;
                begin = i;
                break;
            }else{
                send -= item.LockAmount;
                item.LockAmount = 0;
            }
        }
        removeLockInfo(recommend,begin);
        if(send < unlock){
            if (send > 0){
                unlock = SafeMath.sub(unlock,send);
            }
            unlock = SafeMath.add(unlock,reward);
            callTransfer(recommend,unlock);
        }
        return true;
    }
    function removeLockInfo(address sender,uint begin)internal{
        if(begin>0){
            LockInfo[] storage info = lockPositonBalance[sender];
            LockInfo[] memory temp = new LockInfo[](info.length-begin);
            for(uint i=begin;i<info.length;i++){
                temp[i-begin] = info[i];
            }
            delete lockPositonBalance[sender];
            for(i=0;i<temp.length;i++){
                lockPositonBalance[sender].push(temp[i]);
            }
            if (temp.length == 0){
                removeHolder(sender,findHolder(sender));
            }
        }
    }
    function findHolder(address _from)internal returns(uint){
        for (uint i = 0;i<Holders.length;i++){
            if (Holders[i] == _from){
                return i;
            }
        }
        return Holders.length;
    }
    function callTransfer(address _to,uint amount)internal{
        require(ERC20(tokenAddress).transfer(_to,amount));
//        return tokenAddress.call.gas(1000000)(bytes4(bytes32(keccak256("transfer(address,uint256)"))),_to,amount);
    }
    function callTransferFrom(address _from,address _to,uint amount)internal returns(bool){
        require(ERC20(tokenAddress).transferFrom(_from,_to,amount));
    }
    /**
    * Adds a new stakeholder to the list.
    * @param holder the address of the stakeholder
    *        numSH  the current number of stakeholders
    **/
    function addHolder(address holder, uint numSH) internal{
        if(numSH < Holders.length)
            Holders[numSH] = holder;
        else
        {
            Holders.push(holder);
        }
    }

    /**
    * Removes a depositor from the list.
    * @param _from the address of the depositor
    *        index  the index of the depositor
    **/
    function removeHolder(address _from, uint index) internal{
        require(Holders.length>0 && Holders[index] == _from);
        uint Len = Holders.length-1;
        Holders[index] = Holders[Len];
        address[] memory temp = new address[](Len);
        for(uint i=0;i<Len;i++){
            temp[i] = Holders[i];
        }
        Holders = temp;
    }
    modifier RateLimit(uint Rate) {
        require(Rate<=RateDecimal);
        _;
    }
    modifier amountLimit(uint amount) {
        require(amount >= 10000e18 && amount%10000e18 == 0);
        _;
    }
}
