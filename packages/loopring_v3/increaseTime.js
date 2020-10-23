const Web3 = require("web3");
const fs = require("fs");
const PrivateKeyProvider = require("truffle-privatekey-provider");

const privateKey = "7c71142c72a019568cf848ac7b805d21f2e0fd8bc341e8314580de11c6a397bf";
const localUrl = "http://localhost:8545";
const provider = new PrivateKeyProvider(privateKey, localUrl);

const web3 = new Web3(provider);

function evmIncreaseTime(seconds) {
    return new Promise((resolve, reject) => {
	web3.currentProvider.send(
            {
		jsonrpc: "2.0",
		method: "evm_increaseTime",
		params: [seconds]
            },
            (err, res) => {
		return err ? reject(err) : resolve(res);
            }
	);
    });
}

async function main() {
    try {
	await evmIncreaseTime(1);
	const blockNumber = await web3.eth.getBlockNumber();
	console.log("blockNumber:", blockNumber);
	process.exit(0);
    } catch(err) {
	console.error(err);
	process.exit(1);
    }
}

main();
