// SPDX-License-Identifier: Apache-2.0
// Copyright 2017 Loopring Technology Limited.
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./TransferModule.sol";


/// @title FinalTransferModule
/// @dev This module combines multiple small modules to
///      minimize the number of modules to reduce gas used
///      by wallet creation.
contract FinalTransferModule is TransferModule
{
    ControllerImpl private controller_;

    constructor(
        ControllerImpl _controller,
        address        _trustedForwarder
        )
        SecurityModule(_trustedForwarder)
        TransferModule()
    {
        controller_ = _controller;
        updateControllerCache();
    }

    function controller()
        internal
        view
        override
        returns(ControllerImpl)
    {
        return ControllerImpl(controller_);
    }
}

