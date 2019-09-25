/*

  Copyright 2017 Loopring Project Ltd (Loopring Foundation).

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
pragma solidity ^0.5.11;

import "../lib/AddressUtil.sol";
import "../lib/BurnableERC20.sol";
import "../lib/Claimable.sol";
import "../lib/ERC20.sol";
import "../lib/ERC20SafeTransfer.sol";
import "../lib/MathUint.sol";
import "../lib/ReentrancyGuard.sol";

import "../iface/IProtocolFeeVault.sol";
import "../iface/ITokenSeller.sol";

/// @title An Implementation of IProtocolFeeVault.
/// @author Daniel Wang - <daniel@loopring.org>
contract ProtocolFeeVault is Claimable, ReentrancyGuard, IProtocolFeeVault
{
    using AddressUtil       for address;
    using AddressUtil       for address payable;
    using ERC20SafeTransfer for address;
    using MathUint          for uint;

    constructor(
        address _lrcAddress
        )
        Claimable()
        public
    {
        require(_lrcAddress != address(0), "ZERO_ADDRESS");
        lrcAddress = _lrcAddress;
    }

    function updateSettings(
        address _userStakingPoolAddress,
        address _tokenSellerAddress,
        address _daoAddress
        )
        external
        onlyOwner
    {
        userStakingPoolAddress = _userStakingPoolAddress;
        tokenSellerAddress = _tokenSellerAddress;
        daoAddress = _daoAddress;

        emit SettingsUpdated(
            userStakingPoolAddress,
            tokenSellerAddress,
            daoAddress
        );
    }

    function claimStakingReward(
        uint amount
        )
        external
        nonReentrant
    {
        require(
            userStakingPoolAddress != address(0) &&
            msg.sender == userStakingPoolAddress,
            "UNAUTHORIZED"
        );
        lrcAddress.safeTransferAndVerify(userStakingPoolAddress, amount);
        claimedReward = claimedReward.add(amount);
    }

    function getLRCFeeStats()
        public
        view
        returns (
            uint accumulatedFees,
            uint accumulatedBurn,
            uint accumulatedDAOFund,
            uint accumulatedReward,
            uint remainingFees,
            uint remainingBurn,
            uint remainingDAOFund,
            uint remainingReward
        )
    {
        remainingFees = ERC20(lrcAddress).balanceOf(address(this));
        accumulatedFees = remainingFees.add(claimedReward).add(claimedDAOFund).add(claimedBurn);

        accumulatedReward = accumulatedFees.mul(REWARD_PERCENTAGE) / 100;
        accumulatedDAOFund = accumulatedFees.mul(DAO_PERDENTAGE) / 100;
        accumulatedBurn = accumulatedFees.sub(accumulatedReward).sub(accumulatedDAOFund);

        remainingReward = accumulatedReward.sub(claimedReward);
        remainingDAOFund = accumulatedDAOFund.sub(claimedDAOFund);
        remainingBurn = accumulatedBurn.sub(claimedBurn);
    }

    function fundDAO()
        external
        nonReentrant
    {
        require(daoAddress != address(0), "ZERO_DAO_ADDRESS");
        uint amountDAO;
        uint amountBurn;
        (, , , , , amountBurn, amountDAO, ) = getLRCFeeStats();

        lrcAddress.safeTransferAndVerify(daoAddress, amountDAO);

        require(BurnableERC20(lrcAddress).burn(amountBurn), "BURN_FAILURE");

        claimedBurn = claimedBurn.add(amountBurn);
        claimedDAOFund = claimedDAOFund.add(amountDAO);

        emit DAOFunded(amountDAO, amountBurn);
    }

    function sellTokenForLRC(
        address token,
        uint    amount
        )
        external
        nonReentrant
    {
        require(tokenSellerAddress != address(0), "ZERO_TOKEN_SELLER_ADDRESS");
        require(amount > 0, "ZERO_AMOUNT");
        require(token != lrcAddress, "PROHIBITED");

        if (token == address(0)) {
            tokenSellerAddress.sendETHAndVerify(amount, gasleft());
        } else {
            token.safeTransferAndVerify(tokenSellerAddress, amount);
        }

        require(
            ITokenSeller(tokenSellerAddress).sellToken(token, amount, lrcAddress),
            "SELL_FAILURE"
        );

        emit TokenSold(token, amount);
    }
}
