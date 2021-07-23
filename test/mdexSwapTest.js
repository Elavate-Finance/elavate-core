const { soliditySha3 } = require("web3-utils");
const { sha3} = require("web3-utils");

const {ethers} = require("ethers");
const ethereumjs_util = require("ethereumjs-util");
const MdexFactory = artifacts.require("MdexFactory");
const MdxToken = artifacts.require("MdxToken");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const MdexRouter = artifacts.require("MdexRouter");
const MdexPair = artifacts.require("MdexPair");
const SwapMining = artifacts.require("SwapMining");

const keccak256 = ethers.utils.keccak256;
const defaultAbiCoder = ethers.utils.defaultAbiCoder;
const toUtf8Bytes = ethers.utils.toUtf8Bytes;
const BigNumber = ethers.BigNumber;
const PERMIT_TYPEHASH = keccak256(toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'));
const ecsign = ethereumjs_util.ecsign;
const privateKey = "1c03bf8358b702a7ca4526577cce6c071977eafa103e14811f56c1becb4f1f12";
  
const MINIMUM_LIQUIDITY = 1000;

function getDomainSeparator(name, tokenAddress) {
    return keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
          keccak256(toUtf8Bytes(name)),
          keccak256(toUtf8Bytes('1')),
          20,
          tokenAddress
        ]
      )
    );
}

function getApprovalDigest(
    DOMAIN_SEPARATOR,
    approve_owner,
    approve_spender,
    approve_value,
    nonce,
    deadline
) {
      var soliditySha3Value = soliditySha3('\x19\x01', DOMAIN_SEPARATOR, keccak256(defaultAbiCoder.encode(
        ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
        [PERMIT_TYPEHASH, approve_owner, approve_spender, BigNumber.from(approve_value), BigNumber.from(nonce), BigNumber.from(deadline)]
      )));

      //To stay for next time and testing (libraires and functions that I tried)
      /*var web3Value = sha3('\x19\x01' + DOMAIN_SEPARATOR + temp, {encoding:"hex"});
      console.log("WEB3-"+web3Value);
      console.log("KECCAK-SHA3-" + keccak256(soliditySha3Value));
      console.log("KECCAK-WEB3-" + keccak256(web3Value));
      var encodeNewPrev = defaultAbiCoder.encode(
        ['string', 'bytes32', 'bytes32'],
        ['\x19\x01', DOMAIN_SEPARATOR, temp]
      );
      const encodeNew = keccak256(encodeNewPrev);
      console.log("ENCODE-NEW-PREV-" + encodeNewPrev);
      console.log("ENCODE-NEW-" + encodeNew);*/

      return soliditySha3Value;
  }

