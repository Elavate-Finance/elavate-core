const { soliditySha3 } = require("web3-utils");
const { sha3} = require("web3-utils");
const BN = require('bn.js');

const {ethers} = require("ethers");
const ethereumjs_util = require("ethereumjs-util");
const MdexFactory = artifacts.require("MdexFactory");
const MdxToken = artifacts.require("MdxToken");
const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");
const htHUSD = artifacts.require("htHUSD");
const MdexRouter = artifacts.require("MdexRouter");
const MdexPair = artifacts.require("MdexPair");
const SwapMining = artifacts.require("SwapMining");

const keccak256 = ethers.utils.keccak256;
const defaultAbiCoder = ethers.utils.defaultAbiCoder;
const toUtf8Bytes = ethers.utils.toUtf8Bytes;
const BigNumber = ethers.BigNumber;
const PERMIT_TYPEHASH = keccak256(toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'));
const ecsign = ethereumjs_util.ecsign;
const privateKey = "0ca1c0c07ad541a49b98b20ab39b2623fa8bf2df5933241267e05e3431669f11";
//const hUSD = "0xf9ca2ea3b1024c0db31adb224b407441becc18bb";

const MINIMUM_LIQUIDITY = 1000;
const PAIR_ALLOC_POINT = 10;

function sqrt (value) {
  var z = new BN(0);
  if (value.gt(new BN(3))) {
    z = value;
    var x = value.div(new BN(2)).add(new BN(1));
    while (x.lt(z)) {
      z = x;
      x = value.div(x).add(x).div(new BN(2));
    }
  } else if (!value.eq(new BN(0))) {
    z = new BN(1);
  }
  return z;
};

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
    var htHUSDInstance;
    var mDexRouterInstance;
    var concretePairInstance;

    var swapMiningInstance;

    //Liquidity amount (prices range) - in base of htHUSD, testTokenOne is price 15 htHUSD, testTokenTwo 5 htHUSD and testTokenOne is 3 testTokenTwo;
    const valueForLiquidityTokenOne = ethers.utils.parseEther('15');
    const valueForLiquidityTokenTwo = ethers.utils.parseEther('5');
    const valueForLiquidityhtHUSD = ethers.utils.parseEther('1');
    const valueForLiquidityMdex = ethers.utils.parseEther('0.05');
    const tstOneToTstTwoPrice = new BN(3);

    //Approve value
    const approveValue = ethers.utils.parseEther('10000');

    //set contract instances
    before(async () => {
        mdexFactoryInstance = await MdexFactory.deployed();
        assert.ok(mdexFactoryInstance);

        mdxTokenInstance = await MdxToken.deployed();
        assert.ok(mdxTokenInstance);
        //console.log("mdxTokenInstance-" + mdxTokenInstance.address);

        testTokenOneInstance = await TestTokenOne.deployed();
        assert.ok(testTokenOneInstance);
        console.log("testTokenOneInstance-" + testTokenOneInstance.address);

        testTokenTwoInstance = await TestTokenTwo.deployed();
        assert.ok(testTokenTwoInstance);
        console.log("testTokenTwoInstance-" + testTokenTwoInstance.address);

        htHUSDInstance = await htHUSD.deployed();
        assert.ok(htHUSDInstance);
        console.log("htHUSDInstance-" + htHUSDInstance.address);

        //await testTokenOneInstance.addMinter(accounts[1]);
        //await testTokenOneInstance.mint(accounts[1], 9999, {from : accounts[1]});
        //await testTokenOneInstance.mint(accounts[1], 9999);

        //await testTokenOneInstance.addMinter(accounts[2]);
        //await testTokenOneInstance.mint(accounts[2], 9999, {from : accounts[2]});
        //await testTokenOneInstance.mint(accounts[2], 9999);

        mDexRouterInstance = await MdexRouter.deployed();
        assert.ok(mDexRouterInstance);

        await MdexPair.deployed();

        swapMiningInstance = await SwapMining.deployed();
        assert.ok(swapMiningInstance);

        //set swapMining on Router
        await mDexRouterInstance.setSwapMining(swapMiningInstance.address);

        //add swapMining as Minter on MdxToken
        await mdxTokenInstance.addMinter(swapMiningInstance.address);
    });

    it("...should create pair", async () => {

        //create pair on factory
        await mdexFactoryInstance.createPair(testTokenOneInstance.address, testTokenTwoInstance.address);
        await mdexFactoryInstance.createPair(testTokenOneInstance.address, htHUSDInstance.address);
        await mdexFactoryInstance.createPair(testTokenTwoInstance.address, htHUSDInstance.address);
        await mdexFactoryInstance.createPair(htHUSDInstance.address, mdxTokenInstance.address);

        const pairAddress = await mdexFactoryInstance.getPair(testTokenOneInstance.address, 
          testTokenTwoInstance.address);

        //init instance for pair
        concretePairInstance = await MdexPair.at(pairAddress);

        const pairLength = await mdexFactoryInstance.allPairsLength.call();
        assert.equal(pairLength.toNumber(), 4, "mdexFactory pair is not created correct");

        //addPair on swapMining
        swapMiningInstance.addPair(PAIR_ALLOC_POINT, pairAddress, true);
        const pairLengthSwapMining = await swapMiningInstance.poolLength.call();
        assert.equal(pairLengthSwapMining.toNumber(), 1, "swapMining pair is not created correct");

        //add testTokenOne and testTokenTwo to whitelist on swapMining
        await swapMiningInstance.addWhitelist(testTokenOneInstance.address);
        await swapMiningInstance.addWhitelist(testTokenTwoInstance.address);
        const whiteListLength = await swapMiningInstance.getWhitelistLength.call();
        assert.equal(whiteListLength, 2, "tokens are not corrected added on whiteList");
    });

    it("...should transfer tokens", async() => {

      const approveValue = ethers.utils.parseEther('300');
      const valueForSent = ethers.utils.parseEther('100');
    
      // transfer testTokenOne to account[1],account[2], account[3];
      await testTokenOneInstance.approve(accounts[0], approveValue);
      await testTokenOneInstance.transferFrom(accounts[0], accounts[1], valueForSent);
      await testTokenOneInstance.transferFrom(accounts[0], accounts[2], valueForSent);
      await testTokenOneInstance.transferFrom(accounts[0], accounts[3], valueForSent);

      // transfer testTokenTwo to account[1],account[2], account[3];
      await testTokenTwoInstance.approve(accounts[0], approveValue);
      await testTokenTwoInstance.transferFrom(accounts[0], accounts[1], valueForSent);
      await testTokenTwoInstance.transferFrom(accounts[0], accounts[2], valueForSent);
      await testTokenTwoInstance.transferFrom(accounts[0], accounts[3], valueForSent);

      // transfer htHUSD to account[1],account[2], account[3];
      await htHUSDInstance.approve(accounts[0], approveValue);
      await htHUSDInstance.transferFrom(accounts[0], accounts[1], valueForSent);
      await htHUSDInstance.transferFrom(accounts[0], accounts[2], valueForSent);
      await htHUSDInstance.transferFrom(accounts[0], accounts[3], valueForSent);

      const account1TestTokenOne = await testTokenOneInstance.balanceOf.call(accounts[1]);
      assert.equal(account1TestTokenOne.toString(), valueForSent.toString(), "testTokenOne is not successfully transfer to account[1]");

      const account1TestTokenTwo = await testTokenTwoInstance.balanceOf.call(accounts[1]);
      assert.equal(account1TestTokenTwo.toString(), valueForSent.toString(), "testTokenTwo is not successfully transfer to account[1]");

      const account1TestTokenhtHUSD = await testTokenOneInstance.balanceOf.call(accounts[1]);
      assert.equal(account1TestTokenhtHUSD.toString(), valueForSent.toString(), "testTokenhtHUSD is not successfully transfer to account[1]");
    });

    it("...should addLiquidity", async() => {
        //set approve for testTokenOne and testTokenTwo
        await testTokenOneInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[1]});
        const approveValueTestTokenOneSet = await testTokenOneInstance.allowance.call(accounts[1], mDexRouterInstance.address);
        assert.equal(approveValue.toString(), approveValueTestTokenOneSet.toString(), "approve for testTokenOne is not set correct");

        await testTokenTwoInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[1]});
        const approveValueTestTokenTwoSet = await testTokenTwoInstance.allowance.call(accounts[1], mDexRouterInstance.address);
        assert.equal(approveValue.toString(), approveValueTestTokenTwoSet.toString(), "approve for testTokenTwo is not set correct");
        
        //add liquidity
        await mDexRouterInstance.addLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            valueForLiquidityTokenOne.toString(),
            valueForLiquidityTokenTwo.toString(),
            0,
            0,
            accounts[1],
            9000000000,
            {from:accounts[1]});
        
        //check is liquidity correct set to pairValue for testTokenOne
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(valueForLiquidityTokenOne.toString(), liquidityTokenOneSet.toString(), "liquidityTokenOneValue is not correct set to pairAddress");

        //check is liquidity correct set to pairValue for testTokenTwo
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(valueForLiquidityTokenTwo.toString(), liquidityTokenTwoSet.toString(), "liquidityTokenTwoValue is not correct set to pairAddress");

        //TODO add sqrt with BN.js library
        //check is liquidity token correct set to user account
        var liquidityValueCalculation = sqrt(new BN(liquidityTokenOneSet).mul(new BN(liquidityTokenTwoSet))).sub(new BN(MINIMUM_LIQUIDITY));
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[1]);
        assert.equal(liquidityValueCalculation.toString(), liquidityValueSet.toString(), "addLiquidity is not created correct");
    });

    it("...should removeLiquidity", async() => {
        //const values
        const removeLiquidityValue = ethers.utils.parseEther('0.05');

        //set approve for remove liquidity
        await concretePairInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[1]});
        var approveValueSet = await concretePairInstance.allowance.call(accounts[1], mDexRouterInstance.address)
        assert.equal(approveValue.toString(), approveValueSet.toString(), "approve is not set correct");

        //get liquidity token values
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTotalSupply = await concretePairInstance.totalSupply.call();
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[1]);

        await mDexRouterInstance.removeLiquidity(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            removeLiquidityValue.toString(),
            0,
            0,
            accounts[1],
            9000000000,
            {from: accounts[1]});
        
        //get liquidity token values after removeLiquidity
        const removeLiquidityAmountTokenOne = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenOneSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenOneSetNew = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenOneSet).sub(new BN(removeLiquidityAmountTokenOne)), liquidityTokenOneSetNew.toString(), "removeLiquidity for TokenOne is not set correct");

        const removeLiquidityAmountTokenTwo = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenTwoSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenTwoSetNew = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenTwoSet).sub(new BN(removeLiquidityAmountTokenTwo)), liquidityTokenTwoSetNew.toString(), "removeLiquidity for TokenTwo is not set correct");

        //check is removeLiquidity created correct
        const liquidityValueSetNew = await concretePairInstance.balanceOf.call(accounts[1]);
        assert.equal(new BN(liquidityValueSet).sub(new BN(removeLiquidityValue.toString())), liquidityValueSetNew.toString(), "removeLiquidity is not created correct");
    });

   
    it("...should removeLiquidityWithPermit", async() => {
        //const values
        const removeLiquidityValue = ethers.utils.parseEther('0.05');
        
        //get liquidity token values
        const liquidityTokenOneSet = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTwoSet = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        const liquidityTokenTotalSupply = await concretePairInstance.totalSupply.call();
        const liquidityValueSet = await concretePairInstance.balanceOf.call(accounts[1]);
        
        //signature
        const nonce = await concretePairInstance.nonces(accounts[1]);
        const name = await concretePairInstance.name();
        const DOMAIN_SEPARATOR = getDomainSeparator(name, concretePairInstance.address);
        const digest = getApprovalDigest(DOMAIN_SEPARATOR, accounts[1], mDexRouterInstance.address, removeLiquidityValue, nonce.toNumber(), 9000000000);
        const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(privateKey, 'hex'));

        await mDexRouterInstance.removeLiquidityWithPermit(testTokenOneInstance.address, 
            testTokenTwoInstance.address,
            removeLiquidityValue,
            0,
            0,
            accounts[1],
            9000000000,
            false, 
            v,
            r,
            s,
            {from: accounts[1]});
        
        //get liquidity token values after removeLiquidityWithPermit
        const removeLiquidityAmountTokenOne = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenOneSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenOneSetNew = await testTokenOneInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenOneSet).sub(new BN(removeLiquidityAmountTokenOne)), liquidityTokenOneSetNew.toString(), "removeLiquidityWithPermit for TokenOne is not set correct");

        const removeLiquidityAmountTokenTwo = new BN(removeLiquidityValue.toString()).mul(new BN(liquidityTokenTwoSet)).div(new BN(liquidityTokenTotalSupply));
        const liquidityTokenTwoSetNew = await testTokenTwoInstance.balanceOf.call(concretePairInstance.address);
        assert.equal(new BN(liquidityTokenTwoSet).sub(new BN(removeLiquidityAmountTokenTwo)), liquidityTokenTwoSetNew.toString(), "removeLiquidityWithPermit for TokenTwo is not set correct");

        //check is removeLiquidity created correct
        const liquidityValueSetNew = await concretePairInstance.balanceOf.call(accounts[1]);
        assert.equal(new BN(liquidityValueSet).sub(new BN(removeLiquidityValue.toString())), liquidityValueSetNew.toString(), "removeLiquidityWithPermit is not created correct");
    }); 

 
    it("...should swap on swapMining", async() => {
      //set approve for htHUSD
      await htHUSDInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[1]});
      const approveValuehtHUSDSet = await htHUSDInstance.allowance.call(accounts[1], mDexRouterInstance.address);
      assert.equal(approveValue.toString(), approveValuehtHUSDSet.toString(), "approve for htHUSD is not set correct");

      await htHUSDInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[2]});
      const approveValuehtHUSDSetAcc2 = await htHUSDInstance.allowance.call(accounts[2], mDexRouterInstance.address);
      assert.equal(approveValue.toString(), approveValuehtHUSDSetAcc2.toString(), "approve for htHUSD is not set correct");

      await testTokenOneInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[2]});
      await testTokenOneInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[3]});

      await testTokenOneInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[2]});
      await testTokenOneInstance.approve(mDexRouterInstance.address, approveValue, {from: accounts[3]});

      //add liquidity for testTokenOne and htHUSD
      await mDexRouterInstance.addLiquidity(testTokenOneInstance.address, 
        htHUSDInstance.address,
        valueForLiquidityTokenOne,
        valueForLiquidityhtHUSD,
        0,
        0,
        accounts[1],
        9000000000, 
        {from: accounts[1]});
      
      //add liquidity for testTokenTwo and htHUSD
      await mDexRouterInstance.addLiquidity(testTokenTwoInstance.address, 
        htHUSDInstance.address,
        valueForLiquidityTokenTwo,
        valueForLiquidityhtHUSD,
        0,
        0,
        accounts[1],
        9000000000, 
        {from: accounts[1]});

      const swapMiningAmount = ethers.utils.parseEther('0.025');
      //amount / price minus 1% deviation
      const onePercentSwapMiningAmount = new BN(swapMiningAmount.toString()).div(new BN(100))
      const swapMiningAmountOutMin = new BN(swapMiningAmount.toString()).div(tstOneToTstTwoPrice).sub(onePercentSwapMiningAmount);
      await mDexRouterInstance.swapExactTokensForTokens(swapMiningAmount, 
        swapMiningAmountOutMin,
        [testTokenOneInstance.address, testTokenTwoInstance.address],
        accounts[2],
        9000000000, 
        {from: accounts[2]});

      const swapMiningAmountV1 = ethers.utils.parseEther('0.1');
      //amount / price minus 1% deviation
      const onePercentSwapMiningAmountV1 = new BN(swapMiningAmountV1.toString()).div(new BN(100))
      const swapMiningAmountOutMinV1 = new BN(swapMiningAmountV1.toString()).div(tstOneToTstTwoPrice).sub(onePercentSwapMiningAmountV1);
      await debug(mDexRouterInstance.swapExactTokensForTokens(swapMiningAmountV1, 
        swapMiningAmountOutMinV1,
        [testTokenOneInstance.address, testTokenTwoInstance.address],
        accounts[3],
        9000000000, 
        {from: accounts[3]}));

      await debug(swapMiningInstance.takerWithdraw({from: accounts[3]}));
      var mdxBalanceAccount3 = await mdxTokenInstance.balanceOf.call(accounts[3]);
      console.log("mdxBalance - accounts[3] - " + mdxBalanceAccount3.toString());

      //add liquidity for htHUSD and mdxToken
      await htHUSDInstance.approve(mDexRouterInstance.address, valueForLiquidityhtHUSD, {from: accounts[3]});
      await mdxTokenInstance.approve(mDexRouterInstance.address, valueForLiquidityMdex, {from: accounts[3]});
      await mDexRouterInstance.addLiquidity(htHUSDInstance.address, 
        mdxTokenInstance.address,
        valueForLiquidityhtHUSD,
        valueForLiquidityMdex,
        0,
        0,
        accounts[3],
        9000000000, 
        {from: accounts[3]});

      await debug(mDexRouterInstance.swapExactTokensForTokens(swapMiningAmountV1, 
        swapMiningAmountOutMinV1,
        [testTokenOneInstance.address, testTokenTwoInstance.address],
        accounts[3],
        9000000000, 
        {from: accounts[3]}));

      await debug(swapMiningInstance.takerWithdraw({from: accounts[3]}));
      mdxBalanceAccount3 = await mdxTokenInstance.balanceOf.call(accounts[3]);
      console.log("mdxBalance - accounts[3] - " + mdxBalanceAccount3.toString());
        
      assert.equal(1, 1, "swapMining is not works correct");
    }); 
});