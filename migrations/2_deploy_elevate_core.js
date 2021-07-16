//const Storage = artifacts.require("Storage"); //For testing purpose
const MdxToken = artifacts.require("MdxToken");

const TestToken = artifacts.require("TestToken");

const MdexFactory = artifacts.require("MdexFactory");
const feeToSetter = "0xD42CD52eA4B6f670D00F2B4CcD9AD4754A707ac4";

const MdexRouter = artifacts.require("MdexRouter");
const wht = '0x6982D74b1954D766c83E9Fb70eAB08F8d01256DE';

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

  // deploy USDTestToken contract and get address
  await deployer.deploy(TestToken);
  const testTokenInstance = await TestToken.deployed();
  const testTokenAddress = testTokenInstance.address;
  
  // deploy a MdexFactory contract
  await deployer.deploy(MdexFactory, feeToSetter);
  //access information about your deployed contract instance
  const mdexFactoryInstance = await MdexFactory.deployed();
  const mdexFactoryAddress = mdexFactoryInstance.address;

  // deploy MdexRouter and get deployed address
  await deployer.deploy(MdexRouter, mdexFactoryAddress, wht);
  const mdexRouterInstance = await MdexRouter.deployed();
  const mdexRouterAddress = mdexRouterInstance.address;

  // deploy HecoPool
  await deployer.deploy(HecoPool, mdexFactoryAddress, mdxPerBlock, startBlock);

  // deploy Oracle and get oracle address
  await deployer.deploy(Oracle, mdexFactoryAddress);
  const oracleInstance = await Oracle.deployed();
  const oracleAddress = oracleInstance.address;

  // deploy SwapMining
  await deployer.deploy(SwapMining, mdexTokenAddress, mdexFactoryAddress, oracleAddress, mdexRouterAddress, testTokenAddress, mdxPerBlock, 0);
}