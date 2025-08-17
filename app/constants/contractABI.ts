/**
 * MetaWorkspaceNFT Contract ABI
 * Deployed on Base Sepolia: 0x7EA575edDe56F6A7d5D711937B23afd16F061601
 */

export const METAWORKSPACE_NFT_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "address", name: "owner", type: "address" }
    ],
    name: "ERC721IncorrectOwner",
    type: "error"
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "ERC721InsufficientApproval",
    type: "error"
  },
  {
    inputs: [
      { internalType: "address", name: "approver", type: "address" }
    ],
    name: "ERC721InvalidApprover",
    type: "error"
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" }
    ],
    name: "ERC721InvalidOperator",
    type: "error"
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" }
    ],
    name: "ERC721InvalidOwner",
    type: "error"
  },
  {
    inputs: [
      { internalType: "address", name: "receiver", type: "address" }
    ],
    name: "ERC721InvalidReceiver",
    type: "error"
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" }
    ],
    name: "ERC721InvalidSender",
    type: "error"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "ERC721NonexistentToken",
    type: "error"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "string", name: "roomId", type: "string" },
      { indexed: false, internalType: "string", name: "username", type: "string" }
    ],
    name: "AccessGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "address", name: "approved", type: "address" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "Approval",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: true, internalType: "address", name: "operator", type: "address" },
      { indexed: false, internalType: "bool", name: "approved", type: "bool" }
    ],
    name: "ApprovalForAll",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: true, internalType: "string", name: "roomId", type: "string" },
      { indexed: false, internalType: "uint8", name: "contentType", type: "uint8" },
      { indexed: false, internalType: "string", name: "ipfsHash", type: "string" }
    ],
    name: "NFTMinted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "string", name: "roomId", type: "string" },
      { indexed: false, internalType: "string", name: "activityType", type: "string" },
      { indexed: false, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "RoomActivity",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "string", name: "roomId", type: "string" },
      { indexed: false, internalType: "string", name: "ipfsHash", type: "string" },
      { indexed: false, internalType: "uint256", name: "duration", type: "uint256" }
    ],
    name: "VideoNFTCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "string", name: "roomId", type: "string" },
      { indexed: false, internalType: "string", name: "ipfsHash", type: "string" },
      { indexed: false, internalType: "uint256", name: "duration", type: "uint256" }
    ],
    name: "VoiceNFTCreated",
    type: "event"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "string", name: "username", type: "string" }
    ],
    name: "addToWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" }
    ],
    name: "balanceOf",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string[]", name: "farcasterWhitelist", type: "string[]" },
      { internalType: "bool", name: "isPublic", type: "bool" }
    ],
    name: "createRoom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "getApproved",
    outputs: [
      { internalType: "address", name: "", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "getContent",
    outputs: [
      {
        components: [
          { internalType: "enum MetaWorkspaceNFT.ContentType", name: "contentType", type: "uint8" },
          { internalType: "string", name: "ipfsHash", type: "string" },
          { internalType: "uint256", name: "duration", type: "uint256" },
          { internalType: "string", name: "roomId", type: "string" },
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "bool", name: "isPrivate", type: "bool" },
          { internalType: "string[]", name: "whitelistedUsers", type: "string[]" },
          { internalType: "string", name: "transcription", type: "string" },
          { internalType: "string[]", name: "participants", type: "string[]" },
          { internalType: "string", name: "summary", type: "string" }
        ],
        internalType: "struct MetaWorkspaceNFT.NFTContent",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "getContentType",
    outputs: [
      { internalType: "enum MetaWorkspaceNFT.ContentType", name: "", type: "uint8" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" }
    ],
    name: "getRoomContent",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "enum MetaWorkspaceNFT.ContentType", name: "contentType", type: "uint8" }
    ],
    name: "getRoomContentByType",
    outputs: [
      { internalType: "uint256[]", name: "result", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" }
    ],
    name: "getRoomStats",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "totalContent", type: "uint256" },
          { internalType: "uint256", name: "voiceCount", type: "uint256" },
          { internalType: "uint256", name: "videoCount", type: "uint256" },
          { internalType: "uint256", name: "documentCount", type: "uint256" }
        ],
        internalType: "struct MetaWorkspaceNFT.RoomStats",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "enum MetaWorkspaceNFT.ContentType", name: "contentType", type: "uint8" }
    ],
    name: "getTotalSupplyByType",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "getVideoNFT",
    outputs: [
      { internalType: "string", name: "ipfsHash", type: "string" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "string[]", name: "participants", type: "string[]" },
      { internalType: "string", name: "summary", type: "string" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "bool", name: "isPrivate", type: "bool" },
      { internalType: "string[]", name: "whitelistedUsers", type: "string[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" }
    ],
    name: "getVideoNFTsByRoom",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "getVoiceNFT",
    outputs: [
      { internalType: "string", name: "ipfsHash", type: "string" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "address", name: "creator", type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "bool", name: "isPrivate", type: "bool" },
      { internalType: "string[]", name: "whitelistedUsers", type: "string[]" },
      { internalType: "string", name: "transcription", type: "string" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" }
    ],
    name: "getVoiceNFTsByRoom",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "string", name: "username", type: "string" }
    ],
    name: "hasAccess",
    outputs: [
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "operator", type: "address" }
    ],
    name: "isApprovedForAll",
    outputs: [
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "ipfsHash", type: "string" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "string[]", name: "whitelistedUsers", type: "string[]" }
    ],
    name: "mintContent",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "ipfsHash", type: "string" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "string[]", name: "participants", type: "string[]" },
      { internalType: "string", name: "summary", type: "string" },
      { internalType: "string[]", name: "whitelistedUsers", type: "string[]" }
    ],
    name: "mintVideoNFT",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "ipfsHash", type: "string" },
      { internalType: "uint256", name: "duration", type: "uint256" },
      { internalType: "string", name: "roomId", type: "string" },
      { internalType: "string[]", name: "whitelistedUsers", type: "string[]" },
      { internalType: "string", name: "transcription", type: "string" }
    ],
    name: "mintVoiceNFT",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      { internalType: "string", name: "", type: "string" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      { internalType: "address", name: "", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "ownerOf",
    outputs: [
      { internalType: "address", name: "", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "string", name: "roomId", type: "string" }
    ],
    name: "roomExists",
    outputs: [
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" }
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" }
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes4", name: "interfaceId", type: "bytes4" }
    ],
    name: "supportsInterface",
    outputs: [
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      { internalType: "string", name: "", type: "string" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "index", type: "uint256" }
    ],
    name: "tokenByIndex",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "index", type: "uint256" }
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "tokenURI",
    outputs: [
      { internalType: "string", name: "", type: "string" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" }
    ],
    name: "tokensOfOwner",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "newOwner", type: "address" }
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const METAWORKSPACE_NFT_ADDRESS = "0x7EA575edDe56F6A7d5D711937B23afd16F061601" as const;
