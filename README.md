# Employee Data Subgraph

This subgraph indexes employee data and preferences stored on IPFS through a smart contract. It tracks token minting and URI modifications, storing the associated IPFS content in a structured way.

## Overview

The subgraph tracks two main events:
- `TokenMinted`: When new employee data is minted
- `TokenURIModified`: When existing employee data is updated

For each event, it:
1. Stores the token ID and IPFS URI
2. Fetches and processes the IPFS content
3. Extracts employee details and preferences

## Schema

### EmployeeData
- `id`: ID derived from token ID
- `tokenId`: Original token ID
- `tx`: Transaction hash
- `uri`: IPFS URI containing employee data

### PostContent
- `id`: Unique ID (combination of IPFS hash, entity ID, and timestamp)
- `employeeId`: Employee identifier extracted from content
- `content`: Full JSON content from IPFS
- `timestamp`: Block timestamp when content was processed

## Features

- Handles both plain and encoded employee data
- Creates unique IDs for each content version
- Maintains history of data modifications
- Validates JSON structure and content
- Logs detailed processing information

## Development

### Prerequisites
- Graph CLI
- Node.js
- IPFS node (for testing)


## Error Handling

The subgraph includes comprehensive error handling for:
- Invalid JSON content
- Missing employee details
- Encoded data detection
- Empty or malformed content

## Logging

Detailed logs are maintained for:
- Content processing steps
- Error conditions
- Data encoding detection
- Success confirmations