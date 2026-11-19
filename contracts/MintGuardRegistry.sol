// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title MintGuardRegistry
/// @notice Minimal on-chain attestation registry for MintGuard (Agent ID Hackathon).
/// @dev Stores one verification attestation per BSC contract address, written
///      only by the owner (the MintGuard deployer). Read-only for everyone else.
///      No funds, no minting, no payments, no token: this contract holds no BNB
///      and has no payable function. It is a public record of MintGuard verdicts,
///      linked to the Agent ID handle that was verified alongside the check
///      (see src/agentid.js — the Agent ID check itself stays off-chain and
///      read-only against the SPACE ID HandleRegistry).
///      Single file, no imports, so BscScan verification is a plain
///      single-file verify with compiler 0.8.28, no constructor arguments,
///      optimization off (or as noted in README.md).
contract MintGuardRegistry {
    /// @notice The account allowed to write attestations. Set once at deploy.
    address public owner;

    /// @notice One MintGuard verification result for one contract address.
    struct Attestation {
        address target; // contract that was verified (the NFT contract)
        uint8 riskScore; // 0-100, same scale as MintGuard's deterministic score
        string verdict; // "SAFE" | "CAUTION" | "DANGEROUS"
        string agentIdHandle; // Agent ID handle verified with the check, e.g. "astrajingga0704" ("" if none)
        uint64 timestamp; // block.timestamp when attested
        address attestedBy; // owner account that wrote this attestation
    }

    /// @notice Latest attestation per verified contract address.
    mapping(address => Attestation) public attestations;

    /// @notice True once an address has ever been attested.
    mapping(address => bool) public hasAttestation;

    /// @notice All contract addresses ever attested, in order (for listing).
    address[] public attestedContracts;

    /// @notice Emitted on every new or updated attestation.
    event Attested(
        address indexed target,
        uint8 riskScore,
        string verdict,
        string agentIdHandle,
        uint64 timestamp,
        address indexed attestedBy
    );

    /// @notice Emitted when ownership is transferred.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "MintGuardRegistry: caller is not the owner");
        _;
    }

    /// @notice Deploys the registry. The owner is set explicitly because
    ///      this contract is deployed through a CREATE2 factory (the
    ///      Binance Agentic Wallet cannot send a bare contract-creation
    ///      transaction), so msg.sender at deploy time is the factory,
    ///      not the MintGuard deployer.
    /// @param initialOwner The MintGuard deployer (Eaglee's wallet), which
    ///      becomes the owner allowed to write attestations.
    constructor(address initialOwner) {
        require(initialOwner != address(0), "MintGuardRegistry: initial owner is zero address");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    /// @notice Write (or overwrite) the attestation for one contract address.
    /// @dev Only the owner can call this. Overwriting is intentional: a
    ///      contract can be re-verified later and the latest attestation wins;
    ///      every write is still permanently visible in the Attested events.
    /// @param target The BSC contract address that was verified.
    /// @param riskScore MintGuard deterministic risk score, 0-100.
    /// @param verdict "SAFE", "CAUTION" or "DANGEROUS".
    /// @param agentIdHandle Agent ID handle verified alongside, without ".ai"
    ///        (e.g. "astrajingga0704"), or "" when no Agent ID was checked.
    function attest(
        address target,
        uint8 riskScore,
        string calldata verdict,
        string calldata agentIdHandle
    ) external onlyOwner {
        require(target != address(0), "MintGuardRegistry: target is zero address");
        require(riskScore <= 100, "MintGuardRegistry: riskScore must be 0-100");
        require(bytes(verdict).length > 0, "MintGuardRegistry: verdict is empty");

        if (!hasAttestation[target]) {
            hasAttestation[target] = true;
            attestedContracts.push(target);
        }

        attestations[target] = Attestation({
            target: target,
            riskScore: riskScore,
            verdict: verdict,
            agentIdHandle: agentIdHandle,
            timestamp: uint64(block.timestamp),
            attestedBy: msg.sender
        });

        emit Attested(target, riskScore, verdict, agentIdHandle, uint64(block.timestamp), msg.sender);
    }

    /// @notice Read the latest attestation for a contract address.
    /// @return target The verified contract address.
    /// @return riskScore MintGuard deterministic risk score, 0-100.
    /// @return verdict "SAFE", "CAUTION" or "DANGEROUS".
    /// @return agentIdHandle Agent ID handle verified alongside ("" if none).
    /// @return timestamp When the attestation was written.
    /// @return attestedBy Owner account that wrote it.
    function getAttestation(address target)
        external
        view
        returns (
            address,
            uint8,
            string memory,
            string memory,
            uint64,
            address
        )
    {
        Attestation storage a = attestations[target];
        return (a.target, a.riskScore, a.verdict, a.agentIdHandle, a.timestamp, a.attestedBy);
    }

    /// @notice All contract addresses ever attested, in attestation order.
    function getAttestedContracts() external view returns (address[] memory) {
        return attestedContracts;
    }

    /// @notice Number of distinct contract addresses ever attested.
    function attestationCount() external view returns (uint256) {
        return attestedContracts.length;
    }

    /// @notice Transfer ownership (e.g. to a multisig). Only the owner can call.
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MintGuardRegistry: new owner is zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