contract("Testing", accounts => {
    var mdexFactoryInstance;
    var mdxTokenInstance;
    var testTokenOneInstance;
    var testTokenTwoInstance;
    var mDexRouterInstance;
    var mdexPairInstance;
    var concretePairInstance;

    var swapMiningInstance;

    var liquidityTokensMinted;
    //set contract instances
    before(async () => {
        mdexFactoryInstance = await MdexFactory.deployed();
        assert.ok(mdexFactoryInstance);

        mdxTokenInstance = await MdxToken.deployed();
        assert.ok(mdxTokenInstance);
        //console.log("mdxTokenInstance-" + mdxTokenInstance.address);

        testTokenOneInstance = await TestTokenOne.deployed();
        assert.ok(testTokenOneInstance);
        //console.log("testTokenOneInstance-" + testTokenOneInstance.address);

        testTokenTwoInstance = await TestTokenTwo.deployed();
        assert.ok(testTokenTwoInstance);
        //console.log("testTokenTwoInstance-" + testTokenTwoInstance.address);

        //await testTokenOneInstance.addMinter(accounts[1]);
        //await testTokenOneInstance.mint(accounts[1], 9999, {from : accounts[1]});
        //await testTokenOneInstance.mint(accounts[1], 9999);

        //await testTokenOneInstance.addMinter(accounts[2]);
        //await testTokenOneInstance.mint(accounts[2], 9999, {from : accounts[2]});
        //await testTokenOneInstance.mint(accounts[2], 9999);

        mDexRouterInstance = await MdexRouter.deployed();
        assert.ok(mDexRouterInstance);

        mdexPairInstance = await MdexPair.deployed();

        swapMiningInstance = await SwapMining.deployed();
        assert.ok(swapMiningInstance);

        //console.log("swapMining-" + swapMiningInstance.address);
        //await mDexRouterInstance.setSwapMining(swapMiningInstance.address);
    });

    it("...should create pair", async () => {

        //create pair on factory
        await mdexFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);
        
        const pairAddress = await mdexFactoryInstance.getPair(testTokenOneInstance.address, 
          testTokenTwoInstance.address);

        //init instance for pair
        concretePairInstance = await MdexPair.at(pairAddress);

        const pairLength = await mdexFactoryInstance.allPairsLength.call();
        assert.equal(pairLength.toNumber(), 1, "mdexFactory pair is not created correct");
    });

    it("...should addLiquidity", async() => {
        //set approve for testTokenOne and testTokenTwo
        const approveValue = 2000000000000;
        await testTokenOneInstance.approve(mDexRouterInstance.address, approveValue);
        const approveValueTestTokenOneSet = await testTokenOneInstance.allowance.call(accounts[0], mDexRouterInstance.address);
        assert.equal(approveValue, approveValueTestTokenOneSet.toNumber(), "approve for testTokenOne is not set correct");

        await testTokenTwoInstance.approve(mDexRouterInstance.address, approveValue);
        const approveValueTestTokenTwoSet = await testTokenTwoInstance.allowance.call(accounts[0], mDexRouterInstance.address);
        assert.equal(approveValue, approveValueTestTokenTwoSet.toNumber(), "approve for testTokenTwo is not set correct");

        //add liquidity
        const valueForLiquidityTokenOne = 500000;
        const valueForLiquidityTokenTwo = 500000;
        await mDexRouterInstance.addLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            valueForLiquidityTokenOne,
            valueForLiquidityTokenTwo,
            0,
            0,
            accounts[0],
            9000000000);
        
        //check is liquidity correct set to pairValue for testTokenOne
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        //console.log("liquidityTokenOneSet-"+liquidityTokenOneSet.toNumber());
        assert.equal(valueForLiquidityTokenOne, liquidityTokenOneSet.toNumber(), "liquidityTokenOneValue is not correct set to pairAddress");

        //check is liquidity correct set to pairValue for testTokenTwo
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        //console.log("liquidityTokenTwoSet-"+liquidityTokenOneSet.toNumber());
        assert.equal(valueForLiquidityTokenOne, liquidityTokenTwoSet.toNumber(), "liquidityTokenTwoValue is not correct set to pairAddress");

        //check is liquidity token correct set to user account
        var liquidityValueCalculation = Math.sqrt(liquidityTokenOneSet.toNumber() * liquidityTokenTwoSet.toNumber()) - MINIMUM_LIQUIDITY;
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[0]);
        assert.equal(liquidityValueCalculation, liquidityValueSet.toNumber(), "addLiquidity is not created correct");
    });

    it("...should removeLiquidity", async() => {
        //const values
        const approveValue = 2000000000000;
        const removeLiquidityValue = 50000;

        //set approve for remove liquidity
        await concretePairInstance.approve(mDexRouterInstance.address, approveValue);
        var approveValueSet = await concretePairInstance.allowance.call(accounts[0], mDexRouterInstance.address)
        assert.equal(approveValue, approveValueSet.toNumber(), "approve is not set correct");

        //get liquidity token values
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[0]);

        await mDexRouterInstance.removeLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            removeLiquidityValue,
            0,
            0,
            accounts[0],
            9000000000);
        
        //get liquidity token values after removeLiquidity
        const liquidityTokenOneSetNew = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(liquidityTokenOneSet - removeLiquidityValue, liquidityTokenOneSetNew.toNumber(), "removeLiquidity for TokenOne is not set correct");

        const liquidityTokenTwoSetNew = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(liquidityTokenTwoSet - removeLiquidityValue, liquidityTokenTwoSetNew.toNumber(), "removeLiquidity for TokenTwo is not set correct");

        //check is removeLiquidity created correct
        const liquidityValueSetNew = await concretePairInstance.balanceOf.call(accounts[0]);
        assert.equal(liquidityValueSet - removeLiquidityValue, liquidityValueSetNew.toNumber(), "removeLiquidity is not created correct");
    });

    it("...should removeLiquidityWithPermit", async() => {
        //const values
        const removeLiquidityValue = 50000;
        
        //get liquidity token values
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[0]);
        
        //signature
        const nonce = await concretePairInstance.nonces(accounts[0]);
        const name = await concretePairInstance.name();
        const DOMAIN_SEPARATOR = getDomainSeparator(name, concretePairInstance.address);
        const digest = getApprovalDigest(DOMAIN_SEPARATOR, accounts[0], mDexRouterInstance.address, removeLiquidityValue, nonce.toNumber(), 9000000000);
        const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(privateKey, 'hex'));

        await mDexRouterInstance.removeLiquidityWithPermit(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            removeLiquidityValue,
            0,
            0,
            accounts[0],
            9000000000,
            false, 
            v,
            r,
            s);
        
        //get liquidity token values after removeLiquidity
        const liquidityTokenOneSetNew = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(liquidityTokenOneSet - removeLiquidityValue, liquidityTokenOneSetNew.toNumber(), "removeLiquidityWithPermit for TokenOne is not set correct");

        const liquidityTokenTwoSetNew = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(liquidityTokenTwoSet - removeLiquidityValue, liquidityTokenTwoSetNew.toNumber(), "removeLiquidityWithPermit for TokenTwo is not set correct");

        //check is removeLiquidityWithPermit created correct
        const liquidityValueSetNew = await concretePairInstance.balanceOf.call(accounts[0]);
        assert.equal(liquidityValueSet - removeLiquidityValue, liquidityValueSetNew.toNumber(), "removeLiquidityWithPermit is not created correct");
    });
});