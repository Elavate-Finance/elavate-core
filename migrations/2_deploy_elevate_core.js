//const Storage = artifacts.require("Storage"); //For testing purpose
const MdxToken = artifacts.require("MdxToken");

const TestTokenOne = artifacts.require("TestTokenOne");
const TestTokenTwo = artifacts.require("TestTokenTwo");

const MdexPair = artifacts.require("MdexPair");

const MdexFactory = artifacts.require("MdexFactory");
const feeToSetter = "0x3A45014f39dB3Ae1C7cba2FF575CEDF35e39A9Ad"; //current deploy Stefan address

const MdexRouter = artifacts.require("MdexRouter");
const wELA = '0x517E9e5d46C1EA8aB6f78677d6114Ef47F71f6c4'; //wrapped ELA token

const HecoPool = artifacts.require("HecoPool");
const num = 100e18;
const mdxPerBlock = "0x" + num.toString(16);
const startBlock = 4036089;

const Oracle = artifacts.require("Oracle");

const SwapMining = artifacts.require("SwapMining");

module.exports = async function(deployer) {

  // deploy MdxToken contract and get address
  await deployer.deploy(MdxToken);
  const mdexTokenInstance = await MdxToken.deployed();
  const mdexTokenAddress = mdexTokenInstance.address;

  // deploy TestTokenOne contract and get address
  await deployer.deploy(TestTokenOne);
  const testTokenOneInstance = await TestTokenOne.deployed();
  const testTokenOneAddress = testTokenOneInstance.address;

  // deploy TestTokenTwo contract and get address
  await deployer.deploy(TestTokenTwo);
  const testTokenTwoInstance = await TestTokenTwo.deployed();
  const testTokenTwoAddress = testTokenTwoInstance.address;
  
  // deploy mdexPair contract
  await deployer.deploy(MdexPair);

  // deploy a MdexFactory contract
  await deployer.deploy(MdexFactory, feeToSetter);
  //access information about your deployed contract instance
  const mdexFactoryInstance = await MdexFactory.deployed();
  const mdexFactoryAddress = mdexFactoryInstance.address;

  //Only for test purpose, delete this
  //const initCodeHash = await mdexFactoryInstance.initCodeHash.call(); 
  //console.log("initCodeHashValue - " + initCodeHash);
  //Only for test purpose, delete this
  
  // deploy MdexRouter and get deployed address
  await deployer.deploy(MdexRouter, mdexFactoryAddress, wELA);
  const mdexRouterInstance = await MdexRouter.deployed();
  const mdexRouterAddress = mdexRouterInstance.address;

  // deploy HecoPool
  await deployer.deploy(HecoPool, mdexFactoryAddress, mdxPerBlock, startBlock);

  // deploy Oracle and get oracle address
  await deployer.deploy(Oracle, mdexFactoryAddress);
  const oracleInstance = await Oracle.deployed();
  const oracleAddress = oracleInstance.address;

  // deploy SwapMining
  //await deployer.deploy(SwapMining, mdexTokenAddress, mdexFactoryAddress, oracleAddress, mdexRouterAddress, testTokenAddress, mdxPerBlock, 0);
}