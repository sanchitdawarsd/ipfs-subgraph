//////////// HELPERS /////////////////////////

import {ByteArray} from '@graphprotocol/graph-ts'

// Helper adding 0x12 and 0x20 to make the proper ipfs hash
// the returned bytes32 is so [0,31]
export const POST_ID_KEY = 'postID';
export const POST_ID_KEY_UPDATED = 'postID_UPDATED';

export function addQm(a: ByteArray): ByteArray {
  let out = new Uint8Array(34)
  out[0] = 0x12
  out[1] = 0x20
  for (let i = 0; i < 32; i++) {
    out[i + 2] = a[i]
  }
  return out as ByteArray
}